import { test, expect } from '@playwright/test';

test.describe('Knowledge Base (staff)', () => {
  test('staff can see the KB page without redirect to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('staff cannot access review queue', async ({ page }) => {
    await page.goto('/review');
    await expect(page).not.toHaveURL(/\/login/);
    // Should see the "no access" message (client-rendered, needs time)
    await expect(page.getByText("don't have access")).toBeVisible({ timeout: 15000 });
  });

  test('staff cannot update FAQ categories via API', async ({ page }) => {
    // Use page.request (tied to browser context with auth cookies) instead of standalone request
    const res = await page.request.put('/api/faq/00000000-0000-0000-0000-000000000000/categories', {
      data: { categoryIds: [] },
    });
    expect(res.status()).toBe(403);
  });

  test('staff cannot update FAQ tags via API', async ({ page }) => {
    const res = await page.request.put('/api/faq/00000000-0000-0000-0000-000000000000/tags', {
      data: { tagIds: [] },
    });
    expect(res.status()).toBe(403);
  });
});
