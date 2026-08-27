const { test, expect } = require('@playwright/test');

test('XLSX cache keeps distinct typed-array views isolated', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const code = await fetch('/runtime-cache-rc47.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    const calls = [];
    w.XLSX = {
      read(data, opts) {
        const workbook = { marker: calls.length + 1, data, opts };
        calls.push(workbook);
        return workbook;
      }
    };
    w.eval(code);
    const backing = new ArrayBuffer(8);
    const firstView = new Uint8Array(backing, 0, 4);
    const secondView = new Uint8Array(backing, 4, 4);
    const first = w.XLSX.read(firstView, { type: 'array' });
    const second = w.XLSX.read(secondView, { type: 'array' });
    const firstAgain = w.XLSX.read(firstView, { type: 'array' });
    const snapshot = {
      distinctWorkbooks: first !== second,
      repeatedWorkbook: first === firstAgain,
      callCount: calls.length,
      stats: {
        hits: w.ADERENCIA_RUNTIME_CACHE.stats.xlsxHits,
        misses: w.ADERENCIA_RUNTIME_CACHE.stats.xlsxMisses
      }
    };
    frame.remove();
    return snapshot;
  });

  expect(result.distinctWorkbooks).toBeTruthy();
  expect(result.repeatedWorkbook).toBeTruthy();
  expect(result.callCount).toBe(2);
  expect(result.stats).toEqual({ hits: 1, misses: 2 });
});
