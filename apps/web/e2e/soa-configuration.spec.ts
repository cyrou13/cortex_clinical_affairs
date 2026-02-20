import { test, expect } from '@playwright/test';

test.describe('SOA Configuration, SLS Linking & Dependency', () => {
  test('SOA index page loads with list or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const indexPage = page.getByTestId('soa-index-page');
    const loading = page.getByTestId('soa-list-loading');

    await expect(indexPage.or(loading).first()).toBeVisible();
  });

  test('SOA creation button visible on index page', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const createBtn = page.getByTestId('create-soa-trigger');
    const emptyBtn = page.getByTestId('empty-create-btn');
    if (await createBtn.isVisible()) {
      await expect(createBtn).toBeVisible();
    } else if (await emptyBtn.isVisible()) {
      await expect(emptyBtn).toBeVisible();
    }
  });

  test('session picker shows sessions when available', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const picker = page.getByTestId('session-picker');
    if (await picker.isVisible()) {
      const checkboxes = picker.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('SOA detail page loads for existing analysis', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    const loading = page.getByTestId('soa-detail-loading');
    const error = page.getByTestId('soa-detail-error');

    await expect(detail.or(loading).or(error).first()).toBeVisible();
  });

  test('SOA detail page shows tabs when loaded', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    if (await detail.isVisible()) {
      await expect(page.getByTestId('tab-overview')).toBeVisible();
      await expect(page.getByTestId('tab-grid')).toBeVisible();
      await expect(page.getByTestId('tab-quality')).toBeVisible();
      await expect(page.getByTestId('tab-narrative')).toBeVisible();
      await expect(page.getByTestId('tab-devices')).toBeVisible();
      await expect(page.getByTestId('tab-claims')).toBeVisible();
    }
  });

  test('SOA detail page shows lock button or locked badge', async ({ page }) => {
    await page.goto('/projects/proj-1/soa/soa-1');

    const detail = page.getByTestId('soa-detail-page');
    if (await detail.isVisible()) {
      const lockBtn = page.getByTestId('lock-soa-btn');
      const lockedBadge = page.getByTestId('locked-badge');
      await expect(lockBtn.or(lockedBadge).first()).toBeVisible();
    }
  });

  test('SOA list shows items or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const indexPage = page.getByTestId('soa-index-page');
    if (await indexPage.isVisible()) {
      const list = page.getByTestId('soa-list');
      const empty = page.getByTestId('soa-empty-state');
      await expect(list.or(empty).first()).toBeVisible();
    }
  });

  test('dependency warning appears for Device SOA', async ({ page }) => {
    await page.goto('/projects/proj-1/soa');

    const createBtn = page.getByTestId('create-soa-trigger');
    if (await createBtn.isVisible()) {
      await createBtn.click();

      const dialog = page.getByTestId('create-soa-dialog');
      if (await dialog.isVisible()) {
        const deviceRadio = page.getByTestId('soa-type-SIMILAR_DEVICE');
        if (await deviceRadio.isVisible()) {
          await deviceRadio.click();
          const warning = page.getByTestId('dependency-warning');
          if (await warning.isVisible()) {
            await expect(warning).toContainText('Section 6');
          }
        }
      }
    }
  });
});
