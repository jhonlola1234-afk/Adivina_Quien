import { expect } from '@playwright/test';

export async function createAndJoin(page, guest, category = 'Países Alrededor del mundo') {
  await page.goto('/');
  await page.getByRole('button', { name: `20 personajes ${category}` }).click();
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill('Ana');
  await page.getByRole('button', { name: 'Crear sala', exact: true }).click();
  const code = await page.locator('.room-code strong').innerText();
  await guest.goto('http://127.0.0.1:5174');
  await guest.getByRole('textbox', { name: 'Tu nombre' }).fill('Luis');
  await guest.getByRole('textbox', { name: 'Código de sala' }).fill(code);
  await guest.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('2/12', { exact: true })).toBeVisible();
  return code;
}

export async function chooseAndStart(page, guest, hostCharacter = 'Colombia', guestCharacter = 'Colombia') {
  await page.getByRole('button', { name: `Elegir ${hostCharacter}`, exact: true }).click();
  await guest.getByRole('button', { name: `Elegir ${guestCharacter}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Empezar partida', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Empezar partida', exact: true }).click();
  await expect(guest.getByRole('heading', { name: 'Tu tablero', exact: true })).toBeVisible();
}

export async function accuseWith(page, character) {
  await page.getByRole('button', { name: `Acusar con ${character}`, exact: true }).click();
  await page.getByRole('button', { name: 'Acusar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar acusación', exact: true }).click();
}

export async function leaveIfPresent(page) {
  if (await page.getByRole('button', { name: 'Salir de la sala' }).count()) {
    await page.getByRole('button', { name: 'Salir de la sala' }).click();
    await page.getByRole('button', { name: 'Salir', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige el universo' })).toBeVisible();
  }
}