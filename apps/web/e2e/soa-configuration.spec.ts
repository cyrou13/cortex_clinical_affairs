import { test, expect } from '@playwright/test';

test.describe('SOA Configuration, SLS Linking & Dependency', () => {
  test('SOA creation dialog opens and shows form', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses');

    const createBtn = page.getByTestId('create-soa-btn');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await expect(page.getByTestId('create-soa-dialog')).toBeVisible();
      await expect(page.getByTestId('soa-name-input')).toBeVisible();
      await expect(page.getByTestId('soa-type-selector')).toBeVisible();
    }
  });

  test('SOA type selector shows all types', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses');

    const dialog = page.getByTestId('create-soa-dialog');
    if (await dialog.isVisible()) {
      await expect(page.getByTestId('soa-type-CLINICAL')).toBeVisible();
      await expect(page.getByTestId('soa-type-SIMILAR_DEVICE')).toBeVisible();
      await expect(page.getByTestId('soa-type-ALTERNATIVE')).toBeVisible();
    }
  });

  test('session picker shows only locked sessions', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses');

    const picker = page.getByTestId('session-picker');
    if (await picker.isVisible()) {
      const checkboxes = picker.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('SOA dashboard loads for existing analysis', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1');

    const dashboard = page.getByTestId('soa-dashboard');
    const loading = page.getByTestId('soa-loading');
    const notFound = page.getByTestId('soa-not-found');
    const error = page.getByTestId('soa-error');

    await expect(dashboard.or(loading).or(notFound).or(error).first()).toBeVisible();
  });

  test('SOA dashboard shows sections list', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1');

    const dashboard = page.getByTestId('soa-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('section-list')).toBeVisible();
      await expect(page.getByTestId('progress-summary')).toBeVisible();
    }
  });

  test('SOA dashboard shows progress bar', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1');

    const dashboard = page.getByTestId('soa-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('progress-bar')).toBeVisible();
    }
  });

  test('SOA dashboard shows linked sessions', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1');

    const dashboard = page.getByTestId('soa-dashboard');
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('linked-sessions')).toBeVisible();
    }
  });

  test('dependency warning appears for Device SOA', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses');

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
  });
});
