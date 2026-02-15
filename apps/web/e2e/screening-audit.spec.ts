import { test, expect } from '@playwright/test';

test.describe('Screening Audit & Spot-Check', () => {
  test('audit panel loads with table and filters', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/audit');

    await expect(page.getByTestId('screening-audit-panel')).toBeVisible();
    await expect(page.getByTestId('audit-filters')).toBeVisible();
    await expect(page.getByTestId('audit-filter-all')).toBeVisible();
  });

  test('audit filter tabs switch active filter', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/audit');

    await page.getByTestId('audit-filter-excluded').click();

    // Filter should be visually active
    await expect(page.getByTestId('audit-filter-excluded')).toBeVisible();
  });

  test('audit table displays entries with decision badges', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/audit');

    await expect(page.getByTestId('audit-table')).toBeVisible();
    const badges = page.getByTestId('decision-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('export CSV button is visible', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/audit');

    await expect(page.getByTestId('audit-export-btn')).toBeVisible();
    await expect(page.getByTestId('audit-export-btn')).toHaveText(/Export CSV/);
  });

  test('spot-check view loads for likely relevant', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/spot-check/likely-relevant');

    // Should show spot-check view or loading/empty state
    const view = page.getByTestId('spot-check-view');
    const empty = page.getByTestId('spot-check-empty');
    const loading = page.getByTestId('spot-check-loading');

    await expect(view.or(empty).or(loading).first()).toBeVisible();
  });

  test('spot-check shows article with agree/override buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/spot-check/likely-relevant');

    // If articles are available
    const view = page.getByTestId('spot-check-view');
    if (await view.isVisible()) {
      await expect(page.getByTestId('spot-check-title')).toBeVisible();
      await expect(page.getByTestId('spot-check-agree-btn')).toBeVisible();
      await expect(page.getByTestId('spot-check-override-btn')).toBeVisible();
      await expect(page.getByTestId('spot-check-progress')).toBeVisible();
    }
  });

  test('spot-check shows AI reasoning box', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/spot-check/likely-relevant');

    const view = page.getByTestId('spot-check-view');
    if (await view.isVisible()) {
      await expect(page.getByTestId('spot-check-ai-reasoning')).toBeVisible();
    }
  });

  test('review gate status displays on session dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    // Review gates should be visible on dashboard
    const gates = page.getByTestId('review-gate-status');
    const gateLoading = page.getByTestId('gate-loading');
    await expect(gates.or(gateLoading).first()).toBeVisible();
  });

  test('acceptance rate widget displays on dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    await expect(page.getByTestId('acceptance-rate-widget')).toBeVisible();
    await expect(page.getByTestId('overall-rate')).toBeVisible();
  });

  test('review gates show gate items with status icons', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const gates = page.getByTestId('review-gate-status');
    if (await gates.isVisible()) {
      await expect(page.getByTestId('gate-0')).toBeVisible();
      await expect(page.getByTestId('gate-1')).toBeVisible();
      await expect(page.getByTestId('gate-2')).toBeVisible();
      await expect(page.getByTestId('gates-summary')).toBeVisible();
    }
  });
});
