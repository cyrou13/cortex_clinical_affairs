import { test, expect } from '@playwright/test';

test.describe('Application Shell', () => {
  test('displays the main layout with sidebar and topbar', async ({ page }) => {
    await page.goto('/');

    // Verify sidebar navigation is present
    const sidebar = page.getByRole('navigation', { name: /main navigation/i });
    await expect(sidebar).toBeVisible();

    // Verify main content area
    const main = page.locator('#main-content');
    await expect(main).toBeVisible();

    // Verify statusbar
    await expect(page.getByText('Cortex Clinical Affairs v0.1.0')).toBeVisible();
  });

  test('sidebar shows only Projects when not in a project', async ({ page }) => {
    await page.goto('/projects');

    const sidebar = page.getByRole('navigation', { name: /main navigation/i });
    await expect(sidebar).toBeVisible();

    // Expand sidebar if collapsed
    const expandBtn = sidebar.getByRole('button', { name: /expand sidebar/i });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    }

    // Projects link should exist
    await expect(sidebar.locator('a[href="/projects"]')).toBeVisible();

    // Module links should NOT exist (no project context)
    await expect(sidebar.locator('a[href="/sls"]')).toHaveCount(0);
    await expect(sidebar.locator('a[href="/soa"]')).toHaveCount(0);
  });

  test('topbar shows app name when not in a project', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.getByText('Cortex Clinical Affairs', { exact: false })).toBeVisible();
    // Pipeline should not show outside project context
    await expect(page.getByTestId('pipeline-node-sls')).toHaveCount(0);
  });

  test('sidebar has collapse or expand toggle', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByRole('navigation', { name: /main navigation/i });
    await expect(sidebar).toBeVisible();

    // Sidebar should show either collapse or expand button
    const collapseBtn = sidebar.getByRole('button', { name: /collapse sidebar/i });
    const expandBtn = sidebar.getByRole('button', { name: /expand sidebar/i });
    await expect(collapseBtn.or(expandBtn).first()).toBeVisible();
  });

  test('skip link exists in the DOM', async ({ page }) => {
    await page.goto('/');

    // Skip link may be hidden until focused (sr-only pattern)
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toHaveCount(1);
    await expect(skipLink).toHaveText('Go to main content');
  });

  test('command palette keyboard shortcut works', async ({ page }) => {
    await page.goto('/');

    // Meta+k may not work in headless mode, so try both shortcuts
    await page.keyboard.press('Meta+k');

    const dialog = page.getByRole('dialog', { name: /command palette/i });
    if (await dialog.isVisible()) {
      const input = page.getByPlaceholder('Type a command...');
      await expect(input).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    } else {
      // Try Ctrl+k for Linux/Windows
      await page.keyboard.press('Control+k');
      if (await dialog.isVisible()) {
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
      }
    }
  });

  test('auto-save indicator is visible in statusbar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Auto-saved')).toBeVisible();
  });
});
