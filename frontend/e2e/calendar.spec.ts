import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('loads the calendar page', async ({ page }) => {
        await expect(page).toHaveTitle(/Scheduler Assistant/);
    });

    test('displays the month view by default', async ({ page }) => {
        await expect(page.getByRole('tab', { name: 'Month' })).toHaveAttribute('data-state', 'active');
    });

    test('can navigate between months', async ({ page }) => {
        const title = page.locator('h1');
        const initialTitle = await title.textContent();

        // Click next month button - use getByRole with exact name to avoid Next.js dev tools
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        // Title should change
        await expect(title).not.toHaveText(initialTitle!);
    });

    test('can switch between calendar views', async ({ page }) => {
        // Switch to week view
        await page.getByRole('tab', { name: 'Week' }).click();
        await expect(page.getByRole('tab', { name: 'Week' })).toHaveAttribute('data-state', 'active');

        // Switch to day view
        await page.getByRole('tab', { name: 'Day' }).click();
        await expect(page.getByRole('tab', { name: 'Day' })).toHaveAttribute('data-state', 'active');

        // Switch to agenda
        await page.getByRole('tab', { name: 'Agenda' }).click();
        await expect(page.getByRole('tab', { name: 'Agenda' })).toHaveAttribute('data-state', 'active');
    });

    test('can open the new event modal', async ({ page }) => {
        await page.getByRole('button', { name: 'New Event' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        // Use dialog heading specifically to avoid matching both button and heading
        await expect(page.getByRole('heading', { name: 'New Event' })).toBeVisible();
    });
});
