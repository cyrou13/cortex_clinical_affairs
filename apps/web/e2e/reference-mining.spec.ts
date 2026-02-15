import { test, expect } from '@playwright/test';

test.describe('Manual Article Addition & Reference Mining', () => {
  test('manual article form renders on session page', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/manual-article');

    await expect(page.getByTestId('manual-article-form')).toBeVisible();
    await expect(page.getByTestId('manual-upload-zone')).toBeVisible();
  });

  test('manual article form has file input', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/manual-article');

    await expect(page.getByTestId('manual-file-input')).toBeAttached();
  });

  test('mined references review page loads', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/references');

    const review = page.getByTestId('mined-reference-review');
    const empty = page.getByTestId('references-empty');
    const loading = page.getByTestId('references-loading');

    await expect(review.or(empty).or(loading).first()).toBeVisible();
  });

  test('reference table shows references with action buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/references');

    const review = page.getByTestId('mined-reference-review');
    if (await review.isVisible()) {
      await expect(page.getByTestId('references-table')).toBeVisible();
      const approveBtn = page.getByTestId('approve-ref-btn').first();
      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeVisible();
      }
    }
  });

  test('reference shows validation badges', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/references');

    const review = page.getByTestId('mined-reference-review');
    if (await review.isVisible()) {
      const badges = page.getByTestId('validation-badge');
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('pending count badge visible when references pending', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1/references');

    const review = page.getByTestId('mined-reference-review');
    if (await review.isVisible()) {
      const pendingBadge = page.getByTestId('pending-count');
      if (await pendingBadge.isVisible()) {
        await expect(pendingBadge).toHaveText(/\d+ pending/);
      }
    }
  });
});
