const { test, expect } = require('@playwright/test');

async function ready(page){
  await page.goto('/');
  await page.waitForFunction(() => window.ADERENCIA_ENGINE_RC64 && window.ADERENCIA_MONTHLY_RC64 && window.ADERENCIA_OPERATIONAL_FLAGS && window.ADERENCIA_MONITOR_REPORT_RC63);
}

test('RC64 mantém 95% global e libera 92% somente para grade digitalizada controlada', async ({ page }) => {
  await ready(page);
  const state = await page.evaluate(() => {
    const E=window.ADERENCIA_ENGINE_RC64;
    const controlled={source:'pdf-ocr-controlled',controlledScan:true,scanMeta:{controlled:true},structuralCoverageFloor:.92};
    return {
      controlled925:E.coverageGate(.925,controlled),
      controlled919:E.coverageGate(.919,controlled),
      excel925:E.coverageGate(.925,{source:'excel'}),
      pdf925:E.coverageGate(.925,{source:'pdf'}),
      excel950:E.coverageGate(.95,{source:'excel'})
    };
  });
  expect(state.controlled925).toEqual({ok:true,floor:.92});
  expect(state.controlled919).toEqual({ok:false,floor:.92});
  expect(state.excel925).toEqual({ok:false,floor:.95});
  expect(state.pdf925).toEqual({ok:false,floor:.95});
  expect(state.excel950).toEqual({ok:true,floor:.95});
});

test('RC64 preserva proveniência PDF/OCR no workbook sintético e não confia no XLSX sozinho', async ({ page }) => {
  await ready(page);
  const state = await page.evaluate(() => {
    const dates=Array.from({length:20},(_,i)=>`${String(i+1).padStart(2,'0')}/06/2026`);
    const aoa=[
      ['ESCALA OPERACIONAL | LOJA 45','ML45'],
      ['RC63_META','scan=1','controlled=1','coverage=0.925000','identity=0.900000','maxRowMissing=0.100000','maxColMissing=0.100000','maxRun=2'],
      ['RC63 grade digitalizada • cobertura 92,5% • parcial controlada'],
      ['Nome','Cargo',...dates],
      ['ANA TESTE','OPERADOR DE LOJA',...Array(20).fill('T1')],
      [],['LEGENDA DE TURNOS'],['T1 | 08:00 às 17:00']
    ];
    const ws=XLSX.utils.aoa_to_sheet(aoa),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Escala Ponto');
    const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    const runtime={source:'pdf-ocr-controlled',store:'ML45',coverage:.925,controlled:true,structuralCoverageFloor:.92,distributionSafe:true,identityRatio:.9,blankRows:0,blankCols:0,maxRowMissing:.1,maxColMissing:.1,maxRun:2};
    const controlled=window.ADERENCIA_ENGINE_RC64.parseScheduleWorkbook(bytes,runtime);
    const userXlsx=window.ADERENCIA_ENGINE_RC64.parseScheduleWorkbook(bytes,null);
    return {
      controlledSource:controlled.source,
      controlledScan:controlled.controlledScan,
      floor:controlled.structuralCoverageFloor,
      label:window.ADERENCIA_ENGINE_RC64.sourceLabel(controlled.source),
      userSource:userXlsx.source,
      userControlled:userXlsx.controlledScan,
      userFloor:userXlsx.structuralCoverageFloor
    };
  });
  expect(state).toEqual({
    controlledSource:'pdf-ocr-controlled',
    controlledScan:true,
    floor:.92,
    label:'PDF digitalizado + OCR',
    userSource:'excel',
    userControlled:false,
    userFloor:.95
  });
});

test('aba Mensal regionaliza 2026, respeita tratativas e mantém relatório RC63.3', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const rows=[
      {store:'ML01',month:1,year:2026,adherence:90.28,bonus:false,savedAt:'2026-02-01T00:00:00Z',periodStart:'2026-01-11'},
      {store:'ML01',month:6,year:2026,adherence:92.04,bonus:false,savedAt:'2026-07-01T00:00:00Z',periodStart:'2026-06-11'},
      {store:'ML02',month:1,year:2026,adherence:88.03,bonus:false,savedAt:'2026-02-01T00:00:00Z',periodStart:'2026-01-11'},
      {store:'ML02',month:6,year:2026,adherence:95.56,bonus:false,savedAt:'2026-07-01T00:00:00Z',periodStart:'2026-06-11'},
      {store:'ML21',month:6,year:2026,adherence:80,bonus:false,savedAt:'2026-07-01T00:00:00Z',periodStart:'2026-06-11'},
      {store:'ML24',month:6,year:2026,adherence:99,bonus:false,savedAt:'2026-07-01T00:00:00Z',periodStart:'2026-06-11'},
      {store:'ML24',month:7,year:2026,adherence:99,bonus:false,savedAt:'2026-08-01T00:00:00Z',periodStart:'2026-07-11'}
    ];
    localStorage.setItem('aderenciaHistoricoV2',JSON.stringify(rows));
  });
  await page.reload();
  await page.waitForFunction(() => window.ADERENCIA_MONTHLY_RC64 && document.getElementById('monthlyTab'));
  await page.click('#monthlyTab');
  await page.selectOption('#monthlyYear','2026');
  await page.waitForSelector('#monthlyRegionalTable .monthly-store-row[data-store="ML01"]');

  await expect(page.locator('#monthlyTab')).toHaveText('Mensal');
  await expect(page.locator('tr[data-store="ML01"] td[data-month="1"]')).toHaveText('90,28%');
  await expect(page.locator('tr[data-store="ML01"] td[data-month="6"]')).toHaveText('92,04%');
  await expect(page.locator('tr[data-store="ML01"] td.annual')).toHaveText('91,16%');
  await expect(page.locator('tr[data-store="ML04"] td[data-month="1"]')).toHaveText('INATIVA');
  await expect(page.locator('tr[data-store="ML24"] td[data-month="6"]')).toHaveText('EXCEÇÃO');
  await expect(page.locator('tr[data-store="ML24"] td[data-month="7"]')).toHaveText('EXCEÇÃO');
  await expect(page.locator('tr[data-store="ML03"] td[data-month="2"]')).toHaveText('—');

  const snap = await page.evaluate(() => {
    const s=window.ADERENCIA_MONTHLY_RC64.snapshot(2026,'all');
    const chama=s.groups.find(g=>g.name==='GUARDIÕES DA CHAMA');
    const vento=s.groups.find(g=>g.name==='VENTO DOURADO');
    window.ADERENCIA_OPERATIONAL_FLAGS.set({store:'ML24',month:6,year:2026,exception:true,exceptionReason:'Teste RC64',late:true,certified:true});
    const report=window.ADERENCIA_MONITOR_REPORT_RC63.state('ML24',6,2026,{store:'ML24',month:6,year:2026,adherence:99});
    const inactive=window.ADERENCIA_MONITOR_REPORT_RC63.state('ML04',6,2026,null);
    return {
      chamaJan:chama.monthly[0],chamaJun:chama.monthly[5],chamaAnnual:chama.annual,
      ventoJun:vento.monthly[5],
      reportVersion:window.ADERENCIA_MONITOR_REPORT_RC63.version,
      reportKind:report.kind,reportLate:report.flag.late,reportCertified:report.flag.certified,
      inactiveKind:inactive.kind,inactiveLabel:inactive.label,
      meanRows:document.querySelectorAll('#monthlyRegionalTable .monthly-region-average').length,
      regionRows:document.querySelectorAll('#monthlyRegionalTable .monthly-region-heading').length
    };
  });
  expect(snap.chamaJan).toBeCloseTo(89.155,5);
  expect(snap.chamaJun).toBeCloseTo(93.8,5);
  expect(snap.chamaAnnual).toBeCloseTo(91.4775,5);
  expect(snap.ventoJun).toBeCloseTo(80,5);
  expect(snap.meanRows).toBe(snap.regionRows);
  expect(snap.reportVersion).toBe('RC63.3');
  expect(snap.reportKind).toBe('exception');
  expect(snap.reportLate).toBe(true);
  expect(snap.reportCertified).toBe(true);
  expect(snap.inactiveKind).toBe('inactive');
  expect(snap.inactiveLabel).toBe('INATIVA');
});
