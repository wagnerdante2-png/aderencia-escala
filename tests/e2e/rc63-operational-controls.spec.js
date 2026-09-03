const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_OPERATIONAL_FLAGS && window.ADERENCIA_SCAN_GRID_RC63 && window.ADERENCIA_HISTORY);
}

test('RC63 seeds ML24 reconstruction exceptions and keeps ML04 permanently inactive', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => {
    const api=window.ADERENCIA_OPERATIONAL_FLAGS;
    return {
      ml04:api.isInactive('ML04'),
      june:api.get('ML24',6,2026),
      july:api.get('ML24',7,2026),
      juneScore:api.score({store:'ML24',month:6,year:2026,adherence:12}),
      normalScore:api.score({store:'ML10',month:6,year:2026,adherence:91.36})
    };
  });
  expect(r.ml04).toBeTruthy();
  expect(r.june.exception).toBeTruthy();
  expect(r.july.exception).toBeTruthy();
  expect(r.june.exceptionReason).toContain('sinistro');
  expect(Number.isNaN(r.juneScore)).toBeTruthy();
  expect(r.normalScore).toBeCloseTo(91.36,2);
});

test('late shipment and sampling certification create badges without changing adherence score', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    const api=window.ADERENCIA_OPERATIONAL_FLAGS;
    api.set({store:'ML10',month:6,year:2026,late:true,certified:true});
    localStorage.setItem('aderenciaHistoricoV2',JSON.stringify([
      {store:'ML10',month:6,year:2026,adherence:96.25,savedAt:'2026-07-10T10:00:00.000Z'},
      {store:'ML04',month:6,year:2026,adherence:99.99,savedAt:'2026-07-10T10:00:00.000Z'},
      {store:'ML24',month:6,year:2026,adherence:20,savedAt:'2026-07-10T10:00:00.000Z'}
    ]));
    window.ADERENCIA_HISTORY.notify();
  });
  await page.getByRole('button',{name:'Monitoramento'}).click();
  await page.locator('#monitorMonth').selectOption('6');
  await page.locator('#monitorYear').selectOption('2026');
  await page.waitForTimeout(180);
  const ml10=page.locator('#monitorGrid .monitor-card').filter({hasText:'ML10'});
  const ml04=page.locator('#monitorGrid .monitor-card').filter({hasText:'ML04'});
  const ml24=page.locator('#monitorGrid .monitor-card').filter({hasText:'ML24'});
  await expect(ml10).toContainText('96,25%');
  await expect(ml10).toContainText('ENVIO APÓS O PRAZO');
  await expect(ml10).toContainText('CERTIFICADO POR AMOSTRAGEM');
  await expect(ml04).toContainText('INATIVA');
  await expect(ml04).not.toContainText('99,99%');
  await expect(ml24).toContainText('EXCEÇÃO');
  await expect(ml24).not.toContainText('20,00%');
  await expect(page.locator('#monWithData')).toHaveText('1');
  await expect(page.locator('#monMissing')).toHaveText('58');
});

test('Tratativas modal selects store and competence through dropdowns', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button',{name:'Tratativas'}).click();
  await page.locator('#opStore').selectOption('ML21');
  await page.locator('#opMonth').selectOption('8');
  await page.locator('#opYear').selectOption('2026');
  await page.locator('#opLate').check();
  await page.locator('#opCertified').check();
  await page.locator('#opSave').click();
  const r=await page.evaluate(()=>window.ADERENCIA_OPERATIONAL_FLAGS.get('ML21',8,2026));
  expect(r).toMatchObject({store:'ML21',month:8,year:2026,late:true,certified:true,exception:false});
});

test('ML04 controls are locked in the operational modal', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button',{name:'Tratativas'}).click();
  await page.locator('#opStore').selectOption('ML04');
  await expect(page.locator('#opInactiveNote')).toBeVisible();
  await expect(page.locator('#opException')).toBeDisabled();
  await expect(page.locator('#opLate')).toBeDisabled();
  await expect(page.locator('#opCertified')).toBeDisabled();
});

test('RC63 normalizes common scan OCR codes conservatively', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>{
    const a=window.ADERENCIA_SCAN_GRID_RC63;
    return {
      t18a:a.scanCode('718'),
      t18b:a.scanCode('TI8'),
      t13:a.scanCode('13'),
      t6:a.scanCode('TG'),
      folga:a.scanCode('DF!'),
      month:a.monthYear('ESCALA OPERACIONAL LOJA 45 Junho 2026'),
      surname:a.monthYear('LUCAS MARCOLINO Julho 2026')
    };
  });
  expect(r.t18a).toBe('T18');
  expect(r.t18b).toBe('T18');
  expect(r.t13).toBe('T13');
  expect(r.t6).toBe('T6');
  expect(r.folga).toBe('F');
  expect(r.month).toEqual({month:5,year:2026});
  expect(r.surname).toEqual({month:6,year:2026});
});

test('RC63 reconstructs regular scanned grid geometry without OCR day numbers', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=1000;c.height=650;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#111';x.lineWidth=2;
    const top=120,rowGap=18,left=270,colGap=21;
    for(let i=0;i<27;i++){const y=top+i*rowGap;x.beginPath();x.moveTo(10,y);x.lineTo(900,y);x.stroke()}
    for(let i=0;i<32;i++){const xx=left+i*colGap;x.beginPath();x.moveTo(xx,top);x.lineTo(xx,top+26*rowGap);x.stroke()}
    const g=window.ADERENCIA_SCAN_GRID_RC63.geometry(c);
    return g?{h:g.hLines.length,v:g.vLines.length,h0:g.hLines[0],v0:g.vLines[0],vgap:g.vLines[1]-g.vLines[0]}:null;
  });
  expect(r).not.toBeNull();
  expect(r.h).toBeGreaterThanOrEqual(20);
  expect(r.v).toBeGreaterThanOrEqual(30);
  expect(r.v0).toBeGreaterThan(250);
  expect(r.vgap).toBeGreaterThan(18);
});
