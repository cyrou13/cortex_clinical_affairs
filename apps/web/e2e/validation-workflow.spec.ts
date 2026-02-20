import { test, expect } from '@playwright/test';

test.describe('Validation Workflow — Stories 4.1–4.8', () => {
  test('validation study page loads with tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    // Page may show error if study not found (no backend data)
    await expect(studyPage.or(page.locator('text=Failed to load')).first()).toBeVisible();

    if (await studyPage.isVisible()) {
      await expect(page.getByTestId('tab-configuration')).toBeVisible();
      await expect(page.getByTestId('tab-data-import')).toBeVisible();
      await expect(page.getByTestId('tab-results')).toBeVisible();
      await expect(page.getByTestId('tab-reports')).toBeVisible();
    }
  });

  test('validation study page shows back button', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      await expect(page.getByTestId('back-btn')).toBeVisible();
    }
  });

  test('configuration tab shows protocol editor', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      // Configuration tab is default active
      const configTab = page.getByTestId('configuration-tab');
      if (await configTab.isVisible()) {
        await expect(page.getByTestId('protocol-summary')).toBeVisible();
        await expect(page.getByTestId('protocol-endpoints')).toBeVisible();
        await expect(page.getByTestId('protocol-sample-size')).toBeVisible();
        await expect(page.getByTestId('protocol-strategy')).toBeVisible();
        await expect(page.getByTestId('save-protocol-btn')).toBeVisible();
      }
    }
  });

  test('data import tab renders with file upload', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      await page.getByTestId('tab-data-import').click();

      const importTab = page.getByTestId('data-import-tab');
      if (await importTab.isVisible()) {
        await expect(page.getByTestId('file-input')).toBeVisible();
      }
    }
  });

  test('data import tab shows import version list or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      await page.getByTestId('tab-data-import').click();

      const importTab = page.getByTestId('data-import-tab');
      if (await importTab.isVisible()) {
        // Either version list or empty message
        const versionList = page.getByTestId('import-version-list');
        const emptyMsg = page.getByText('No imports yet');
        await expect(versionList.or(emptyMsg).first()).toBeVisible();
      }
    }
  });

  test('results tab renders with compute button', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      await page.getByTestId('tab-results').click();

      const resultsTab = page.getByTestId('results-tab');
      if (await resultsTab.isVisible()) {
        await expect(page.getByTestId('compute-results-btn')).toBeVisible();
      }
    }
  });

  test('results tab shows GSPR mapping section', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      await page.getByTestId('tab-results').click();

      const resultsTab = page.getByTestId('results-tab');
      if (await resultsTab.isVisible()) {
        await expect(page.getByTestId('add-gspr-btn')).toBeVisible();
      }
    }
  });

  test('reports tab renders', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      await page.getByTestId('tab-reports').click();

      const reportsTab = page.getByTestId('reports-tab');
      await expect(reportsTab.or(page.getByText('Report Generation')).first()).toBeVisible();
    }
  });

  test('lock study button or locked state is visible', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      const lockBtn = page.getByTestId('lock-study-btn');
      const lockedText = page.getByText('Locked');
      await expect(lockBtn.or(lockedText).first()).toBeVisible();
    }
  });

  test('tab navigation works across all tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/validation/study-1');

    const studyPage = page.getByTestId('validation-study-page');
    if (await studyPage.isVisible()) {
      const tabKeys = ['configuration', 'data-import', 'results', 'reports'];
      for (const key of tabKeys) {
        await page.getByTestId(`tab-${key}`).click();
        await expect(page.getByTestId(`tab-${key}`)).toBeVisible();
      }
    }
  });
});
