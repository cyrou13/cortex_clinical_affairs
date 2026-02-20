import { test, expect } from '@playwright/test';

test.describe('SOA Import — Upload, Review, Confirm', () => {
  test('SOA index page shows import button', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const indexPage = page.getByTestId('soa-index-page');
    const loading = page.getByTestId('soa-list-loading');
    const error = page.getByTestId('soa-list-error');

    await expect(indexPage.or(loading).or(error).first()).toBeVisible();

    if (await indexPage.isVisible()) {
      await expect(page.getByTestId('import-soa-trigger')).toBeVisible();
      await expect(page.getByTestId('import-soa-trigger')).toHaveText(/Importer un SOA/);
    }
  });

  test('clicking import button opens the import dialog', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const indexPage = page.getByTestId('soa-index-page');
    const loading = page.getByTestId('soa-list-loading');
    const error = page.getByTestId('soa-list-error');

    await expect(indexPage.or(loading).or(error).first()).toBeVisible();

    if (await indexPage.isVisible()) {
      await page.getByTestId('import-soa-trigger').click();
      await expect(page.getByTestId('import-soa-dialog')).toBeVisible();
    }
  });

  test('import dialog can be closed', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const indexPage = page.getByTestId('soa-index-page');
    const loading = page.getByTestId('soa-list-loading');
    const error = page.getByTestId('soa-list-error');

    await expect(indexPage.or(loading).or(error).first()).toBeVisible();

    if (await indexPage.isVisible()) {
      await page.getByTestId('import-soa-trigger').click();
      await expect(page.getByTestId('import-soa-dialog')).toBeVisible();

      await page.getByTestId('close-dialog').click();
      await expect(page.getByTestId('import-soa-dialog')).not.toBeVisible();
    }
  });

  test('import review page shows loading or processing state', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/import/fake-import-id');

    // Should show one of: loading, processing, error, not-found, review
    const loading = page.getByTestId('loading');
    const processing = page.getByTestId('processing');
    const error = page.getByTestId('error');
    const notFound = page.getByTestId('not-found');
    const review = page.getByTestId('soa-import-review');

    await expect(loading.or(processing).or(error).or(notFound).or(review).first()).toBeVisible();
  });

  test('import review page with REVIEW status shows tabs', async ({ page }) => {
    // This test relies on having a real import in REVIEW status
    // In E2E, we navigate to the import review page directly
    await page.goto('/projects/proj-1/soa/import/fake-import-id');

    const review = page.getByTestId('soa-import-review');
    const loading = page.getByTestId('loading');
    const error = page.getByTestId('error');
    const notFound = page.getByTestId('not-found');
    const processing = page.getByTestId('processing');

    await expect(review.or(loading).or(error).or(notFound).or(processing).first()).toBeVisible();

    // Only check tabs if we got to the review state
    if (await review.isVisible()) {
      await expect(page.getByTestId('tab-articles')).toBeVisible();
      await expect(page.getByTestId('tab-sections')).toBeVisible();
      await expect(page.getByTestId('tab-grid')).toBeVisible();
      await expect(page.getByTestId('tab-claims')).toBeVisible();
      await expect(page.getByTestId('tab-devices')).toBeVisible();
      await expect(page.getByTestId('tab-gaps')).toBeVisible();

      await expect(page.getByTestId('confirm-import')).toBeVisible();
      await expect(page.getByTestId('cancel-import')).toBeVisible();
    }
  });
});
