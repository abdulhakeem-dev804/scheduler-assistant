import { test, expect } from '@playwright/test';

test.describe('Event Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('can create a new event', async ({ page }) => {
        // Open modal
        await page.getByLabel('New Event').click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill in event details
        await page.getByLabel('Title').fill('Test Meeting');
        await page.getByLabel('Description').fill('This is a test event');

        // Submit
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Modal should close
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Toast should appear
        await expect(page.getByText('Event created')).toBeVisible();
    });

    test('validates required fields', async ({ page }) => {
        // Open modal
        await page.getByLabel('New Event').click();

        // Try to submit without title
        await page.getByRole('button', { name: 'Create Event' }).click();

        // Should show validation error
        await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('can close modal with cancel button', async ({ page }) => {
        await page.getByLabel('New Event').click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('dialog')).not.toBeVisible();
    });
});
