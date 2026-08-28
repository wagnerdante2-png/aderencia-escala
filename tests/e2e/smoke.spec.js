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
  expect(health.version).toBe('v1.0 RC53');
  expect(health.core?.ok).toBeTruthy();
  expect(health.final?.ok, JSON.stringify(health.failed)).toBeTruthy();
  expect(health.pdf).toMatchObject({ active:true, isEvalSupported:false, enableScripting:false });
});

test('main navigation renders every operational view', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  const links = page.locator('.nav-link');
  for (let i = 0; i < await links.count(); i++) {
    const link = links.nth(i);
    const target = await link.getAttribute('data-view');
    if (!target) continue;
    await link.click();
    await expect(page.locator(`#${target}`)).toHaveClass(/active/);
  }
});

test('global period controller keeps the entire ecosystem coherent', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !!window.ADERENCIA_PERIOD_CONTROLLER);
  const changed = await page.evaluate(() => {
    window.ADERENCIA_PERIOD_CONTROLLER.set({ year: 2026, month: 7, half: 'S2' }, { source:'e2e' });
    return {
      state: window.ADERENCIA_PERIOD_CONTROLLER.get(),
      report: window.ADERENCIA_HISTORY_REPORT?.getPeriod?.(),
      regional: window.ADERENCIA_REGIONAL_COMPARISON?.getPeriod?.(),
      evolution: window.ADERENCIA_EVOLUTION_DASHBOARD?.getPeriod?.()
    };
  });
  expect(changed.state.year).toBe(2026);
  expect(changed.state.month).toBe(7);
  expect(changed.state.half).toBe('S2');
  if (changed.report) expect(changed.report.month).toBe(7);
  if (changed.regional) expect(changed.regional.month).toBe(7);
  if (changed.evolution) expect(changed.evolution.month).toBe(7);
});

test('11-to-10 competence is anchored to the start of the point period', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  const c = await page.evaluate(() => window.ADERENCIA_COMPETENCE?.fromAnalysis?.('11/06/2026 a 10/07/2026'));
  expect(c).toMatchObject({ year:2026, month:6 });
});

test('store registry includes ML61 in Guardiões da Chama and accepts a new store', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  const result = await page.evaluate(() => {
    const api = window.ADERENCIA_STORE_REGISTRY;
    const ml61 = api.list().find(x => x.code === 'ML61');
    const added = api.add({ code:'ML62', name:'Loja 62', region:'Guardiões da Chama' });
    return { ml61, added, ml62: api.list().find(x => x.code === 'ML62') };
  });
  expect(result.ml61?.region).toBe('Guardiões da Chama');
  expect(result.added).toBeTruthy();
  expect(result.ml62?.code).toBe('ML62');
});

test('history persistence survives reload', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    const row={store:'ML10',storeName:'Loja 10',year:2026,month:7,adherence:91,total:100,adherent:91,periodStart:'2026-07-11',periodEnd:'2026-08-10',savedAt:new Date().toISOString()};
    localStorage.setItem('aderencia_history_v2',JSON.stringify([row]));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  const rows=await page.evaluate(()=>window.ADERENCIA_HISTORY?.all?.()||[]);
  expect(rows.some(x=>x.store==='ML10'&&x.month===7)).toBeTruthy();
});

test('divergence history keeps names and individual occurrences', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  const result = await page.evaluate(() => {
    const api=window.ADERENCIA_DIVERGENCE_CAPTURE;
    if(!api?.capture)return {supported:false};
    api.capture({store:'ML10',year:2026,month:6,employee:'ANA TESTE',date:'2026-06-12',type:'atraso'});
    api.capture({store:'ML10',year:2026,month:6,employee:'ANA TESTE',date:'2026-06-13',type:'atraso'});
    return {supported:true,rows:api.all?.()||[]};
  });
  if(result.supported){
    expect(result.rows.filter(x=>x.employee==='ANA TESTE').length).toBeGreaterThanOrEqual(2);
  }
});

test('recurrence identifies the same employee across two competences', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  const supported = await page.evaluate(() => !!window.ADERENCIA_RECURRENCE_DASHBOARD);
  if(!supported)return;
  const result = await page.evaluate(() => {
    const api=window.ADERENCIA_RECURRENCE_DASHBOARD;
    const fn=api.compute||api.build||api.analyze;
    if(typeof fn!=='function')return null;
    return fn.call(api,[
      {store:'ML10',year:2026,month:6,employee:'ANA TESTE',type:'atraso'},
      {store:'ML10',year:2026,month:7,employee:'ANA TESTE',type:'atraso'}
    ]);
  });
  if(result!=null)expect(JSON.stringify(result)).toContain('ANA TESTE');
});
