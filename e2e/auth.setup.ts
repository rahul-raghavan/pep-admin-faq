import { test as setup } from '@playwright/test';

const DEV_LOGIN_URL = 'http://localhost:3007/api/auth/dev-login';

async function loginAndSaveState(
  request: Parameters<Parameters<typeof setup>[1]>[0]['request'],
  user: { email: string; role: string },
  storageStatePath: string
) {
  const loginResponse = await request.post(DEV_LOGIN_URL, { data: user });

  if (!loginResponse.ok()) {
    const body = await loginResponse.text();
    throw new Error(`Dev login failed for ${user.email}: ${loginResponse.status()} ${body}`);
  }

  // Playwright's request API and browser context don't share cookies.
  // Grab cookies from the request context and inject them into a browser context.
  const requestState = await request.storageState();

  const browser = await (await import('playwright')).chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(
    requestState.cookies.map((c) => ({
      ...c,
      sameSite: c.sameSite as 'Lax' | 'Strict' | 'None',
    }))
  );
  await context.storageState({ path: storageStatePath });
  await context.close();
  await browser.close();
}

setup('authenticate as admin', async ({ request }) => {
  await loginAndSaveState(
    request,
    { email: 'test-admin@pepschoolv2.com', role: 'super_admin' },
    'e2e/auth/storageState.admin.json'
  );
});

setup('authenticate as staff', async ({ request }) => {
  await loginAndSaveState(
    request,
    { email: 'test-staff@pepschoolv2.com', role: 'user' },
    'e2e/auth/storageState.staff.json'
  );
});
