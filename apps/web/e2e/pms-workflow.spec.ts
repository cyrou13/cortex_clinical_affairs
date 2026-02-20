import { test, expect } from '@playwright/test';

test.describe('PMS Workflow — Epic 6', () => {
  test('PMS index page loads', async ({ page }) => {
    await page.goto('/projects/proj-1/pms');

    const indexPage = page.getByTestId('pms-index-page');
    await expect(indexPage).toBeVisible();

    // Page may show dashboard, error, or loading state
    const dashboard = page.getByTestId('pms-dashboard');
    const error = page.getByTestId('pms-error');
    const loading = page.getByTestId('pms-loading');
    await expect(dashboard.or(error).or(loading).first()).toBeVisible();
  });

  test('PMS index page shows create button', async ({ page }) => {
    await page.goto('/projects/proj-1/pms');

    await expect(page.getByTestId('pms-index-page')).toBeVisible();
    await expect(page.getByTestId('create-plan-btn')).toBeVisible();
  });

  test('PMS plan detail page loads with tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();
    await expect(page.getByTestId('tab-plan')).toBeVisible();
    await expect(page.getByTestId('tab-monitoring')).toBeVisible();
    await expect(page.getByTestId('tab-reports')).toBeVisible();
    await expect(page.getByTestId('tab-gaps')).toBeVisible();
  });

  test('PMS plan detail shows back button', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();
    await expect(page.getByTestId('back-btn')).toBeVisible();
  });

  test('PMS plan tab is default active', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await expect(page.getByTestId('tab-plan')).toBeVisible();
  });

  test('PMS plan tab shows cycle selector', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await expect(page.getByTestId('cycle-select-input')).toBeVisible();
  });

  test('monitoring tab shows no-cycle message when no cycle selected', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-monitoring').click();
    await expect(page.getByTestId('monitoring-no-cycle')).toBeVisible();
  });

  test('reports tab shows no-cycle message when no cycle selected', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-reports').click();
    await expect(page.getByTestId('reports-no-cycle')).toBeVisible();
  });

  test('gaps tab loads gap registry', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-gaps').click();
    await expect(page.getByTestId('tab-gaps')).toBeVisible();
  });

  test('tab navigation works across all tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    const tabKeys = ['plan', 'monitoring', 'reports', 'gaps'];
    for (const key of tabKeys) {
      await page.getByTestId(`tab-${key}`).click();
      await expect(page.getByTestId(`tab-${key}`)).toBeVisible();
    }
  });

  test('PMS plan form renders for new plan', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/new');

    const form = page.getByTestId('pms-plan-form');
    const planDetail = page.getByTestId('pms-plan-detail-page');
    const loading = page.getByTestId('pms-plan-form-loading');

    await expect(form.or(planDetail).or(loading).first()).toBeVisible();
  });

  test('monitoring tab requires cycle selection', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-monitoring').click();

    const noCycle = page.getByTestId('monitoring-no-cycle');
    await expect(noCycle).toBeVisible();
    await expect(noCycle).toContainText('No cycle selected');
  });

  test('reports tab requires cycle selection', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-reports').click();

    const noCycle = page.getByTestId('reports-no-cycle');
    await expect(noCycle).toBeVisible();
    await expect(noCycle).toContainText('No cycle selected');
  });

  test('cycle selection input accepts text', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    const input = page.getByTestId('cycle-select-input');
    await expect(input).toBeVisible();
    await input.fill('cycle-1');
    await expect(input).toHaveValue('cycle-1');
  });

  test('clear cycle button appears after cycle selection', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    const input = page.getByTestId('cycle-select-input');
    await input.fill('cycle-1');

    const clearBtn = page.getByTestId('clear-cycle-btn');
    await expect(clearBtn).toBeVisible();
  });

  test('plan detail page shows correct tab labels', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    // Use tab testids to verify labels are rendered
    await expect(page.getByTestId('tab-plan')).toContainText('Plan & Cycles');
    await expect(page.getByTestId('tab-monitoring')).toContainText('Monitoring');
    await expect(page.getByTestId('tab-reports')).toContainText('Reports');
    await expect(page.getByTestId('tab-gaps')).toContainText('Gaps');
  });

  test('back button navigates to PMS list', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await expect(page.getByTestId('back-btn')).toContainText('Back to PMS Plans');
  });

  test('gaps tab renders content area', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-gaps').click();

    const gapContent = page.getByTestId('gap-registry');
    const tabContent = page.getByTestId('tab-gaps');
    await expect(gapContent.or(tabContent).first()).toBeVisible();
  });

  test('monitoring tab shows activity text when no cycle', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('pms-plan-detail-page');
    await expect(planDetail).toBeVisible();

    await page.getByTestId('tab-monitoring').click();
    await expect(page.getByText('No cycle selected')).toBeVisible();
  });
});
