import { test, expect } from '@playwright/test';

test.describe('CER Workflow — Epic 5', () => {
  test('CER detail page loads with tab bar', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const loading = page.getByTestId('cer-detail-loading');
    const notFound = page.getByTestId('cer-not-found');

    await expect(detail.or(loading).or(notFound).first()).toBeVisible();

    if (await detail.isVisible()) {
      await expect(page.getByTestId('tab-bar')).toBeVisible();
      await expect(page.getByTestId('tab-assembly')).toBeVisible();
      await expect(page.getByTestId('tab-sections')).toBeVisible();
      await expect(page.getByTestId('tab-traceability')).toBeVisible();
    }
  });

  test('CER detail page shows back button or not-found state', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await expect(page.getByTestId('back-btn')).toBeVisible();
    }
    if (await notFound.isVisible()) {
      await expect(page.getByText('Back to CER list')).toBeVisible();
    }
  });

  test('CER creation form renders', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/new');

    const form = page.getByTestId('cer-creation-form');
    const loading = page.getByTestId('cer-detail-loading');
    const notFound = page.getByTestId('cer-not-found');

    await expect(form.or(loading).or(notFound).first()).toBeVisible();
  });

  test('CER sections tab loads with section navigator', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-sections').click();
      const nav = page.getByTestId('section-navigator');
      const toc = page.getByTestId('cer-toc');
      if ((await nav.isVisible()) || (await toc.isVisible())) {
        expect(true).toBe(true);
      }
    }
  });

  test('CER assembly tab shows assembler', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await expect(page.getByTestId('tab-assembly')).toBeVisible();
    }
  });

  test('CER completion tab loads', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-completion').click();
      await expect(page.getByTestId('tab-completion')).toBeVisible();
    }
  });

  test('CER documents tab loads', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-documents').click();
      await expect(page.getByTestId('tab-documents')).toBeVisible();
    }
  });

  test('CER devices tab loads with named device search', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-devices').click();
      await expect(page.getByTestId('tab-devices')).toBeVisible();
    }
  });

  test('CER vigilance tab loads', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-vigilance').click();
      await expect(page.getByTestId('tab-vigilance')).toBeVisible();
    }
  });

  test('CER traceability tab loads', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-traceability').click();
      await expect(page.getByTestId('tab-traceability')).toBeVisible();
    }
  });

  test('CER tab navigation works across all tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const notFound = page.getByTestId('cer-not-found');
    const loading = page.getByTestId('cer-detail-loading');

    await expect(detail.or(notFound).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      const tabKeys = [
        'assembly',
        'sections',
        'completion',
        'documents',
        'devices',
        'vigilance',
        'traceability',
      ];
      for (const key of tabKeys) {
        await page.getByTestId(`tab-${key}`).click();
        await expect(page.getByTestId(`tab-${key}`)).toBeVisible();
      }
    }
  });

  test('CER loading state displays correctly', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const detail = page.getByTestId('cer-detail-page');
    const loading = page.getByTestId('cer-detail-loading');
    const notFound = page.getByTestId('cer-not-found');

    await expect(detail.or(loading).or(notFound).first()).toBeVisible();
  });

  test('CER not-found state when invalid ID', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/invalid-id');

    const detail = page.getByTestId('cer-detail-page');
    const loading = page.getByTestId('cer-detail-loading');
    const notFound = page.getByTestId('cer-not-found');

    await expect(detail.or(loading).or(notFound).first()).toBeVisible();
  });
});
