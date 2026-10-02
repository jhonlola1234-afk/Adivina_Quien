import { test, expect } from '@playwright/test';
import { createAndJoin, chooseAndStart, accuseWith, leaveIfPresent } from './helpers.js';

test('secretos repetidos, fallo, eliminacion, ganador y revancha entre navegadores', async ({ page, browser }) => {
  const context = await browser.newContext();
  const guest = await context.newPage();
  try {
    await createAndJoin(page, guest);
    await chooseAndStart(page, guest);
    await accuseWith(page, 'México');
    await expect(guest.getByText('Es tu turno', { exact: true })).toBeVisible();
    await expect(page.getByText('Eliminado', { exact: true })).toHaveCount(0);
    await accuseWith(guest, 'Colombia');
    await expect(page.locator('.winner-banner h2')).toHaveText('Luis');
    await expect(guest.locator('.winner-banner h2')).toHaveText('Luis');
    await expect(page.getByText('Eliminado', { exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Otra partida' }).click();
    await expect(guest.getByRole('heading', { name: 'Guarda bien tu secreto.' })).toBeVisible();
    await expect(page.getByText('Todavía sin elegir', { exact: true })).toBeVisible();
  } finally {
    await leaveIfPresent(guest);
    await leaveIfPresent(page);
    await context.close();
  }
});