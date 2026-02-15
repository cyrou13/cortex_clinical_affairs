import { test, expect } from '@playwright/test';

test.describe('Admin Audit Log', () => {
  test('displays audit log page with heading', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page.getByText('Audit Log')).toBeVisible();
  });

  test('shows filter inputs', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page.getByLabel(/action/i)).toBeVisible();
    await expect(page.getByLabel(/user/i)).toBeVisible();
  });
});
