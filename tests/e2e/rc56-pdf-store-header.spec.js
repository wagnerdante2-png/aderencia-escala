const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_PDF_STORE_GUARD_RC56 && window.ADERENCIA_SCHEDULE_HARDENING);
});

test('RC56 header store uses MLxx before LOJA xx and ignores filename semantics', async ({ page }) => {
  const result = await page.evaluate(() => {
    const api=window.ADERENCIA_PDF_STORE_GUARD_RC56;
    return {
      mlPriority:api.resolveHeaderStore('ESCALA OPERACIONAL | LOJA 10 | ML11 - CAMPINAS'),
      lojaFallback:api.resolveHeaderStore('ESCALA OPERACIONAL | LOJA 9 | JULHO 2026')
    };
  });
  expect(result.mlPriority).toBe('ML11');
  expect(result.lojaFallback).toBe('ML09');
});

test('RC56 blocks ambiguous header with two different ML stores', async ({ page }) => {
  const message = await page.evaluate(() => {
    try{return window.ADERENCIA_PDF_STORE_GUARD_RC56.resolveHeaderStore('ML10 - LOJA A | ML11 - LOJA B')}
    catch(e){return String(e.message)}
  });
  expect(message).toContain('cabeçalho PDF ambíguo');
  expect(message).toContain('ML10');
  expect(message).toContain('ML11');
});

test('RC56 blocks header store that diverges from validated point store', async ({ page }) => {
  const message = await page.evaluate(() => {
    try{return window.ADERENCIA_PDF_STORE_GUARD_RC56.validateHeader('ESCALA | ML10 - LOJA 10','ML11')}
    catch(e){return String(e.message)}
  });
  expect(message).toContain('ML10');
  expect(message).toContain('ML11');
  expect(message).toContain('diverge');
});

test('RC56 accepts header only when it confirms the point store', async ({ page }) => {
  const store = await page.evaluate(() => window.ADERENCIA_PDF_STORE_GUARD_RC56.validateHeader('ESCALA OPERACIONAL | LOJA 11 | ML11 - CAMPINAS','ML11'));
  expect(store).toBe('ML11');
});
