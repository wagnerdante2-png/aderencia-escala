const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() =>
    window.ADERENCIA_SCHEDULE_RECONCILIATION_RC58 &&
    window.ADERENCIA_PDF_CALENDAR_RC58 &&
    window.ADERENCIA_RESULT_SANITY_RC58 &&
    window.XLSX
  );
});

test('RC58 suppresses false zero only when the calculated sample is structurally implausible', async ({ page }) => {
  const out = await page.evaluate(() => {
    const api = window.ADERENCIA_RESULT_SANITY_RC58;
    return {
      sparse: api.suspicious({ adherence:0, total:20, matched:29, structCoverage:.013 }),
      validZero: api.suspicious({ adherence:0, total:920, matched:29, structCoverage:.82 }),
      nonZero: api.suspicious({ adherence:74.2, total:20, matched:29, structCoverage:.013 })
    };
  });
  expect(out).toEqual({ sparse:true, validZero:false, nonZero:false });
});

test('RC58 PDF tokenizer preserves multiple shift codes packed in the same PDF text item', async ({ page }) => {
  const out = await page.evaluate(() => {
    const api = window.ADERENCIA_PDF_CALENDAR_RC58;
    return {
      tokens: api.codeTokens('T1 T2 F T4'),
      virtual: api.virtualCodes({ text:'T1 T2 F T4', x:100, y:200, w:80 }).map(x => x.text)
    };
  });
  expect(out.tokens).toEqual(['T1','T2','T4','F']);
  expect(out.virtual).toEqual(['T1','T2','T4','F']);
});

test('RC58 reconciles split employee names without a conventional Nome header and keeps proportional dates', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const days = Array.from({length:30},(_,i)=>i+1);
    const aoa = [
      ['ML40','JUNHO 2026'],
      ['', '', '', ...days],
      ['ANA PAULA','SOUZA','OPERADOR DE LOJA II',...days.map((_,i)=>i%7===0?'F':'T1')],
      ['CARLOS EDUARDO','LIMA','FISCAL DE LOJA I',...days.map((_,i)=>i%6===0?'F':'T1')],
      [],
      ['T1 | 08:00 às 17:00']
    ];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(aoa),'Plan1');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML40 - Novo Modelo.xlsm');
    const ctx={store:'ML40',start:'2026-06-11',end:'2026-07-10'};
    const pn=[
      {name:'ANA PAULA SOUZA',key:'ANA PAULA SOUZA'},
      {name:'CARLOS EDUARDO LIMA',key:'CARLOS EDUARDO LIMA'}
    ];
    const normalized=window.ADERENCIA_SCHEDULE_RECONCILIATION_RC58.normalizeWorkbook(wb,file,ctx,pn);
    const audit=window.ADERENCIA_SCHEDULE_RECONCILIATION_RC58.last;
    const parsed=XLSX.read(await normalized.arrayBuffer(),{type:'array'});
    const rows=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    return {name:normalized.name,audit,header:rows[2],names:rows.slice(3,5).map(r=>r[0])};
  });
  expect(result.name).toMatch(/^RC58_ML40_/);
  expect(result.audit.employees).toBe(2);
  expect(result.audit.pointNameMatches).toBe(2);
  expect(result.audit.expectedDays).toBe(30);
  expect(result.audit.exactDateDays).toBe(20);
  expect(result.audit.partial).toBeTruthy();
  expect(result.audit.cellDensity).toBeGreaterThan(.8);
  expect(result.header[2]).toBe('11/06/2026');
  expect(result.header.at(-1)).toBe('30/06/2026');
  expect(result.names).toEqual(['ANA PAULA SOUZA','CARLOS EDUARDO LIMA']);
});

test('RC58 startup contracts are active together', async ({ page }) => {
  const state = await page.evaluate(() => ({
    version: window.ADERENCIA_VERSION,
    parser: window.ADERENCIA_PDF_PARSER_VERSION,
    rc58: window.ADERENCIA_SCHEDULE_RECONCILIATION_RC58?.version,
    sanity: window.ADERENCIA_RESULT_SANITY_RC58?.version,
    active: window.ADERENCIA_ACTIVE_MODULES || []
  }));
  expect(state.version).toBe('v1.0 RC58');
  expect(state.parser).toBe('RC58');
  expect(state.rc58).toBe('RC58.1');
  expect(state.sanity).toBe('RC58.1');
  expect(state.active).toContain('schedule-reconciliation-rc58.js');
  expect(state.active).toContain('pdf-schedule-parser-rc58.js');
});
