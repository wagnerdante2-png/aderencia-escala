const { test, expect } = require('@playwright/test');

test('PDF cache does not reuse tasks across differing source options', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const code = await fetch('/pdf-security-rc35.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    const calls = [];
    w.pdfjsLib = {
      getDocument(src) {
        const task = { marker: calls.length + 1, src, promise: new Promise(() => {}) };
        calls.push(task);
        return task;
      }
    };
    w.eval(code);
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const plain1 = w.ADERENCIA_PDF_OPEN(bytes);
    const plain2 = w.ADERENCIA_PDF_OPEN(bytes);
    const protected1 = w.ADERENCIA_PDF_OPEN({ data: bytes, password: 'one' });
    const protected2 = w.ADERENCIA_PDF_OPEN({ data: bytes, password: 'two' });
    const snapshot = {
      plainCached: plain1 === plain2,
      optionTasksDistinct: protected1 !== protected2,
      optionsNotReusingPlain: protected1 !== plain1 && protected2 !== plain1,
      callCount: calls.length,
      flags: calls.map(c => ({ isEvalSupported: c.src.isEvalSupported, enableScripting: c.src.enableScripting }))
    };
    frame.remove();
    return snapshot;
  });

  expect(result.plainCached).toBeTruthy();
  expect(result.optionTasksDistinct).toBeTruthy();
  expect(result.optionsNotReusingPlain).toBeTruthy();
  expect(result.callCount).toBe(3);
  expect(result.flags).toEqual([
    { isEvalSupported: false, enableScripting: false },
    { isEvalSupported: false, enableScripting: false },
    { isEvalSupported: false, enableScripting: false }
  ]);
});