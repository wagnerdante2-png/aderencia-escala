const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_RECOVERY_R3 && window.XLSX);
});

test('RC58 R3 keeps the real June calendar across horizontally split PDF pages', async ({ page }) => {
  const out = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_RECOVERY_R3;
    const ctx = { start:'2026-06-11', end:'2026-07-10' };
    const a = api.alignRawDays(Array.from({length:17},(_,i)=>i+1), ctx, 'continuação da grade', 'ESCALA JUNHO 2026');
    const b = api.alignRawDays(Array.from({length:13},(_,i)=>i+18), ctx, 'continuação da grade', 'ESCALA JUNHO 2026');
    const dates = [...new Set([...a.pairs,...b.pairs].map(x=>x.date))].sort();
    return {a:a.pairs.length,b:b.pairs.length,total:dates.length,first:dates[0],last:dates.at(-1)};
  });
  expect(out).toEqual({a:7,b:13,total:20,first:'2026-06-11',last:'2026-06-30'});
});

test('RC58 R3 reconciles names split across cells using the validated point roster', async ({ page }) => {
  const out = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_RECOVERY_R3;
    const roster = [
      {name:'ANA PAULA DE SOUZA',key:'ANA PAULA SOUZA'},
      {name:'CARLOS EDUARDO LIMA',key:'CARLOS EDUARDO LIMA'}
    ];
    return api.matchRoster('ANA | PAULA | DE | SOUZA | OPERADOR DE LOJA II',roster);
  });
  expect(out.name).toBe('ANA PAULA DE SOUZA');
  expect(out.score).toBeGreaterThan(.9);
});

test('RC58 R3 carries employee identity to a horizontal continuation page without repeated names', async ({ page }) => {
  const out = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_RECOVERY_R3;
    const roster = [
      {name:'ANA SILVA',key:'ANA SILVA'},
      {name:'BRUNO LIMA',key:'BRUNO LIMA'},
      {name:'CARLA SOUZA',key:'CARLA SOUZA'}
    ];
    const map = new Map(roster.map(x=>[x.key,x]));
    const rows = [
      {y:300,pm:null,values:['T1','T1']},
      {y:280,pm:null,values:['F','T1']},
      {y:260,pm:null,values:['T2','T2']}
    ];
    return api.bindContinuation(rows,roster.map(x=>x.key),map).map(x=>x.pm?.name||null);
  });
  expect(out).toEqual(['ANA SILVA','BRUNO LIMA','CARLA SOUZA']);
});

test('RC58 R3 normalizes a heterogeneous June XLSM with no conventional Nome header', async ({ page }) => {
  const out = await page.evaluate(async () => {
    const api = window.ADERENCIA_SCHEDULE_RECOVERY_R3;
    const days = Array.from({length:30},(_,i)=>i+1);
    const rows = [
      ['ML40','JUNHO 2026'],
      ['', '', '', '', '', '', '', ...days],
      ['ANA','PAULA','DE','SOUZA','OPERADOR','LOJA II','',...days.map((_,i)=>i%7===0?'F':'T1')],
      ['CARLOS','EDUARDO','LIMA','','FISCAL','LOJA I','',...days.map((_,i)=>i%6===0?'F':'T1')],
      [],
      ['T1 | 08:00 às 17:00']
    ];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Plan1');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala - Novo Modelo - 1.2.xlsm');
    const ctx={store:'ML40',start:'2026-06-11',end:'2026-07-10',employees:[
      {name:'ANA PAULA DE SOUZA',key:'ANA PAULA SOUZA'},
      {name:'CARLOS EDUARDO LIMA',key:'CARLOS EDUARDO LIMA'}
    ]};
    const parsed=await api.parseExcel(file,ctx);
    return {employees:parsed.employees.size,dates:parsed.dates.length,first:parsed.dates[0],last:parsed.dates.at(-1),density:parsed.density};
  });
  expect(out.employees).toBe(2);
  expect(out.dates).toBe(20);
  expect(out.first).toBe('2026-06-11');
  expect(out.last).toBe('2026-06-30');
  expect(out.density).toBeGreaterThan(.8);
});

test('RC58 R3 recovery is active before the legacy PDF parser and R2 stays retired', async ({ page }) => {
  const state = await page.evaluate(() => ({
    active: window.ADERENCIA_ACTIVE_MODULES,
    version: window.ADERENCIA_SCHEDULE_RECOVERY_R3?.version
  }));
  expect(state.version).toBe('RC58-R3');
  const r3 = state.active.indexOf('schedule-recovery-r3.js');
  const r2 = state.active.indexOf('schedule-recovery-r2.js');
  const legacy = state.active.indexOf('pdf-schedule-parser-rc58.js');
  expect(r3).toBeGreaterThan(-1);
  expect(r2).toBe(-1);
  expect(legacy).toBeGreaterThan(r3);
});
