import { test, expect } from '@playwright/test';

test('smoke - cockpit dashboard loads', async ({ page }) => {
  await page.goto('/');
  // Sidebar brand
  await expect(page.getByText('Service Cockpit')).toBeVisible();
  await expect(page.getByText('Forecast Planning')).toBeVisible();
  // Header title
  await expect(
    page.getByRole('heading', { name: 'Transactional Service Forecast Cockpit' }),
  ).toBeVisible();
  // Filter bar + trends section render
  await expect(page.getByText('Historical Trends')).toBeVisible();
  await expect(page.getByText('Forecast Drivers')).toBeVisible();
  // Submit action present
  await expect(page.getByRole('button', { name: /Submit Forecast/i })).toBeVisible();
});

test('smoke - accounts portfolio loads', async ({ page }) => {
  await page.goto('/accounts');
  await expect(page.getByText('Service Accounts — Portfolio')).toBeVisible();
});

test('smoke - forecast review (AI) loads', async ({ page }) => {
  await page.goto('/review');
  await expect(page.getByText('Ask ASM Service Genie')).toBeVisible();
  await expect(page.getByText('Field Service Assistant')).toBeVisible();
});
