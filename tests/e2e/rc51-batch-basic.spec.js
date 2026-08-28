const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => document.querySelector('#batchTab') && document.querySelector('#batchRows'));
});

test('RC51 batch module mounts cleanly with one empty operational row', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: 'Processamento em lote' }).click();
  await expect(page.locator('#batchView')).not.toHaveClass(/hidden/);
  await expect(page.locator('#batchCount')).toHaveText('1');
  await expect(page.locator('#batchRows .batch-row')).toHaveCount(1);
  await expect(page.locator('#batchError')).toHaveText('0');
  await expect(page.locator('#batchOk')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('RC51 batch navigation does not overwrite an untouched individual analysis', async ({ page }) => {
  const before = await page.evaluate(() => ({
    point: document.querySelector('#pointFile')?.files?.length || 0,
    schedule: document.querySelector('#scheduleFile')?.files?.length || 0,
    pointText: document.querySelector('#pointFileName')?.textContent,
    scheduleText: document.querySelector('#scheduleFileName')?.textContent
  }));
  await page.getByRole('button', { name: 'Processamento em lote' }).click();
  await page.getByRole('button', { name: 'Análise' }).click();
  const after = await page.evaluate(() => ({
    point: document.querySelector('#pointFile')?.files?.length || 0,
    schedule: document.querySelector('#scheduleFile')?.files?.length || 0,
    pointText: document.querySelector('#pointFileName')?.textContent,
    scheduleText: document.querySelector('#scheduleFileName')?.textContent
  }));
  expect(after).toEqual(before);
});
