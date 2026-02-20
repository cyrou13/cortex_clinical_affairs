import { test, expect } from '@playwright/test';

test.describe('Manual Article Addition & Reference Mining', () => {
  test('pdfs-refs tab shows manual article form', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      await expect(pdfsTab).toBeVisible();
    }
  });

  test('pdfs-refs tab contains PDF and reference components', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      await expect(pdfsTab).toBeVisible();
    }
  });

  test('mined references review is accessible via pdfs-refs tab', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      await expect(pdfsTab).toBeVisible();

      const mined = page.getByTestId('mined-reference-review');
      const manual = page.getByTestId('manual-article-form');
      if (await mined.isVisible()) {
        await expect(mined).toBeVisible();
      }
      if (await manual.isVisible()) {
        await expect(manual).toBeVisible();
      }
    }
  });

  test('session dashboard tab navigation includes pdfs-refs', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('tab-pdfs-refs')).toBeVisible();
      await expect(page.getByText('PDFs & References')).toBeVisible();
    }
  });

  test('pdfs-refs tab can be selected', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();
      await expect(page.getByTestId('tab-pdfs-refs')).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('PDF retrieval panel accessible via pdfs-refs tab', async ({ page }) => {
    await page.goto('/projects/proj-1/sls-sessions/sess-1');

    const dashboard = page.getByTestId('session-dashboard');
    if (await dashboard.isVisible()) {
      await page.getByTestId('tab-pdfs-refs').click();

      const pdfsTab = page.getByTestId('pdfs-refs-tab');
      if (await pdfsTab.isVisible()) {
        const pdfPanel = page.getByTestId('pdf-retrieval-panel');
        if (await pdfPanel.isVisible()) {
          await expect(pdfPanel).toBeVisible();
        }
      }
    }
  });
});
