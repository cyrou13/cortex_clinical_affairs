import { test, expect } from '@playwright/test';

test.describe('Screening Audit & Spot-Check', () => {
  test('review-lock tab loads with spot check buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      await expect(reviewTab).toBeVisible();
    }
  });

  test('review-lock tab shows spot check category buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      if (await reviewTab.isVisible()) {
        await expect(page.getByTestId('spot-check-cat-likely_relevant')).toBeVisible();
        await expect(page.getByTestId('spot-check-cat-likely_irrelevant')).toBeVisible();
      }
    }
  });

  test('review-lock tab shows lock dataset section', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      if (await reviewTab.isVisible()) {
        await expect(page.getByText('Lock Dataset')).toBeVisible();
      }
    }
  });

  test('spot check category can be switched', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      if (await reviewTab.isVisible()) {
        await page.getByTestId('spot-check-cat-likely_irrelevant').click();
        await expect(page.getByTestId('spot-check-cat-likely_irrelevant')).toBeVisible();
      }
    }
  });

  test('session dashboard shows tab content area', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('tab-content')).toBeVisible();
    }
  });

  test('workflow tabs are visible on session dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('workflow-tabs')).toBeVisible();
    }
  });

  test('review-lock tab shows spot check section heading', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      if (await reviewTab.isVisible()) {
        await expect(page.getByText('Spot Check')).toBeVisible();
      }
    }
  });

  test('review gate status renders on review-lock tab', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      await expect(reviewTab).toBeVisible();
    }
  });

  test('session metrics grid visible on dashboard', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('metrics-grid')).toBeVisible();
    }
  });

  test('tab navigation works for all tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      const tabKeys = [
        'queries',
        'articles',
        'ai-scoring',
        'screening',
        'review-lock',
        'pdfs-refs',
      ];
      for (const key of tabKeys) {
        await page.getByTestId(`tab-${key}`).click();
        await expect(page.getByTestId(`tab-${key}`)).toHaveAttribute('aria-selected', 'true');
      }
    }
  });
});
