const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_HARDENING && window.XLSX);
});

test('RC51 point context reuses already validated store and competence', async ({ page }) => {
  const ctx = await page.evaluate(() => {
    document.querySelector('#pointStatus').textContent = 'Reconhecido: 45 funcionário(s) • ML11 • 3182 marcações';
    document.querySelector('#metaPeriod').textContent = '11/06/2026 a 10/07/2026';
    return window.ADERENCIA_SCHEDULE_HARDENING.pointContext();
  });
  expect(ctx).toEqual({ store: 'ML11', start: '2026-06-11', end: '2026-07-10' });
  expect(await page.evaluate(() => window.ADERENCIA_POINT_CONTEXT)).toEqual(ctx);
});

test('RC51 clears stale point context while a new point file is still loading', async ({ page }) => {
  const ctx = await page.evaluate(() => {
    window.ADERENCIA_POINT_CONTEXT = { store:'ML08', start:'2026-06-11', end:'2026-07-10' };
    document.querySelector('#metaPeriod').textContent = '11/06/2026 a 10/07/2026';
    document.querySelector('#pointStatus').textContent = 'Lendo espelho...';
    return window.ADERENCIA_SCHEDULE_HARDENING.pointContext();
  });
  expect(ctx).toEqual({ store:null, start:null, end:null });
  expect(await page.evaluate(() => window.ADERENCIA_POINT_CONTEXT)).toEqual(ctx);
});

test('RC51 normalizer prefers validated point store over stale workbook template code', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 5, 11 + i, 12);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    });
    const rows = [
      ['ESCALA OPERACIONAL | LOJA ML01'],
      ['Referência residual de template ML01'],
      ['Nome','Cargo',...dates],
      ['ANA TESTE','OPERADOR DE LOJA I',...dates.map((_,i)=>i%7===6?'F':'T1')],
      ['BIA TESTE','OPERADOR DE LOJA IV',...dates.map((_,i)=>i%7===5?'F':'T1')],
      ['CARLA TESTE','LIDER SETOR I',...dates.map(()=> 'T1')],
      [],
      ['T1 | 08:00 às 17:00']
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Andar no Tempo');
    const file = new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})], 'Escala - Novo Modelo - ML08.xlsm');
    const normalized = await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML08',start:'2026-06-11',end:'2026-07-10'});
    const out = XLSX.read(await normalized.arrayBuffer(),{type:'array'}), sheet = out.Sheets['Escala Ponto'];
    const matrix = XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
    return { name: normalized.name, header: matrix[0].join(' | '), employees: matrix.slice(3,6).map(r=>r[0]), legend: matrix.flat().find(v=>String(v).includes('T1 |')) };
  });
  expect(result.name).toContain('RC51_ML08_');
  expect(result.header).toContain('ML08');
  expect(result.header).not.toContain('ML01');
  expect(result.employees).toEqual(['ANA TESTE','BIA TESTE','CARLA TESTE']);
  expect(result.legend).toContain('08:00');
});

test('RC51 hardening module and PDF parser are active at startup', async ({ page }) => {
  const state = await page.evaluate(() => ({
    hardening: window.ADERENCIA_SCHEDULE_HARDENING?.version,
    parser: window.ADERENCIA_PDF_PARSER_VERSION,
    modules: window.ADERENCIA_ACTIVE_MODULES || []
  }));
  expect(state.hardening).toBe('RC51.1');
  expect(state.parser).toBe('RC28+RC51');
  expect(state.modules).toContain('schedule-hardening-rc51.js');
});
