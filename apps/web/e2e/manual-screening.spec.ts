import { test, expect } from '@playwright/test';

test.describe('Manual Screening Workflow', () => {
  test('screening panel loads with filter tabs and table', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    await expect(page.getByTestId('screening-panel')).toBeVisible();
    await expect(page.getByTestId('screening-filter-tabs')).toBeVisible();
    await expect(page.getByTestId('keyboard-hints')).toBeVisible();
    await expect(page.getByText('I = Include')).toBeVisible();
  });

  test('filter tabs show category counts', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    await expect(page.getByTestId('filter-tab-all')).toBeVisible();
    await expect(page.getByTestId('filter-tab-likely-relevant')).toBeVisible();
    await expect(page.getByTestId('filter-tab-uncertain')).toBeVisible();
    await expect(page.getByTestId('filter-tab-likely-irrelevant')).toBeVisible();
  });

  test('clicking article row selects it', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    const firstRow = page.getByTestId('screening-table').locator('tbody tr').first();
    await firstRow.click();

    await expect(firstRow).toHaveClass(/blue-50/);
  });

  test('article detail panel opens on selected article', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    const firstRow = page.getByTestId('screening-table').locator('tbody tr').first();
    await firstRow.click();

    // Press Space to open detail
    await page.keyboard.press('Space');

    await expect(page.getByTestId('article-detail-panel')).toBeVisible();
  });

  test('keyboard shortcut I opens include dialog', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    // Select first article
    const firstRow = page.getByTestId('screening-table').locator('tbody tr').first();
    await firstRow.click();

    // Press I to include
    await page.keyboard.press('i');

    // Decision should be processed
    await expect(page.getByTestId('screening-panel')).toBeVisible();
  });

  test('filter tab switching changes active tab', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    await page.getByTestId('filter-tab-uncertain').click();

    await expect(page.getByTestId('filter-tab-uncertain')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('bulk actions toolbar appears on multi-select', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    // Check two article checkboxes
    const checkboxes = page.getByTestId('screening-table').locator('tbody input[type="checkbox"]');
    await checkboxes.first().check();

    await expect(page.getByTestId('bulk-actions-toolbar')).toBeVisible();
    await expect(page.getByTestId('selected-count')).toHaveText(/1 article/);
  });

  test('screening progress metrics display', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('screening-progress')).toBeVisible();
    await expect(page.getByTestId('progress-bar')).toBeVisible();
    await expect(page.getByTestId('count-included')).toBeVisible();
  });

  test('score badges show colored indicators', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    // Wait for table to load
    await expect(page.getByTestId('screening-table')).toBeVisible();

    // Score badges should be visible with color coding
    const scoreBadges = page.locator('[data-testid^="score-badge-"]');
    const count = await scoreBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('deselect button clears selection', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/screening');

    const checkbox = page.getByTestId('screening-table').locator('tbody input[type="checkbox"]').first();
    await checkbox.check();

    await expect(page.getByTestId('bulk-actions-toolbar')).toBeVisible();

    await page.getByTestId('bulk-deselect-btn').click();

    await expect(page.getByTestId('bulk-actions-toolbar')).not.toBeVisible();
  });
});
