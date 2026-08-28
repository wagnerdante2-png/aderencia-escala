const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_REPORTING_RC51 && !!document.getElementById('regionalCompareTab'));
}

test('June periodStart is classified in first semester even when stored month is July', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    window.ADERENCIA_HISTORY.saveAll([{store:'ML01',month:7,year:2026,adherence:90.28,periodStart:'2026-06-11',periodEnd:'2026-07-10',competenceRule:'POINT_PERIOD_START',savedAt:'2026-08-28T12:00:00.000Z'}]);
    const y=document.getElementById('semesterYear'); if(y){y.value='2026'}
    const r=document.getElementById('semesterRegion'); if(r){r.value='all'}
    const s=document.getElementById('semesterStore'); if(s){s.value='all'}
    window.ADERENCIA_REPORTING_RC51.renderSemester();
    const row=document.querySelector('#semesterTable .semester-row[data-store="ML01"]');
    return {first:document.getElementById('sem1Avg').textContent,second:document.getElementById('sem2Avg').textContent,cells:row?[...row.children].map(x=>x.textContent):[]};
  });
  expect(result.first).toBe('90,28%');
  expect(result.second).toBe('—');
  expect(result.cells[1]).toBe('90,28%');
  expect(result.cells[2]).toBe('—');
});

test('regional snapshot averages stores by configured region for selected month', async ({ page }) => {
  await openApp(page);
  const snap = await page.evaluate(() => {
    window.ADERENCIA_HISTORY.saveAll([
      {store:'ML01',month:6,year:2026,adherence:90,periodStart:'2026-06-11',savedAt:'2026-08-28T12:00:00.000Z'},
      {store:'ML02',month:6,year:2026,adherence:80,periodStart:'2026-06-11',savedAt:'2026-08-28T12:01:00.000Z'},
      {store:'ML06',month:6,year:2026,adherence:100,periodStart:'2026-06-11',savedAt:'2026-08-28T12:02:00.000Z'}
    ]);
    return window.ADERENCIA_REPORTING_RC51.regionalSnapshot(2026,6);
  });
  const chama=snap.regions.find(r=>r.name==='GUARDIÕES DA CHAMA');
  const luz=snap.regions.find(r=>r.name==='GUARDIÕES DA LUZ');
  expect(chama.count).toBe(2);
  expect(chama.value).toBe(85);
  expect(luz.count).toBe(1);
  expect(luz.value).toBe(100);
  expect(snap.mean).toBe(92.5);
});

test('Regionais tab follows global month and renders average reference line', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    window.ADERENCIA_HISTORY.saveAll([
      {store:'ML01',month:6,year:2026,adherence:90,periodStart:'2026-06-11',savedAt:'2026-08-28T12:00:00.000Z'},
      {store:'ML06',month:6,year:2026,adherence:96,periodStart:'2026-06-11',savedAt:'2026-08-28T12:01:00.000Z'},
      {store:'ML07',month:6,year:2026,adherence:88,periodStart:'2026-06-11',savedAt:'2026-08-28T12:02:00.000Z'}
    ]);
    window.ADERENCIA_PERIOD.set(6,2026,'test');
  });
  await page.click('#regionalCompareTab');
  await expect(page.locator('#regionalCompareTitle')).toContainText('Junho de 2026');
  await expect(page.locator('#regionalCompareChart .regional-ref-mean')).toHaveCount(1);
  expect(await page.locator('#regionalCompareChart .regional-bar').count()).toBe(3);
});
