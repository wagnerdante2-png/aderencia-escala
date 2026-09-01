const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_RECONCILIATION && window.ADERENCIA_PDF_CALENDAR_RC57 && window.XLSX);
});

test('RC57 normalizes a July-only schedule proportionally against an 11-to-10 point cycle', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const codesA = days.map((_, i) => i % 7 === 0 ? 'F' : 'T1 08:00 17:00');
    const codesB = days.map((_, i) => i % 6 === 0 ? 'D' : 'T2 09:00 18:00');
    const aoa = [
      ['ML32', 'JULHO 2026'],
      ['Nome do colaborador', 'Cargo', ...days],
      ['MARIA APARECIDA SILVA', 'OPERADOR DE LOJA I', ...codesA],
      ['JOAO CARLOS PEREIRA', 'LIDER SETOR I', ...codesB],
      [],
      ['LEGENDA'],
      ['T1 | 08:00 às 17:00'],
      ['T2 | 09:00 às 18:00']
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Novo Modelo');
    const file = new File([XLSX.write(wb, { bookType:'xlsx', type:'array' })], 'Escala - Novo Modelo - 1.2.xlsx');
    const ctx = { store:'ML32', start:'2026-07-11', end:'2026-08-10' };
    const pn = [
      { name:'MARIA APARECIDA SILVA', key:'MARIA APARECIDA SILVA' },
      { name:'JOAO CARLOS PEREIRA', key:'JOAO CARLOS PEREIRA' }
    ];
    const normalized = window.ADERENCIA_SCHEDULE_RECONCILIATION.normalizeWorkbook(wb, file, ctx, pn);
    const audit = window.ADERENCIA_SCHEDULE_RECONCILIATION.last;
    const out = XLSX.read(await normalized.arrayBuffer(), { type:'array' });
    const rows = XLSX.utils.sheet_to_json(out.Sheets['Escala Ponto'], { header:1, defval:'', raw:false });
    return { name:normalized.name, audit, header:rows[2], names:rows.slice(3,5).map(r => r[0]) };
  });
  expect(result.name).toMatch(/^RC57_ML32_/);
  expect(result.audit.store).toBe('ML32');
  expect(result.audit.employees).toBe(2);
  expect(result.audit.pointNameMatches).toBe(2);
  expect(result.audit.expectedDays).toBe(31);
  expect(result.audit.exactDateDays).toBe(21);
  expect(result.audit.partial).toBeTruthy();
  expect(result.header).toHaveLength(23);
  expect(result.names).toEqual(['MARIA APARECIDA SILVA', 'JOAO CARLOS PEREIRA']);
});

test('RC57 finds the employee column from point names even without a Nome header', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const aoa = [
      ['ML40', 'JULHO 2026'],
      ['', '', ...days],
      ['ANA PAULA SOUZA', 'OPERADOR DE LOJA II', ...days.map(() => 'T1')],
      ['CARLOS EDUARDO LIMA', 'FISCAL DE LOJA I', ...days.map((_, i) => i % 7 === 0 ? 'F' : 'T1')],
      [],
      ['T1 | 08:00 às 17:00']
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan1');
    const file = new File([XLSX.write(wb, { bookType:'xlsx', type:'array' })], 'Escala - Novo Modelo - 1.2 (4).xlsx');
    const ctx = { store:'ML40', start:'2026-07-11', end:'2026-08-10' };
    const pn = [
      { name:'ANA PAULA SOUZA', key:'ANA PAULA SOUZA' },
      { name:'CARLOS EDUARDO LIMA', key:'CARLOS EDUARDO LIMA' }
    ];
    const normalized = window.ADERENCIA_SCHEDULE_RECONCILIATION.normalizeWorkbook(wb, file, ctx, pn);
    return { name: normalized.name, audit: window.ADERENCIA_SCHEDULE_RECONCILIATION.last };
  });
  expect(result.name).toMatch(/^RC57_ML40_/);
  expect(result.audit.employees).toBe(2);
  expect(result.audit.pointNameMatches).toBe(2);
  expect(result.audit.exactDateDays).toBe(21);
});

test('RC57 multipage merge remains available as a compatibility alias under the RC58 parser', async ({ page }) => {
  const result = await page.evaluate(() => {
    const merge = window.ADERENCIA_PDF_CALENDAR_RC57.mergeEmployeeSlices;
    const slices = [
      { key:'ANA SILVA', name:'ANA SILVA', cargo:'OPERADOR', pointMatched:true, days:new Map([['2026-07-11','T1'],['2026-07-12','F']]) },
      { key:'BRUNO LIMA', name:'BRUNO LIMA', cargo:'FISCAL', pointMatched:true, days:new Map([['2026-07-11','T2']]) },
      { key:'ANA SILVA', name:'ANA SILVA', cargo:'OPERADOR', pointMatched:true, days:new Map([['2026-07-13','T1'],['2026-07-14','T1']]) }
    ];
    const merged = merge(slices);
    return {
      size: merged.size,
      ana: [...merged.get('ANA SILVA').days.entries()],
      bruno: [...merged.get('BRUNO LIMA').days.entries()],
      alias: window.ADERENCIA_PDF_CALENDAR_RC56 === window.ADERENCIA_PDF_CALENDAR_RC57,
      parser: window.ADERENCIA_PDF_PARSER_VERSION
    };
  });
  expect(result.size).toBe(2);
  expect(result.ana).toEqual([
    ['2026-07-11','T1'],['2026-07-12','F'],['2026-07-13','T1'],['2026-07-14','T1']
  ]);
  expect(result.bruno).toEqual([['2026-07-11','T2']]);
  expect(result.alias).toBeTruthy();
  expect(result.parser).toBe('RC58');
});

test('RC58 multipage merge rejects contradictory codes for the same employee and date', async ({ page }) => {
  const result = await page.evaluate(() => {
    const merge = window.ADERENCIA_PDF_CALENDAR_RC57.mergeEmployeeSlices;
    try {
      merge([
        { key:'ANA SILVA', name:'ANA SILVA', cargo:'OPERADOR', pointMatched:true, days:new Map([['2026-07-11','T1'],['2026-07-12','F']]) },
        { key:'ANA SILVA', name:'ANA SILVA', cargo:'OPERADOR', pointMatched:true, days:new Map([['2026-07-11','F'],['2026-07-13','T1']]) }
      ]);
      return { accepted:true, message:'', code:null, fatal:false };
    } catch (e) {
      return { accepted:false, message:String(e.message), code:e.code||null, fatal:e.aderenciaFatal===true };
    }
  });
  expect(result.accepted).toBeFalsy();
  expect(result.code).toBe('ADERENCIA_CONFLICTING_PDF_SLICES');
  expect(result.fatal).toBeTruthy();
  expect(result.message).toContain('ANA SILVA');
  expect(result.message).toContain('11/07/2026');
  expect(result.message).toContain('T1');
  expect(result.message).toContain('F');
});

test('RC57 accepts embedded shift text without inventing missing times', async ({ page }) => {
  const data = await page.evaluate(() => ({
    t1: window.ADERENCIA_SCHEDULE_RECONCILIATION.extractCode('T1 08:00 - 17:00'),
    t4: window.ADERENCIA_SCHEDULE_RECONCILIATION.extractCode('Turno T4 / apoio'),
    fer: window.ADERENCIA_SCHEDULE_RECONCILIATION.extractCode('FER - férias'),
    none: window.ADERENCIA_SCHEDULE_RECONCILIATION.extractCode('08:00 17:00')
  }));
  expect(data).toEqual({ t1:'T1', t4:'T4', fer:'FER', none:null });
});
