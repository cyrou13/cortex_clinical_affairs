import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
  test('displays User Management page with table', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('User Management')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('shows Add User button', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByText('Add User')).toBeVisible();
  });

  test('opens create user dialog', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByText('Add User').click();
    await expect(page.getByRole('dialog', { name: 'Create user' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await expect(page.getByLabel('Role')).toBeVisible();
  });

  test('create dialog validates required fields', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByText('Add User').click();
    await page.getByText('Create User').click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Name is required')).toBeVisible();
  });

  test('shows search and filter controls', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByLabel('Search users')).toBeVisible();
    await expect(page.getByLabel('Filter by role')).toBeVisible();
    await expect(page.getByLabel('Filter by status')).toBeVisible();
  });

  test('table has sortable headers', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('button', { name: /Name/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Role/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Status/i })).toBeVisible();
  });
});
