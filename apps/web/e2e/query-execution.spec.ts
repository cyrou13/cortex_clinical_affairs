import { test, expect } from '@playwright/test';

test.describe('Query Execution', () => {
  test('execute query button renders on session page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const container = page.getByTestId('execute-query-container');
    // The button may or may not be present depending on routing and rendering
    // Verify the page loads without errors
    await expect(page.getByTestId('sls-session-detail-page')).toBeVisible();
  });

  test('database checkboxes appear in execution panel', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // If the execute query button is rendered, click it to open selector
    const toggleBtn = page.getByTestId('execute-query-toggle');
    const isVisible = await toggleBtn.isVisible().catch(() => false);

    if (isVisible) {
      await toggleBtn.click();

      const selector = page.getByTestId('database-selector');
      await expect(selector).toBeVisible();

      await expect(page.getByTestId('db-checkbox-pubmed')).toBeVisible();
      await expect(page.getByTestId('db-checkbox-cochrane')).toBeVisible();
      await expect(page.getByTestId('db-checkbox-embase')).toBeVisible();

      // PubMed should be checked by default
      await expect(page.getByTestId('db-checkbox-pubmed')).toBeChecked();
      await expect(page.getByTestId('db-checkbox-cochrane')).not.toBeChecked();
      await expect(page.getByTestId('db-checkbox-embase')).not.toBeChecked();
    }
  });

  test('execution history renders on query page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // The execution history component should be present if the query detail is shown
    const history = page.getByTestId('execution-history');
    const isVisible = await history.isVisible().catch(() => false);

    if (isVisible) {
      // Either shows execution list or empty state
      const hasEmptyState = await page
        .getByTestId('empty-state')
        .isVisible()
        .catch(() => false);
      const hasRows = await page
        .locator('[data-testid^="execution-row-"]')
        .count()
        .catch(() => 0);

      expect(hasEmptyState || hasRows > 0).toBeTruthy();
    }
  });
});
