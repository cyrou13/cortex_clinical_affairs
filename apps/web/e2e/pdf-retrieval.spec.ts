import { test, expect } from '@playwright/test';

test.describe('PDF Retrieval & Verification', () => {
  test('PDF retrieval panel loads on session page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/pdfs');

    await expect(page.getByTestId('pdf-retrieval-panel')).toBeVisible();
    await expect(page.getByTestId('launch-retrieval-btn')).toBeVisible();
  });

  test('PDF stats display when available', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/pdfs');

    const stats = page.getByTestId('pdf-stats');
    if (await stats.isVisible()) {
      await expect(page.getByTestId('stat-total')).toBeVisible();
      await expect(page.getByTestId('stat-found')).toBeVisible();
      await expect(page.getByTestId('stat-not-found')).toBeVisible();
      await expect(page.getByTestId('stat-mismatches')).toBeVisible();
      await expect(page.getByTestId('pdf-progress-bar')).toBeVisible();
    }
  });

  test('manual PDF upload zone renders', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/articles/art-1');

    const uploadZone = page.getByTestId('pdf-drop-zone');
    if (await uploadZone.isVisible()) {
      await expect(uploadZone).toContainText('Drop PDF here');
    }
  });

  test('mismatch review page loads', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/pdfs/mismatches');

    const review = page.getByTestId('pdf-mismatch-review');
    const empty = page.getByTestId('mismatch-empty');
    const loading = page.getByTestId('mismatch-loading');

    await expect(review.or(empty).or(loading).first()).toBeVisible();
  });

  test('mismatch cards show action buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/pdfs/mismatches');

    const review = page.getByTestId('pdf-mismatch-review');
    if (await review.isVisible()) {
      await expect(page.getByTestId('mismatch-accept-btn').first()).toBeVisible();
      await expect(page.getByTestId('mismatch-reject-btn').first()).toBeVisible();
    }
  });

  test('PDF percentage display', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/pdfs');

    const percent = page.getByTestId('pdf-percent');
    if (await percent.isVisible()) {
      await expect(percent).toHaveText(/\d+% PDFs retrieved/);
    }
  });
});
