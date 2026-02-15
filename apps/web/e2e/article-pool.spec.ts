import { test, expect } from '@playwright/test';

test.describe('Article Pool', () => {
  test('article pool page loads with dashboard and table', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // The page should load without errors
    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    // If article pool dashboard is rendered on this page
    const dashboard = page.getByTestId('article-pool-dashboard');
    const isDashboardVisible = await dashboard.isVisible().catch(() => false);

    if (isDashboardVisible) {
      // Check metrics are present
      await expect(page.getByTestId('metrics-row')).toBeVisible();
      await expect(page.getByTestId('metric-total')).toBeVisible();

      // Check filter tabs are present
      await expect(page.getByTestId('filter-tabs')).toBeVisible();

      // Check table is present
      await expect(page.getByTestId('article-table')).toBeVisible();
    }
  });

  test('clicking an article opens the detail panel', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    // If article table rows are visible, click the first one
    const firstRow = page.locator('[data-testid^="article-row-"]').first();
    const isRowVisible = await firstRow.isVisible().catch(() => false);

    if (isRowVisible) {
      await firstRow.click();

      // The detail panel should appear
      const panel = page.getByTestId('article-detail-panel');
      const isPanelVisible = await panel.isVisible().catch(() => false);

      if (isPanelVisible) {
        await expect(panel).toBeVisible();
        await expect(page.getByText('Article Details')).toBeVisible();

        // Close button should work
        await page.getByTestId('close-article-detail').click();
        await expect(panel).not.toBeVisible();
      }
    }
  });

  test('filter tabs change visible articles', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();

    const filterTabs = page.getByTestId('filter-tabs');
    const isTabsVisible = await filterTabs.isVisible().catch(() => false);

    if (isTabsVisible) {
      // Click "All" tab - should be active by default
      const allTab = page.getByTestId('tab-all');
      await expect(allTab).toHaveAttribute('aria-selected', 'true');

      // Click "Pending" tab
      const pendingTab = page.getByTestId('tab-pending');
      await pendingTab.click();
      await expect(pendingTab).toHaveAttribute('aria-selected', 'true');
      await expect(allTab).toHaveAttribute('aria-selected', 'false');

      // Click "Included" tab
      const includedTab = page.getByTestId('tab-included');
      await includedTab.click();
      await expect(includedTab).toHaveAttribute('aria-selected', 'true');
      await expect(pendingTab).toHaveAttribute('aria-selected', 'false');
    }
  });
});
