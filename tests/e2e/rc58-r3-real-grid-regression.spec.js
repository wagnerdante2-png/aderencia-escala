const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_RECOVERY_R3 && !!window.ADERENCIA_ACTIVE_MODULES);
}

test('RC58-R3 intercepta a escala antes dos parsers legados', async ({ page }) => {
  await openApp(page);
  const order = await page.evaluate(() => {
    const a = window.ADERENCIA_ACTIVE_MODULES;
    return {
      r3: a.indexOf('schedule-recovery-r3.js'),
      hardening: a.indexOf('schedule-hardening-rc51.js'),
      legacyPdf: a.indexOf('pdf-schedule-parser-rc58.js'),
      r2: a.indexOf('schedule-recovery-r2.js')
    };
  });
  expect(order.r3).toBeGreaterThanOrEqual(0);
  expect(order.r3).toBeLessThan(order.hardening);
  expect(order.r3).toBeLessThan(order.legacyPdf);
  expect(order.r2).toBe(-1);
});

test('RC58-R3 preserva virada Junho para Julho em grade 1..30,1', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_RECOVERY_R3;
    const raw = [...Array.from({length:30},(_,i)=>i+1),1];
    const ctx = {store:'ML11',start:'2026-06-11',end:'2026-07-10'};
    const aligned = api.alignRawDays(raw,ctx,'ESCALA OPERACIONAL | LOJA 11 Junho 2026');
    return {
      count: aligned.pairs.length,
      first: aligned.pairs[0]?.date,
      last: aligned.pairs.at(-1)?.date,
      seqLast: api.sequentialDates(raw,2026,5).at(-1)
    };
  });
  expect(result.count).toBe(21);
  expect(result.first).toBe('2026-06-11');
  expect(result.last).toBe('2026-07-01');
  expect(result.seqLast).toBe('2026-07-01');
});

test('RC58-R3 trata célula vazia da grade operacional como trabalho flexível sem inventar turno', async ({ page }) => {
  await openApp(page);
  const values = await page.evaluate(() => {
    const mapped = new Map([[2,'F'],[5,'FER'],[8,'T1']]);
    return window.ADERENCIA_SCHEDULE_RECOVERY_R3.implicitValues(10,mapped);
  });
  expect(values).toEqual(['D','D','F','D','D','FER','D','D','T1','D']);
});

test('RC58-R3 concilia nome mesmo quando o texto da linha inclui cargo', async ({ page }) => {
  await openApp(page);
  const match = await page.evaluate(() => {
    const roster = [
      {name:'FUNCIONARIO TESTE ALFA',key:'FUNCIONARIO TESTE ALFA'},
      {name:'FUNCIONARIO TESTE BETA',key:'FUNCIONARIO TESTE BETA'},
      {name:'OUTRA PESSOA TESTE',key:'OUTRA PESSOA TESTE'}
    ];
    return window.ADERENCIA_SCHEDULE_RECOVERY_R3.matchRoster('FUNCIONARIO TESTE BETA OPERADOR DE LOJA',roster);
  });
  expect(match).toBeTruthy();
  expect(match.name).toBe('FUNCIONARIO TESTE BETA');
  expect(match.score).toBeGreaterThan(0.64);
});
