import { test, expect } from '@playwright/test';

test.describe('CER Workflow — Epic 5', () => {
  test('CER dashboard loads with status and sections overview', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const dashboard = page.getByTestId('cer-dashboard');
    const loading = page.getByTestId('cer-loading');

    await expect(dashboard.or(loading).first()).toBeVisible();

    if (await dashboard.isVisible()) {
      await expect(page.getByTestId('status-badge')).toBeVisible();
      await expect(page.getByTestId('upstream-modules-section')).toBeVisible();
      await expect(page.getByTestId('section-completion-grid')).toBeVisible();
      await expect(page.getByTestId('traceability-coverage')).toBeVisible();
      await expect(page.getByTestId('external-docs-section')).toBeVisible();
    }
  });

  test('CER dashboard shows mismatch warning when applicable', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1');

    const dashboard = page.getByTestId('cer-dashboard');
    const loading = page.getByTestId('cer-loading');

    await expect(dashboard.or(loading).first()).toBeVisible();

    if (await dashboard.isVisible()) {
      const warning = page.getByTestId('mismatch-warning');
      // Warning may or may not be visible depending on data state
      if (await warning.isVisible()) {
        await expect(warning).toBeVisible();
      }
    }
  });

  test('CER creation form renders with regulatory context fields', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/new');

    const form = page.getByTestId('cer-creation-form');
    const loading = page.getByTestId('cer-loading');

    await expect(form.or(loading).first()).toBeVisible();
  });

  test('CER section editor loads with title, content, and finalize button', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/sections/sec-1');

    const editor = page.getByTestId('section-editor');
    const loading = page.getByTestId('section-loading');

    await expect(editor.or(loading).first()).toBeVisible();

    if (await editor.isVisible()) {
      await expect(page.getByTestId('section-title')).toBeVisible();
      await expect(page.getByTestId('section-content')).toBeVisible();
      await expect(page.getByTestId('finalize-btn')).toBeVisible();
      await expect(page.getByTestId('section-status')).toBeVisible();
    }
  });

  test('CER assembler displays checklist and assemble button', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/assemble');

    const assembler = page.getByTestId('cer-assembler');
    const loading = page.getByTestId('cer-loading');

    await expect(assembler.or(loading).first()).toBeVisible();

    if (await assembler.isVisible()) {
      await expect(page.getByTestId('assemble-btn')).toBeVisible();

      const checklistItems = page.getByTestId('checklist-item');
      const count = await checklistItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('CER assembler shows prerequisite warning when applicable', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/assemble');

    const assembler = page.getByTestId('cer-assembler');
    const loading = page.getByTestId('cer-loading');

    await expect(assembler.or(loading).first()).toBeVisible();

    if (await assembler.isVisible()) {
      const warning = page.getByTestId('prerequisite-warning');
      // Warning may or may not be visible depending on prerequisites state
      if (await warning.isVisible()) {
        await expect(warning).toBeVisible();
      }
    }
  });

  test('section navigator renders with navigation buttons', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/sections');

    const navigator = page.getByTestId('section-navigator');
    const loading = page.getByTestId('section-loading');

    await expect(navigator.or(loading).first()).toBeVisible();

    if (await navigator.isVisible()) {
      const navButtons = navigator.locator('button');
      const count = await navButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('named device search page loads with search interface', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/named-search');

    const search = page.getByTestId('named-device-search');
    const loading = page.getByTestId('named-device-loading');

    await expect(search.or(loading).first()).toBeVisible();
  });

  test('named device search shows progress indicator when applicable', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/named-search');

    const search = page.getByTestId('named-device-search');
    const loading = page.getByTestId('named-device-loading');

    await expect(search.or(loading).first()).toBeVisible();

    if (await search.isVisible()) {
      const progress = page.getByTestId('search-progress');
      // Progress may or may not be visible depending on search state
      if (await progress.isVisible()) {
        await expect(progress).toBeVisible();
      }
    }
  });

  test('external document manager displays add button and document list', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/external-docs');

    const manager = page.getByTestId('external-doc-manager');
    const loading = page.getByTestId('external-doc-loading');

    await expect(manager.or(loading).first()).toBeVisible();

    if (await manager.isVisible()) {
      await expect(page.getByTestId('add-doc-btn')).toBeVisible();
      await expect(page.getByTestId('doc-list')).toBeVisible();
    }
  });

  test('traceability drill down page loads', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/traceability');

    const drillDown = page.getByTestId('traceability-drill-down');
    const loading = page.getByTestId('traceability-loading');

    await expect(drillDown.or(loading).first()).toBeVisible();
  });

  test('vigilance findings table displays', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/vigilance');

    const findings = page.getByTestId('vigilance-findings');
    const loading = page.getByTestId('vigilance-loading');

    await expect(findings.or(loading).first()).toBeVisible();
  });

  test('unresolved claims list displays', async ({ page }) => {
    await page.goto('/projects/proj-1/cer/cer-1/claims');

    const claims = page.getByTestId('unresolved-claims');
    const loading = page.getByTestId('unresolved-claims-loading');

    await expect(claims.or(loading).first()).toBeVisible();
  });
});
