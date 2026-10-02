import { test, expect } from '@playwright/test';
import { createAndJoin, chooseAndStart, leaveIfPresent } from './helpers.js';

test('recarga recupera secreto y descartes sin revelar los del rival', async ({ page, browser }) => {
  const context = await browser.newContext();
  const guest = await context.newPage();
  try {
    const code = await createAndJoin(page, guest);
    await chooseAndStart(page, guest, 'Colombia', 'México');
    await page.getByRole('button', { name: 'Descartar Brasil', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Restaurar Brasil', exact: true })).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Descartar Brasil', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Restaurar Brasil', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ver mi personaje' }).click();
    await expect(page.locator('.revealed-secret strong')).toHaveText('Colombia');
    const mine = await page.evaluate(async roomCode => {
      const session = JSON.parse(sessionStorage.getItem('adivina-quien-session'));
      const response = await fetch(`/api/rooms/${roomCode}/session`, { headers: { Authorization: `Bearer ${session.token}` } });
      return response.json();
    }, code);
    expect(mine.self.secret).toBe('paises-0');
    expect(JSON.stringify(mine.room)).not.toContain('paises-1');
    expect(mine.room.players.every(player => !('secret' in player) && !('tokenHash' in player))).toBeTruthy();
    const unauthorized = await page.request.get(`/api/rooms/${code}/session`);
    expect(unauthorized.status()).toBe(401);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBeFalsy();
  } finally {
    await leaveIfPresent(guest);
    await leaveIfPresent(page);
    await context.close();
  }
});