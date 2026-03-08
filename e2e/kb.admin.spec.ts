import { test, expect } from '@playwright/test';

test.describe('Knowledge Base (admin)', () => {
  test('admin can see the KB page without redirect to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('admin can access submissions page', async ({ page }) => {
    await page.goto('/submissions');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('h1', { hasText: 'Submissions' })).toBeVisible({ timeout: 15000 });
  });

  test('admin can access review queue', async ({ page }) => {
    await page.goto('/review');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('Review Queue')).toBeVisible({ timeout: 15000 });
  });
});
