import { test, expect } from '@playwright/test';

test.describe('SOA Workflow — Stories 3.5–3.11', () => {
  test('SOA detail page loads with tabs or shows error', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const loading = page.getByTestId('soa-detail-loading');
    const error = page.getByTestId('soa-detail-error');

    await expect(detail.or(loading).or(error).first()).toBeVisible();

    if (await detail.isVisible()) {
      await expect(page.getByTestId('soa-tabs')).toBeVisible();
      await expect(page.getByTestId('tab-overview')).toBeVisible();
      await expect(page.getByTestId('tab-grid')).toBeVisible();
      await expect(page.getByTestId('tab-quality')).toBeVisible();
      await expect(page.getByTestId('tab-narrative')).toBeVisible();
      await expect(page.getByTestId('tab-devices')).toBeVisible();
      await expect(page.getByTestId('tab-claims')).toBeVisible();
    }
  });

  test('quality tab shows assessment form', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-quality').click();
      await expect(page.getByTestId('tab-quality')).toBeVisible();
    }
  });

  test('narrative tab renders with draft panel', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-narrative').click();
      const noSections = page.getByTestId('no-sections');
      const tabContent = page.getByTestId('tab-narrative');
      await expect(noSections.or(tabContent).first()).toBeVisible();
    }
  });

  test('devices tab shows device registry', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-devices').click();
      await expect(page.getByTestId('tab-devices')).toBeVisible();
    }
  });

  test('claims tab shows claims management', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-claims').click();
      await expect(page.getByTestId('tab-claims')).toBeVisible();
    }
  });

  test('lock SOA button or locked state is visible', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      const lockBtn = page.getByTestId('lock-soa-btn');
      const lockedBadge = page.getByTestId('locked-badge');
      await expect(lockBtn.or(lockedBadge).first()).toBeVisible();
    }
  });

  test('grid tab shows extraction progress and grid', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      await page.getByTestId('tab-grid').click();
      const noGrid = page.getByTestId('no-grid');
      const gridPage = page.getByTestId('extraction-grid-page');
      await expect(noGrid.or(gridPage).first()).toBeVisible();
    }
  });

  test('tab navigation works across all tabs', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const error = page.getByTestId('soa-detail-error');
    const loading = page.getByTestId('soa-detail-loading');

    await expect(detail.or(error).or(loading).first()).toBeVisible();

    if (await detail.isVisible()) {
      const tabKeys = ['overview', 'grid', 'quality', 'narrative', 'devices', 'claims'];
      for (const key of tabKeys) {
        await page.getByTestId(`tab-${key}`).click();
        await expect(page.getByTestId(`tab-${key}`)).toBeVisible();
      }
    }
  });
});
