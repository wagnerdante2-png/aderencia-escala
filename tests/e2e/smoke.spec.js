const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('startup has no uncaught errors and core libraries initialize', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('Aderência de Escala');
  const health = await page.evaluate(() => window.ADERENCIA_HEALTH);
  expect(health).toBeTruthy();
  expect(health.ok).toBeTruthy();
  expect(errors).toEqual([]);
});

test('main navigation renders every operational view', async ({ page }) => {
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page.locator('#historyView')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: 'Monitoramento' }).click();
  await expect(page.locator('#monitorView')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: 'Semestral' }).click();
  await expect(page.locator('#semesterView')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: 'Análise' }).click();
  await expect(page.locator('#analysisView')).not.toHaveClass(/hidden/);
});

test('global period controller keeps month/year selectors coherent', async ({ page }) => {
  await page.waitForFunction(() => document.querySelector('#historyMonth')?.options.length > 1);
  await page.selectOption('#historyMonth', '6');
  await page.selectOption('#historyYear', '2026');
  await page.waitForTimeout(50);
  const values = await page.evaluate(() => ({
    historyMonth: document.querySelector('#historyMonth')?.value,
    historyYear: document.querySelector('#historyYear')?.value,
    monitorMonth: document.querySelector('#monitorMonth')?.value,
    monitorYear: document.querySelector('#monitorYear')?.value
  }));
  expect(values.monitorMonth).toBe(values.historyMonth);
  expect(values.monitorYear).toBe(values.historyYear);
});

test('store registry includes ML61 in Guardiões da Chama and accepts a new store', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_STORE_REGISTRY);
  expect(await page.evaluate(() => window.ADERENCIA_STORE_REGISTRY.regionOf('ML61'))).toBe('GUARDIÕES DA CHAMA');
  await page.getByRole('button', { name: 'Lojas' }).click();
  await page.locator('#storeCode').fill('62');
  await page.locator('#storeName').fill('LOJA TESTE E2E');
  await page.locator('#storeRegion').selectOption({ label: 'VENTO DOURADO' });
  await page.locator('#storeSaveBtn').click();
  const saved = await page.evaluate(() => window.ADERENCIA_STORE_REGISTRY.load().ML62);
  expect(saved).toMatchObject({ code: 'ML62', name: 'LOJA TESTE E2E', region: 'VENTO DOURADO' });
});

test('history persistence survives reload', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('aderenciaHistoryV1', JSON.stringify([{store:'ML21',month:6,year:2026,adherence:96.5}])));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('aderenciaHistoryV1'))).toContain('ML21');
});
