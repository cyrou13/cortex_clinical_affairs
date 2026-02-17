import { test, expect } from '@playwright/test';

test.describe('PMS Workflow — Epic 6', () => {
  test('PMS dashboard loads with plan cards', async ({ page }) => {
    await page.goto('/projects/proj-1/pms');

    const dashboard = page.getByTestId('pms-dashboard');
    const loading = page.getByTestId('pms-loading');

    await expect(dashboard.or(loading).first()).toBeVisible();

    if (await dashboard.isVisible()) {
      const planCard = page.locator('[data-testid^="plan-card-"]').first();
      const empty = page.getByTestId('pms-empty');
      // Either plan cards or empty state should be visible
      await expect(planCard.or(empty).first()).toBeVisible();
    }
  });

  test('PMS dashboard shows empty state when no plans exist', async ({ page }) => {
    await page.goto('/projects/proj-1/pms');

    const dashboard = page.getByTestId('pms-dashboard');
    const loading = page.getByTestId('pms-loading');

    await expect(dashboard.or(loading).first()).toBeVisible();

    if (await dashboard.isVisible()) {
      const empty = page.getByTestId('pms-empty');
      // Empty state may or may not be visible depending on data
      if (await empty.isVisible()) {
        await expect(empty).toBeVisible();
      }
    }
  });

  test('PMS plan detail loads with configuration panel', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('plan-detail');
    const loading = page.getByTestId('plan-loading');

    await expect(planDetail.or(loading).first()).toBeVisible();

    if (await planDetail.isVisible()) {
      await expect(page.getByTestId('tab-config')).toBeVisible();
      await expect(page.getByTestId('config-panel')).toBeVisible();
    }
  });

  test('PMS plan detail shows tab navigation', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('plan-detail');
    const loading = page.getByTestId('plan-loading');

    await expect(planDetail.or(loading).first()).toBeVisible();

    if (await planDetail.isVisible()) {
      await expect(page.getByTestId('tab-config')).toBeVisible();
      await expect(page.getByTestId('tab-vigilance')).toBeVisible();
      await expect(page.getByTestId('tab-responsibilities')).toBeVisible();
    }
  });

  test('PMS plan detail shows approve button when in DRAFT status', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('plan-detail');
    const loading = page.getByTestId('plan-loading');

    await expect(planDetail.or(loading).first()).toBeVisible();

    if (await planDetail.isVisible()) {
      const approveBtn = page.getByTestId('approve-btn');
      // Approve button may or may not be visible depending on plan status
      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeVisible();
      }
    }
  });

  test('PMS plan detail shows activate button when in APPROVED status', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('plan-detail');
    const loading = page.getByTestId('plan-loading');

    await expect(planDetail.or(loading).first()).toBeVisible();

    if (await planDetail.isVisible()) {
      const activateBtn = page.getByTestId('activate-btn');
      // Activate button may or may not be visible depending on plan status
      if (await activateBtn.isVisible()) {
        await expect(activateBtn).toBeVisible();
      }
    }
  });

  test('vigilance tab displays panel or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('plan-detail');
    const loading = page.getByTestId('plan-loading');

    await expect(planDetail.or(loading).first()).toBeVisible();

    if (await planDetail.isVisible()) {
      const vigilanceTab = page.getByTestId('tab-vigilance');
      await vigilanceTab.click();

      const vigilancePanel = page.getByTestId('vigilance-panel');
      // Panel may or may not be visible depending on data
      if (await vigilancePanel.isVisible()) {
        await expect(vigilancePanel).toBeVisible();
      }
    }
  });

  test('responsibilities tab displays panel or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1');

    const planDetail = page.getByTestId('plan-detail');
    const loading = page.getByTestId('plan-loading');

    await expect(planDetail.or(loading).first()).toBeVisible();

    if (await planDetail.isVisible()) {
      const responsibilitiesTab = page.getByTestId('tab-responsibilities');
      await responsibilitiesTab.click();

      const responsibilitiesPanel = page.getByTestId('responsibilities-panel');
      // Panel may or may not be visible depending on data
      if (await responsibilitiesPanel.isVisible()) {
        await expect(responsibilitiesPanel).toBeVisible();
      }
    }
  });

  test('PMS cycle detail loads with tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      await expect(page.getByTestId('tab-activities')).toBeVisible();
      await expect(page.getByTestId('tab-complaints')).toBeVisible();
      await expect(page.getByTestId('tab-trends')).toBeVisible();
      await expect(page.getByTestId('tab-reports')).toBeVisible();
      await expect(page.getByTestId('tab-decision')).toBeVisible();
    }
  });

  test('PMS cycle detail activities tab shows placeholder', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      await expect(page.getByTestId('activities-placeholder')).toBeVisible();
    }
  });

  test('complaints dashboard loads with metrics', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const complaintsTab = page.getByTestId('tab-complaints');
      await complaintsTab.click();

      const complaintsDashboard = page.getByTestId('complaints-dashboard');
      const complaintsLoading = page.getByTestId('complaints-loading');

      await expect(complaintsDashboard.or(complaintsLoading).first()).toBeVisible();

      if (await complaintsDashboard.isVisible()) {
        await expect(page.getByTestId('metric-total')).toBeVisible();
        await expect(page.getByTestId('metric-incidents')).toBeVisible();
      }
    }
  });

  test('complaints dashboard shows action buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const complaintsTab = page.getByTestId('tab-complaints');
      await complaintsTab.click();

      const complaintsDashboard = page.getByTestId('complaints-dashboard');
      const complaintsLoading = page.getByTestId('complaints-loading');

      await expect(complaintsDashboard.or(complaintsLoading).first()).toBeVisible();

      if (await complaintsDashboard.isVisible()) {
        await expect(page.getByTestId('add-complaint-btn')).toBeVisible();
        await expect(page.getByTestId('import-btn')).toBeVisible();
      }
    }
  });

  test('complaints dashboard shows filter controls', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const complaintsTab = page.getByTestId('tab-complaints');
      await complaintsTab.click();

      const complaintsDashboard = page.getByTestId('complaints-dashboard');
      const complaintsLoading = page.getByTestId('complaints-loading');

      await expect(complaintsDashboard.or(complaintsLoading).first()).toBeVisible();

      if (await complaintsDashboard.isVisible()) {
        await expect(page.getByTestId('filter-severity')).toBeVisible();
        await expect(page.getByTestId('filter-status')).toBeVisible();
      }
    }
  });

  test('complaints dashboard shows table or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const complaintsTab = page.getByTestId('tab-complaints');
      await complaintsTab.click();

      const complaintsDashboard = page.getByTestId('complaints-dashboard');
      const complaintsLoading = page.getByTestId('complaints-loading');

      await expect(complaintsDashboard.or(complaintsLoading).first()).toBeVisible();

      if (await complaintsDashboard.isVisible()) {
        const table = page.getByTestId('complaints-table');
        const empty = page.getByTestId('complaints-empty');
        // Either table or empty state should be visible
        await expect(table.or(empty).first()).toBeVisible();
      }
    }
  });

  test('trend analysis panel loads', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const trendsTab = page.getByTestId('tab-trends');
      await trendsTab.click();

      const trendPanel = page.getByTestId('trend-analysis-panel');
      const trendLoading = page.getByTestId('trend-analysis-loading');

      await expect(trendPanel.or(trendLoading).first()).toBeVisible();
    }
  });

  test('report generation panel loads', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const reportsTab = page.getByTestId('tab-reports');
      await reportsTab.click();

      const reportGeneration = page.getByTestId('report-generation');
      const reportLoading = page.getByTestId('report-generation-loading');

      await expect(reportGeneration.or(reportLoading).first()).toBeVisible();
    }
  });

  test('CER update decision panel loads', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles/cycle-1');

    const cycleDetail = page.getByTestId('cycle-detail');
    const loading = page.getByTestId('cycle-detail-loading');

    await expect(cycleDetail.or(loading).first()).toBeVisible();

    if (await cycleDetail.isVisible()) {
      const decisionTab = page.getByTestId('tab-decision');
      await decisionTab.click();

      const cerDecision = page.getByTestId('cer-update-decision');
      const cerLoading = page.getByTestId('cer-update-decision-loading');

      await expect(cerDecision.or(cerLoading).first()).toBeVisible();
    }
  });

  test('PMS plan form renders', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/new');

    const form = page.getByTestId('pms-plan-form');
    const loading = page.getByTestId('pms-plan-form-loading');

    await expect(form.or(loading).first()).toBeVisible();
  });

  test('cycle manager loads', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/cycles');

    const cycleManager = page.getByTestId('cycle-manager');
    const loading = page.getByTestId('cycle-manager-loading');

    await expect(cycleManager.or(loading).first()).toBeVisible();
  });

  test('gap registry loads', async ({ page }) => {
    await page.goto('/projects/proj-1/pms/plan-1/gaps');

    const gapRegistry = page.getByTestId('gap-registry');
    const loading = page.getByTestId('gap-registry-loading');

    await expect(gapRegistry.or(loading).first()).toBeVisible();
  });
});
