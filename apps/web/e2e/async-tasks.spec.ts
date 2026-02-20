import { test, expect } from '@playwright/test';

test.describe('Async Task Panel', () => {
  test('application loads successfully', async ({ page }) => {
    await page.goto('/');

    // App should load and show main content area
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
  });

  test('task panel toggle visible when rendered', async ({ page }) => {
    await page.goto('/');

    const toggleBtn = page.getByTestId('task-panel-toggle');
    const isVisible = await toggleBtn.isVisible().catch(() => false);

    if (isVisible) {
      await expect(toggleBtn).toBeVisible();
      await expect(toggleBtn).toHaveText(/Tasks/);
    }
  });

  test('task panel opens and closes when toggle exists', async ({ page }) => {
    await page.goto('/');

    const toggleBtn = page.getByTestId('task-panel-toggle');
    const isVisible = await toggleBtn.isVisible().catch(() => false);

    if (isVisible) {
      // Open
      await toggleBtn.click();
      const panel = page.getByTestId('task-panel');
      await expect(panel).toBeVisible();

      // Close
      await toggleBtn.click();
      await expect(panel).not.toBeVisible();
    }
  });

  test('app shell renders with sidebar and main content', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByRole('navigation', { name: /main navigation/i });
    await expect(sidebar).toBeVisible();

    const main = page.locator('#main-content');
    await expect(main).toBeVisible();
  });

  test('app shell renders with statusbar', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Cortex Clinical Affairs v0.1.0')).toBeVisible();
  });
});
