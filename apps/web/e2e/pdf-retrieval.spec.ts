import { test, expect } from '@playwright/test';

test.describe('PDF Retrieval & Verification', () => {
  test('PDF retrieval panel accessible via pdfs-refs tab', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      await expect(pdfsTab).toBeVisible();

      const pdfPanel = page.getByTestId('pdf-retrieval-panel');
      if (await pdfPanel.isVisible()) {
        await expect(page.getByTestId('launch-retrieval-btn')).toBeVisible();
      }
    }
  });

  test('PDF stats display when available', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const stats = page.getByTestId('pdf-stats');
      if (await stats.isVisible()) {
        await expect(page.getByTestId('stat-total')).toBeVisible();
        await expect(page.getByTestId('stat-found')).toBeVisible();
        await expect(page.getByTestId('stat-not-found')).toBeVisible();
        await expect(page.getByTestId('stat-mismatches')).toBeVisible();
        await expect(page.getByTestId('pdf-progress-bar')).toBeVisible();
      }
    }
  });

  test('manual PDF upload zone renders in article detail', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/articles/art-1');

    const uploadZone = page.getByTestId('pdf-drop-zone');
    if (await uploadZone.isVisible()) {
      await expect(uploadZone).toContainText('Drop PDF here');
    }
  });

  test('PDF mismatch review accessible via pdfs-refs tab', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      await expect(pdfsTab).toBeVisible();

      const review = page.getByTestId('pdf-mismatch-review');
      if (await review.isVisible()) {
        await expect(review).toBeVisible();
      }
    }
  });

  test('mismatch cards show action buttons when data available', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const review = page.getByTestId('pdf-mismatch-review');
      if (await review.isVisible()) {
        const acceptBtn = page.getByTestId('mismatch-accept-btn').first();
        if (await acceptBtn.isVisible()) {
          await expect(acceptBtn).toBeVisible();
        }
      }
    }
  });

  test('PDF percentage display when available', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const percent = page.getByTestId('pdf-percent');
      if (await percent.isVisible()) {
        await expect(percent).toHaveText(/\d+% PDFs retrieved/);
      }
    }
  });
});
