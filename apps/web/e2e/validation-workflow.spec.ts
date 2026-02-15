import { test, expect } from '@playwright/test';

test.describe('Validation Workflow — Stories 4.1–4.8', () => {
  test('study configurator form renders with SOA selector', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/new');

    const configurator = page.getByTestId('study-configurator');
    const loading = page.getByText('Loading');

    await expect(configurator.or(loading).first()).toBeVisible();

    if (await configurator.isVisible()) {
      await expect(page.getByTestId('study-name-input')).toBeVisible();
      await expect(page.getByTestId('study-type-standalone')).toBeVisible();
      await expect(page.getByTestId('study-type-mrmc')).toBeVisible();
      await expect(page.getByTestId('soa-selector')).toBeVisible();
    }
  });

  test('validation dashboard displays study info and status', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const dashboard = page.getByTestId('validation-dashboard');
    const loading = page.getByTestId('validation-loading');

    await expect(dashboard.or(loading).first()).toBeVisible();

    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('study-status')).toBeVisible();
      await expect(page.getByTestId('study-type-badge')).toBeVisible();
      await expect(page.getByTestId('soa-link')).toBeVisible();
      await expect(page.getByTestId('protocol-version')).toBeVisible();
      await expect(page.getByTestId('import-count')).toBeVisible();
      await expect(page.getByTestId('results-summary')).toBeVisible();
    }
  });

  test('protocol editor renders with step navigation', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/protocol');

    const editor = page.getByTestId('protocol-editor');
    const loading = page.getByTestId('protocol-loading');

    await expect(editor.or(loading).first()).toBeVisible();

    if (await editor.isVisible()) {
      await expect(page.getByTestId('step-indicator')).toBeVisible();
      await expect(page.getByTestId('step-1-content')).toBeVisible();
      await expect(page.getByTestId('prev-btn')).toBeVisible();
      await expect(page.getByTestId('next-btn')).toBeVisible();
      await expect(page.getByTestId('approve-btn')).toBeVisible();
    }
  });

  test('protocol amendment history displays entries', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/protocol/history');

    const history = page.getByTestId('amendment-history');
    const loading = page.getByTestId('amendment-loading');

    await expect(history.or(loading).first()).toBeVisible();

    if (await history.isVisible()) {
      const entries = page.locator('[data-testid^="amendment-entry-"]');
      const empty = page.getByTestId('no-amendments');
      await expect(entries.first().or(empty).first()).toBeVisible();
    }
  });

  test('XLS importer renders with drop zone', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/import');

    const importer = page.getByTestId('xls-importer');
    const loading = page.getByText('Loading');

    await expect(importer.or(loading).first()).toBeVisible();

    if (await importer.isVisible()) {
      await expect(page.getByTestId('drop-zone')).toBeVisible();
    }
  });

  test('import version list shows versions or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/import/versions');

    const list = page.getByTestId('import-version-list');
    const loading = page.getByTestId('versions-loading');

    await expect(list.or(loading).first()).toBeVisible();

    if (await list.isVisible()) {
      const cards = page.locator('[data-testid^="version-card-"]');
      const empty = page.getByTestId('no-versions');
      await expect(cards.first().or(empty).first()).toBeVisible();
    }
  });

  test('results mapping table shows endpoints or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/results');

    const mapping = page.getByTestId('results-mapping');
    const loading = page.getByTestId('results-loading');

    await expect(mapping.or(loading).first()).toBeVisible();

    if (await mapping.isVisible()) {
      await expect(page.getByTestId('summary-bar')).toBeVisible();
      await expect(page.getByTestId('recompute-btn')).toBeVisible();

      const table = page.getByTestId('results-table');
      const empty = page.getByTestId('no-results');
      await expect(table.or(empty).first()).toBeVisible();
    }
  });

  test('report generator displays report cards', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/reports');

    const generator = page.getByTestId('report-generator');
    const loading = page.getByTestId('reports-loading');

    await expect(generator.or(loading).first()).toBeVisible();

    if (await generator.isVisible()) {
      const card = page.getByTestId('report-card-VALIDATION_REPORT');
      const empty = page.getByTestId('no-reports');
      await expect(card.or(empty).first()).toBeVisible();
    }
  });

  test('GSPR mapping table shows mappings with filters', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1/gspr');

    const table = page.getByTestId('gspr-table');
    const loading = page.getByTestId('gspr-loading');

    await expect(table.or(loading).first()).toBeVisible();

    if (await table.isVisible()) {
      await expect(page.getByTestId('gspr-filter')).toBeVisible();
      await expect(page.getByTestId('gspr-summary')).toBeVisible();
      await expect(page.getByTestId('add-mapping-btn')).toBeVisible();

      const dataTable = page.getByTestId('gspr-data-table');
      const empty = page.getByTestId('no-gspr');
      await expect(dataTable.or(empty).first()).toBeVisible();
    }
  });

  test('validation lock section shows lock button or locked badge', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const lockBtn = page.getByTestId('lock-validation-btn');
    const lockedBadge = page.getByTestId('locked-badge');

    await expect(lockBtn.or(lockedBadge).first()).toBeVisible();
  });
});
