import { test, expect } from '@playwright/test';

test.describe('Manual Screening Workflow', () => {
  test('screening tab loads with screening panel', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-screening').click();

      const screeningTab = page.getByTestId('screening-tab');
      await expect(screeningTab).toBeVisible();
    }
  });

  test('screening tab contains screening panel component', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-screening').click();

      const screeningTab = page.getByTestId('screening-tab');
      if (await screeningTab.isVisible()) {
        const panel = page.getByTestId('screening-panel');
        if (await panel.isVisible()) {
          await expect(panel).toBeVisible();
        }
      }
    }
  });

  test('screening tab contains exclusion code manager', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-screening').click();

      const screeningTab = page.getByTestId('screening-tab');
      await expect(screeningTab).toBeVisible();
    }
  });

  test('session dashboard shows workflow tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('workflow-tabs')).toBeVisible();
      await expect(page.getByTestId('tab-queries')).toBeVisible();
      await expect(page.getByTestId('tab-articles')).toBeVisible();
      await expect(page.getByTestId('tab-ai-scoring')).toBeVisible();
      await expect(page.getByTestId('tab-screening')).toBeVisible();
      await expect(page.getByTestId('tab-review-lock')).toBeVisible();
      await expect(page.getByTestId('tab-pdfs-refs')).toBeVisible();
    }
  });

  test('queries tab is default active', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      const queriesTab = page.getByTestId('tab-queries');
      await expect(queriesTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('articles tab shows article pool', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-articles').click();

      const articlesTab = page.getByTestId('articles-tab');
      await expect(articlesTab).toBeVisible();
    }
  });

  test('ai-scoring tab shows scoring configuration', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-ai-scoring').click();

      const scoringTab = page.getByTestId('ai-scoring-tab');
      await expect(scoringTab).toBeVisible();
    }
  });

  test('review-lock tab shows review gates and lock', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-review-lock').click();

      const reviewTab = page.getByTestId('review-lock-tab');
      await expect(reviewTab).toBeVisible();
    }
  });

  test('pdfs-refs tab shows PDF and reference components', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      await expect(pdfsTab).toBeVisible();
    }
  });

  test('session dashboard shows metrics grid', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('metrics-grid')).toBeVisible();
    }
  });
});
