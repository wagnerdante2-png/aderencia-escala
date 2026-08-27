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

test('XLSX cache isolates parsing options beyond the legacy subset', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const code = await fetch('/runtime-cache-rc47.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    const calls = [];
    w.XLSX = {
      read(data, opts) {
        const workbook = { marker: calls.length + 1, opts: { ...opts } };
        calls.push(workbook);
        return workbook;
      }
    };
    w.eval(code);
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const oneRow = w.XLSX.read(bytes, { type: 'array', sheetRows: 1 });
    const twoRows = w.XLSX.read(bytes, { type: 'array', sheetRows: 2 });
    const oneRowAgain = w.XLSX.read(bytes, { sheetRows: 1, type: 'array' });
    const snapshot = {
      distinctOptions: oneRow !== twoRows,
      sameOptionsIgnoreOrder: oneRow === oneRowAgain,
      callCount: calls.length,
      stats: {
        hits: w.ADERENCIA_RUNTIME_CACHE.stats.xlsxHits,
        misses: w.ADERENCIA_RUNTIME_CACHE.stats.xlsxMisses
      }
    };
    frame.remove();
    return snapshot;
  });

  expect(result.distinctOptions).toBeTruthy();
  expect(result.sameOptionsIgnoreOrder).toBeTruthy();
  expect(result.callCount).toBe(2);
  expect(result.stats).toEqual({ hits: 1, misses: 2 });
});

test('XLSX cache bypasses non-finite numeric option keys', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const code = await fetch('/runtime-cache-rc47.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;
    const calls = [];
    w.XLSX = {
      read(data, opts) {
        const workbook = { marker: calls.length + 1, opts: { ...opts } };
        calls.push(workbook);
        return workbook;
      }
    };
    w.eval(code);
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const nanOne = w.XLSX.read(bytes, { type: 'array', sheetRows: NaN });
    const nanTwo = w.XLSX.read(bytes, { type: 'array', sheetRows: NaN });
    const nullOne = w.XLSX.read(bytes, { type: 'array', sheetRows: null });
    const nullTwo = w.XLSX.read(bytes, { type: 'array', sheetRows: null });
    const snapshot = {
      nanBypassed: nanOne !== nanTwo,
      nullCached: nullOne === nullTwo,
      nanNotCollidingWithNull: nanOne !== nullOne,
      callCount: calls.length
    };
    frame.remove();
    return snapshot;
  });

  expect(result).toEqual({
    nanBypassed: true,
    nullCached: true,
    nanNotCollidingWithNull: true,
    callCount: 3
  });
});

test('runtime cache clear invalidates file, XLSX and PDF caches', async ({ page }) => {
  await page.goto('/index.html');
  const result = await page.evaluate(async () => {
    const runtimeCode = await fetch('/runtime-cache-rc47.js').then(r => r.text());
    const pdfCode = await fetch('/pdf-security-rc35.js').then(r => r.text());
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const w = frame.contentWindow;

    const xlsxCalls = [];
    w.XLSX = {
      read(data, opts) {
        const workbook = { marker: xlsxCalls.length + 1, data, opts };
        xlsxCalls.push(workbook);
        return workbook;
      }
    };

    const pdfCalls = [];
    w.pdfjsLib = {
      getDocument(src) {
        const task = { marker: pdfCalls.length + 1, src, promise: new Promise(() => {}) };
        pdfCalls.push(task);
        return task;
      }
    };

    w.eval(runtimeCode);
    w.eval(pdfCode);

    const bytes = new Uint8Array([1, 2, 3, 4]);
    const wb1 = w.XLSX.read(bytes, { type: 'array' });
    const wb2 = w.XLSX.read(bytes, { type: 'array' });
    const pdf1 = w.ADERENCIA_PDF_OPEN(bytes);
    const pdf2 = w.ADERENCIA_PDF_OPEN(bytes);

    const file = new w.File([bytes], 'cache.bin');
    const file1 = file.arrayBuffer();
    const file2 = file.arrayBuffer();

    w.ADERENCIA_RUNTIME_CACHE.clear();

    const wb3 = w.XLSX.read(bytes, { type: 'array' });
    const pdf3 = w.ADERENCIA_PDF_OPEN(bytes);
    const file3 = file.arrayBuffer();

    const snapshot = {
      beforeClear: {
        xlsxHit: wb1 === wb2,
        pdfHit: pdf1 === pdf2,
        fileHit: file1 === file2
      },
      afterClear: {
        xlsxInvalidated: wb1 !== wb3,
        pdfInvalidated: pdf1 !== pdf3,
        fileInvalidated: file1 !== file3
      },
      calls: { xlsx: xlsxCalls.length, pdf: pdfCalls.length },
      clearedAt: w.ADERENCIA_RUNTIME_CACHE.stats.clearedAt || null
    };

    frame.remove();
    return snapshot;
  });

  expect(result.beforeClear).toEqual({ xlsxHit: true, pdfHit: true, fileHit: true });
  expect(result.afterClear).toEqual({ xlsxInvalidated: true, pdfInvalidated: true, fileInvalidated: true });
  expect(result.calls).toEqual({ xlsx: 2, pdf: 2 });
  expect(result.clearedAt).toBeTruthy();
});
