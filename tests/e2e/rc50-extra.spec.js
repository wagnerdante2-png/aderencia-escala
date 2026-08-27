const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('PDF security cache keeps distinct typed-array views isolated', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const code = await fetch('/pdf-security-rc35.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    const calls = [];
    w.pdfjsLib = {
      getDocument(src) {
        calls.push(src);
        return { promise: new Promise(() => {}), marker: calls.length };
      }
    };
    w.ADERENCIA_RUNTIME_CACHE = {
      stats: { hits: 0, misses: 0 },
      notePdf(hit) { if (hit) this.stats.hits++; else this.stats.misses++; }
    };
    w.eval(code);
    const backing = new ArrayBuffer(8);
    const firstView = new Uint8Array(backing, 0, 4);
    const secondView = new Uint8Array(backing, 4, 4);
    const first = w.ADERENCIA_PDF_OPEN(firstView);
    const second = w.ADERENCIA_PDF_OPEN(secondView);
    const firstAgain = w.ADERENCIA_PDF_OPEN(firstView);
    const snapshot = {
      distinctTasks: first !== second,
      repeatedTask: first === firstAgain,
      callCount: calls.length,
      flags: calls.map(c => ({ isEvalSupported: c.isEvalSupported, enableScripting: c.enableScripting })),
      stats: w.ADERENCIA_RUNTIME_CACHE.stats
    };
    frame.remove();
    return snapshot;
  });
  expect(result.distinctTasks).toBeTruthy();
  expect(result.repeatedTask).toBeTruthy();
  expect(result.callCount).toBe(2);
  expect(result.flags).toEqual([
    { isEvalSupported:false, enableScripting:false },
    { isEvalSupported:false, enableScripting:false }
  ]);
  expect(result.stats).toEqual({ hits:1, misses:2 });
});

test('PDF security hardens string and URL sources', async ({ page }) => {
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
    w.ADERENCIA_PDF_OPEN('/fixture.pdf');
    w.ADERENCIA_PDF_OPEN(new w.URL('https://example.com/fixture.pdf'));
    const snapshot = calls.map(c => ({
      url: c.url,
      isEvalSupported: c.isEvalSupported,
      enableScripting: c.enableScripting
    }));
    frame.remove();
    return snapshot;
  });
  expect(result).toEqual([
    { url:'/fixture.pdf', isEvalSupported:false, enableScripting:false },
    { url:'https://example.com/fixture.pdf', isEvalSupported:false, enableScripting:false }
  ]);
});

test('corrupted persisted history and store registry do not break startup', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(() => {
    localStorage.setItem('aderenciaHistoricoV2', '{corrompido');
    localStorage.setItem('aderenciaStoreRegistryV1', '{corrompido');
  });
  await page.reload();
  await page.waitForFunction(() => window.ADERENCIA_RC50_HEALTH);
  const state = await page.evaluate(() => ({
    history: window.ADERENCIA_HISTORY?.load?.(),
    ml61: window.ADERENCIA_STORE_REGISTRY?.regionOf?.('ML61'),
    health: window.ADERENCIA_RC50_HEALTH?.ok
  }));
  expect(errors).toEqual([]);
  expect(state.history).toEqual([]);
  expect(state.ml61).toBe('GUARDIÕES DA CHAMA');
  expect(state.health).toBeTruthy();
});