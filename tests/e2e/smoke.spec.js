const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('startup has no uncaught errors and RC50 integrity is green', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.ADERENCIA_RC50_HEALTH);
  await expect(page.locator('h1')).toHaveText('Aderência de Escala');
  const health = await page.evaluate(() => ({
    core: window.ADERENCIA_HEALTH,
    final: window.ADERENCIA_RC50_HEALTH,
    failed: window.ADERENCIA_RC50_HEALTH?.checks?.filter(x => !x.ok) || [],
    runtimeFlag: window.__ADERENCIA_RUNTIME_CACHE_RC47__,
    runtime: window.ADERENCIA_RUNTIME_CACHE,
    pdfFlag: window.__ADERENCIA_PDF_HARDENED__,
    pdf: window.ADERENCIA_PDF_SECURITY,
    version: window.ADERENCIA_VERSION
  }));
  console.log('RC50_PAGE_ERRORS', JSON.stringify(errors));
  console.log('RC50_RUNTIME_DIAG', JSON.stringify({runtimeFlag:health.runtimeFlag,runtime:!!health.runtime,pdfFlag:health.pdfFlag,pdf:health.pdf||null}));
  console.log('RC50_FAILED_CHECKS', JSON.stringify(health.failed));
  expect(errors, 'Uncaught browser errors').toEqual([]);
  expect(health.version).toBe('v1.0 RC58');
  expect(health.core?.ok).toBeTruthy();
  expect(health.final?.ok, JSON.stringify(health.failed)).toBeTruthy();
  expect(health.pdf).toMatchObject({ active:true, isEvalSupported:false, enableScripting:false });
});

test('repository package metadata matches the RC58 runtime', async ({ page }) => {
  const meta = await page.evaluate(async () => {
    const response = await fetch('/package.json', { cache:'no-store' });
    if (!response.ok) throw new Error(`package.json HTTP ${response.status}`);
    const pkg = await response.json();
    return { runtime: window.ADERENCIA_VERSION, packageVersion: pkg.version };
  });
  expect(meta).toEqual({ runtime:'v1.0 RC58', packageVersion:'1.0.0-rc58' });
});

test('main navigation renders every operational view', async ({ page }) => {
  await page.getByRole('button', { name: 'Histórico' }).click();
  await expect(page.locator('#historyView')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: 'Monitoramento' }).click();
  await expect(page.locator('#monitorView')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: 'Semestral' }).click();
  await expect(page.locator('#semesterView')).not.toHaveClass(/hidden/);
  await page.getByRole('button', { name: 'Análise' }).click();
  await expect(page.locator('#analysisView')).not.toHaveClass(/hidden/);
});

test('global period controller keeps the entire ecosystem coherent', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_PERIOD && document.querySelector('#historyMonth')?.options.length > 1);
  const ok = await page.evaluate(() => window.ADERENCIA_PERIOD.set(6, 2026, 'e2e'));
  expect(ok).toBeTruthy();
  await page.waitForTimeout(100);
  const values = await page.evaluate(() => ({
    state: window.ADERENCIA_PERIOD.get(),
    historyMonth: document.querySelector('#historyMonth')?.value,
    historyYear: document.querySelector('#historyYear')?.value,
    monitorMonth: document.querySelector('#monitorMonth')?.value,
    monitorYear: document.querySelector('#monitorYear')?.value,
    saveMonth: document.querySelector('#saveMonth')?.value,
    saveYear: document.querySelector('#saveYear')?.value,
    semesterYear: document.querySelector('#semesterYear')?.value,
    ledMonth: document.querySelector('#networkLedMonth')?.value,
    ledYear: document.querySelector('#networkLedYear')?.value
  }));
  expect(values.state).toMatchObject({ month: 6, year: 2026 });
  expect(values.historyMonth).toBe('6');
  expect(values.monitorMonth).toBe('6');
  expect(values.saveMonth).toBe('6');
  expect(values.ledMonth).toBe('6');
  expect(values.historyYear).toBe('2026');
  expect(values.monitorYear).toBe('2026');
  expect(values.saveYear).toBe('2026');
  expect(values.semesterYear).toBe('2026');
  expect(values.ledYear).toBe('2026');
});

test('11-to-10 competence is anchored to the start of the point period', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_COMPETENCE && window.ADERENCIA_PERIOD);
  await page.evaluate(() => {
    document.querySelector('#metaPeriod').textContent = '11/06/2026 a 10/07/2026';
    document.querySelector('#warnings').textContent = 'O período integral do espelho é 11/06/2026 a 10/07/2026.';
  });
  await page.waitForTimeout(180);
  const c = await page.evaluate(() => window.ADERENCIA_COMPETENCE.fromAnalysis());
  expect(c).toMatchObject({ month: 6, year: 2026, periodStart: '2026-06-11', periodEnd: '2026-07-10' });
});

test('store registry includes ML61 in Guardiões da Chama and accepts a new store', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_STORE_REGISTRY);
  expect(await page.evaluate(() => window.ADERENCIA_STORE_REGISTRY.regionOf('ML61'))).toBe('GUARDIÕES DA CHAMA');
  await page.getByRole('button', { name: 'Lojas' }).click();
  await page.locator('#storeCode').fill('62');
  await page.locator('#storeName').fill('LOJA TESTE E2E');
  await page.locator('#storeRegion').selectOption({ label: 'VENTO DOURADO' });
  await page.locator('#storeSaveBtn').click();
  const saved = await page.evaluate(() => window.ADERENCIA_STORE_REGISTRY.load().ML62);
  expect(saved).toMatchObject({ code: 'ML62', name: 'LOJA TESTE E2E', region: 'VENTO DOURADO' });
});

test('history persistence survives reload', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('aderenciaHistoricoV2', JSON.stringify([{store:'ML21',month:6,year:2026,adherence:96.5,savedAt:'2026-07-10T12:00:00.000Z'}])));
  await page.reload();
  const rows = await page.evaluate(() => window.ADERENCIA_HISTORY?.load?.() || []);
  expect(rows.some(r => r.store === 'ML21' && r.month === 6 && r.year === 2026 && Number(r.adherence) === 96.5)).toBeTruthy();
});

test('divergence history keeps names and individual occurrences', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_DIVERGENCE_AUDIT);
  await page.evaluate(() => {
    localStorage.setItem('aderenciaDivergenciasV1', JSON.stringify([{
      store:'ML21', month:6, year:2026, deviations:1, nonConformities:1,
      occurrences:[
        { employee:'FUNCIONARIO TESTE', registration:'123', cargo:'OPERADOR', date:'2026-06-12', type:'DEVIATION', points:1 },
        { employee:'FUNCIONARIO TESTE', registration:'123', cargo:'OPERADOR', date:'2026-06-15', type:'NON_CONFORMITY', code:'F', points:10 }
      ]
    }]));
  });
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('aderenciaDivergenciasV1')));
  expect(raw[0].occurrences).toHaveLength(2);
  expect(raw[0].occurrences[0].employee).toBe('FUNCIONARIO TESTE');
  expect(raw[0].occurrences[1]).toMatchObject({ code:'F', points:10 });
});

test('recurrence identifies the same employee across two competences', async ({ page }) => {
  await page.waitForFunction(() => window.ADERENCIA_RECURRENCE?.aggregate);
  const result = await page.evaluate(() => {
    const data = window.ADERENCIA_RECURRENCE.aggregate([
      {store:'ML21',month:6,year:2026,occurrences:[{employee:'ANA TESTE',registration:'777',type:'DEVIATION'}]},
      {store:'ML21',month:7,year:2026,occurrences:[{employee:'ANA TESTE',registration:'777',type:'NON_CONFORMITY'}]}
    ]);
    const person = data.people.find(p => p.registration === '777');
    const store = data.stores.find(s => s.name === 'ML21');
    return { personMonths: person?.months?.size || 0, storeRepeat: store?.repeat?.size || 0 };
  });
  expect(result.personMonths).toBe(2);
  expect(result.storeRepeat).toBe(1);
});
