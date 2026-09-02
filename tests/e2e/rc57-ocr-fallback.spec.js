const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_PDF_STORE_GUARD_RC57 && window.ADERENCIA_PDF_OCR_RC57);
});

test('RC57 mounts OCR fallback without eager Tesseract loading', async ({ page }) => {
  const state = await page.evaluate(() => ({
    version: window.ADERENCIA_VERSION,
    parser: window.ADERENCIA_PDF_PARSER_VERSION,
    guard: window.ADERENCIA_PDF_STORE_GUARD_RC57?.version,
    ocr: window.ADERENCIA_PDF_OCR_RC57?.version,
    legacyAlias: window.ADERENCIA_PDF_STORE_GUARD_RC56 === window.ADERENCIA_PDF_STORE_GUARD_RC57,
    tesseractScript: !!document.querySelector('script[src*="tesseract.min.js"]')
  }));
  expect(state).toMatchObject({ version:'v1.0 RC61', parser:'RC57', guard:'RC57.1', ocr:'RC57.1', legacyAlias:true, tesseractScript:false });
});

test('RC57 permits OCR retry only for structural text failure', async ({ page }) => {
  const result = await page.evaluate(() => {
    const api=window.ADERENCIA_PDF_OCR_RC57;
    return {
      structural:api.ocrEligible(new Error('grade PDF não pôde ser alinhada com segurança ao período do espelho'),new File(['x'],'escala.pdf')),
      coverage:api.ocrEligible(new Error('escala reconhecida, mas cobre somente 80% da competência do espelho; dias ausentes não são inferidos'),new File(['x'],'escala.pdf')),
      turns:api.ocrEligible(new Error('turnos sem horário na legenda: T9'),new File(['x'],'escala.pdf')),
      divergentStore:api.ocrEligible(new Error('loja da escala (ML10) diverge do espelho (ML11)'),new File(['x'],'escala.pdf'))
    };
  });
  expect(result).toEqual({ structural:true, coverage:false, turns:false, divergentStore:false });
});

test('RC57 allows store-confirmation retry only when header itself was OCR-approved', async ({ page }) => {
  const result = await page.evaluate(() => {
    const guard=window.ADERENCIA_PDF_STORE_GUARD_RC57,ocr=window.ADERENCIA_PDF_OCR_RC57,file=new File(['x'],'imagem.pdf',{type:'application/pdf',lastModified:123});
    guard.lastAudit={key:guard.key(file),source:'ocr'};
    const allowed=ocr.ocrEligible(new Error('loja da escala não pôde ser confirmada contra o espelho (ML11)'),file);
    guard.lastAudit={key:guard.key(file),source:'text'};
    const denied=ocr.ocrEligible(new Error('loja da escala não pôde ser confirmada contra o espelho (ML11)'),file);
    return{allowed,denied};
  });
  expect(result).toEqual({allowed:true,denied:false});
});

test('RC57 invalidates calculation immediately when a new PDF enters validation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const input=document.querySelector('#scheduleFile'),btn=document.querySelector('#calculateBtn'),dt=new DataTransfer();
    btn.disabled=false;
    dt.items.add(new File([new Uint8Array([1,2,3,4])],'invalid-image.pdf',{type:'application/pdf'}));
    input.files=dt.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    const immediate={disabled:btn.disabled,name:input.files?.[0]?.name,fileLabel:document.querySelector('#scheduleFileName')?.textContent};
    await new Promise(r=>setTimeout(r,80));
    return immediate;
  });
  expect(result.disabled).toBeTruthy();
  expect(result.name).toBe('invalid-image.pdf');
  expect(result.fileLabel).toBe('invalid-image.pdf');
});
