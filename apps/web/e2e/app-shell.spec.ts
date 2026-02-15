import { test, expect } from '@playwright/test';

test.describe('Application Shell', () => {
  test('displays the main layout with sidebar and topbar', async ({ page }) => {
    await page.goto('/');

    // Verify sidebar navigation is present
    const sidebar = page.getByRole('navigation', { name: /main navigation/i });
    await expect(sidebar).toBeVisible();

    // Verify pipeline navigation is present
    const pipeline = page.getByRole('navigation', { name: /pipeline progression/i });
    await expect(pipeline).toBeVisible();

    // Verify main content area
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();

    // Verify statusbar
    await expect(page.getByText('Cortex Clinical Affairs v0.1.0')).toBeVisible();
  });

  test('sidebar navigation items are visible', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('SLS')).toBeVisible();
    await expect(page.getByText('SOA')).toBeVisible();
    await expect(page.getByText('Validation')).toBeVisible();
    await expect(page.getByText('CER')).toBeVisible();
    await expect(page.getByText('PMS')).toBeVisible();
  });

  test('sidebar collapses and expands', async ({ page }) => {
    await page.goto('/');

    // Find and click the collapse button
    const collapseBtn = page.getByLabel(/collapse sidebar/i);
    await collapseBtn.click();

    // Text labels should be hidden when collapsed
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();

    // Click expand button
    const expandBtn = page.getByLabel(/expand sidebar/i);
    await expandBtn.click();

    // Text labels should be visible again
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('pipeline progress bar shows 5 nodes', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('pipeline-node-sls')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-soa')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-validation')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-cer')).toBeVisible();
    await expect(page.getByTestId('pipeline-node-pms')).toBeVisible();
  });

  test('skip link is first focusable element', async ({ page }) => {
    await page.goto('/');

    // Press tab to focus first element
    await page.keyboard.press('Tab');

    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveText('Go to main content');
  });

  test('Cmd+K opens command palette', async ({ page }) => {
    await page.goto('/');

    // Open command palette
    await page.keyboard.press('Meta+k');

    // Command palette should be visible
    const dialog = page.getByRole('dialog', { name: /command palette/i });
    await expect(dialog).toBeVisible();

    // Should have search input
    const input = page.getByPlaceholder('Type a command...');
    await expect(input).toBeFocused();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('auto-save indicator is visible in statusbar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Auto-saved')).toBeVisible();
  });
});
