const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('period API rejects invalid state without mutating the current period', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_PERIOD);
  await page.evaluate(() => window.ADERENCIA_PERIOD.set(6, 2026, 'boundary'));
  const result = await page.evaluate(() => {
    const before = window.ADERENCIA_PERIOD.get();
    const attempts = [
      window.ADERENCIA_PERIOD.set(0, 2026, 'invalid'),
      window.ADERENCIA_PERIOD.set(13, 2026, 'invalid'),
      window.ADERENCIA_PERIOD.set(6.5, 2026, 'invalid'),
      window.ADERENCIA_PERIOD.set(6, 2026.5, 'invalid')
    ];
    return { before, attempts, after: window.ADERENCIA_PERIOD.get() };
  });
  expect(result.attempts).toEqual([false, false, false, false]);
  expect(result.after).toEqual(result.before);
});

test('history normalizes, filters invalid rows and keeps the newest competence result', async ({ page }) => {
  const rows = await page.evaluate(() => {
    localStorage.setItem('aderenciaHistoricoV2', JSON.stringify([
      { store:'ML21', month:6, year:2026, adherence:90, savedAt:'2026-07-01T10:00:00.000Z' },
      { store:'ML21', month:6, year:2026, adherence:96.5, savedAt:'2026-07-02T10:00:00.000Z' },
      { store:'ML21', month:13, year:2026, adherence:80, savedAt:'2026-07-03T10:00:00.000Z' },
      { store:'LOJA21', month:6, year:2026, adherence:80, savedAt:'2026-07-03T10:00:00.000Z' },
      { store:'ML22', month:6, year:2026, adherence:101, savedAt:'2026-07-03T10:00:00.000Z' }
    ]));
    return window.ADERENCIA_HISTORY.load();
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ store:'ML21', month:6, year:2026, adherence:96.5 });
});

test('store registry discards unsupported regional values on persisted data', async ({ page }) => {
  const state = await page.evaluate(() => {
    localStorage.setItem('aderenciaStoreRegistryV1', JSON.stringify({
      ML62: { code:'ML62', name:'LOJA TESTE', region:'REGIONAL INVENTADA' }
    }));
    const row = window.ADERENCIA_STORE_REGISTRY.load().ML62;
    return { name: row?.name, region: row?.region };
  });
  expect(state).toEqual({ name:'LOJA TESTE', region:'' });
});

test('PDF hardening overrides caller attempts to enable eval and scripting', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const code = await fetch('/pdf-security-rc35.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    const calls = [];
    w.pdfjsLib = {
      getDocument(src) {
        calls.push(src);
        return { promise: new Promise(() => {}) };
      }
    };
    w.eval(code);
    const data = new Uint8Array([1,2,3]);
    w.ADERENCIA_PDF_OPEN({ data, isEvalSupported:true, enableScripting:true, password:'x' });
    const out = calls.map(c => ({
      isEvalSupported:c.isEvalSupported,
      enableScripting:c.enableScripting,
      password:c.password
    }));
    frame.remove();
    return out;
  });
  expect(result).toEqual([{ isEvalSupported:false, enableScripting:false, password:'x' }]);
});