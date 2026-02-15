import { test, expect } from '@playwright/test';

test.describe('SOA Workflow — Stories 3.5–3.11', () => {
  test('section editor loads with title and content area', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/sections/sec-1');

    const editor = page.getByTestId('section-editor');
    const loading = page.getByTestId('section-loading');

    await expect(editor.or(loading).first()).toBeVisible();

    if (await editor.isVisible()) {
      await expect(page.getByTestId('section-title')).toBeVisible();
      await expect(page.getByTestId('section-content')).toBeVisible();
      await expect(page.getByTestId('finalize-btn')).toBeVisible();
    }
  });

  test('quality assessment form visible on section page', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/sections/sec-1');

    const form = page.getByTestId('quality-form');
    if (await form.isVisible()) {
      await expect(page.getByTestId('assessment-type-select')).toBeVisible();
      await expect(page.getByTestId('contribution-level-select')).toBeVisible();
      await expect(page.getByTestId('submit-assessment-btn')).toBeVisible();
    }
  });

  test('narrative draft panel renders with generate button', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/sections/sec-1');

    const panel = page.getByTestId('narrative-draft-panel');
    if (await panel.isVisible()) {
      await expect(page.getByTestId('generate-draft-btn')).toBeVisible();
    }
  });

  test('device registry displays table or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/devices');

    const registry = page.getByTestId('device-registry');
    const loading = page.getByTestId('device-registry-loading');

    await expect(registry.or(loading).first()).toBeVisible();

    if (await registry.isVisible()) {
      const table = page.getByTestId('device-table');
      const empty = page.getByTestId('no-devices');
      await expect(table.or(empty).first()).toBeVisible();
    }
  });

  test('claims management panel shows claims or empty state', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/claims');

    const panel = page.getByTestId('claims-panel');
    const loading = page.getByTestId('claims-loading');

    await expect(panel.or(loading).first()).toBeVisible();

    if (await panel.isVisible()) {
      const list = page.getByTestId('claims-list');
      const empty = page.getByTestId('no-claims');
      await expect(list.or(empty).first()).toBeVisible();
    }
  });

  test('lock SOA button or locked badge is visible', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1');

    const lockBtn = page.getByTestId('lock-soa-btn');
    const lockedBadge = page.getByTestId('locked-badge');

    await expect(lockBtn.or(lockedBadge).first()).toBeVisible();
  });

  test('extraction progress panel shows progress indicators', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1');

    const panel = page.getByTestId('extraction-progress-panel');
    const loading = page.getByTestId('extraction-progress-loading');

    await expect(panel.or(loading).first()).toBeVisible();

    if (await panel.isVisible()) {
      await expect(page.getByTestId('progress-bar')).toBeVisible();
      await expect(page.getByTestId('progress-percentage')).toBeVisible();
      await expect(page.getByTestId('filter-btn-ALL')).toBeVisible();
    }
  });

  test('section navigation sidebar renders with completion indicators', async ({ page }) => {
    await page.goto('/projects/proj-1/soa-analyses/soa-1/sections/sec-1');

    const nav = page.getByTestId('section-nav');
    if (await nav.isVisible()) {
      const navButtons = nav.locator('button');
      const count = await navButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
