const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_PREPROCESS?.projectionVersion === 'RC58.4' && window.ADERENCIA_SCHEDULE_CONFLICT_GUARD?.catalogVersion === 'RC58.3' && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.XLSX);
}

test('RC58 projeta XLSM grande sem levar abas massivas de BI para o pipeline da escala', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  const result=await page.evaluate(async () => {
    const dates=[];const d=new Date('2026-06-11T12:00:00');
    for(let i=0;i<30;i++){dates.push(new Date(d));d.setDate(d.getDate()+1)}
    const grid=[
      ['ESCALA OPERACIONAL | ML32'],
      ['Nome','Cargo',...dates],
      ...['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'].map(name=>[name,'OPERADOR',...dates.map(()=> 'T6')])
    ];
    const config=[
      ['','','','Turno','Entrada','Saida','Tipo'],
      ['','','','T6','10:00','19:00','INTERMEDIARIO'],
      [],[],[],
      ['','','','Turno','Entrada','Saída','Descrição de Turno','Regime'],
      ['','','','T6','13:00','22:00','T6 | 13:00 às 22:00','6X1']
    ];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(config),'Configuração');
    const massive=XLSX.utils.aoa_to_sheet(Array.from({length:6001},(_,i)=>[i,'BI']));
    XLSX.utils.book_append_sheet(wb,massive,'venda hora');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(grid),'Escala Mensal');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala - Novo Modelo - teste.xlsx');
    const started=performance.now();
    const projection=await window.ADERENCIA_SCHEDULE_PREPROCESS.projectLargeWorkbook(file);
    const elapsedProjection=performance.now()-started;
    const projectedWb=XLSX.read(await projection.file.arrayBuffer(),{type:'array',cellDates:true});
    const ctx={store:'ML32',start:'2026-06-11',end:'2026-07-10'};
    const preflight=await window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.preflight(projection.file,ctx);
    const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(projection.file,ctx);
    const out=XLSX.read(await normalized.arrayBuffer(),{type:'array'}),ws=out.Sheets['Escala Ponto']||out.Sheets[out.SheetNames[0]];
    const legend=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false}).flat().filter(v=>/^T\d+\s*\|/.test(String(v)));
    return {
      projected:projection.projected,
      selected:projection.selectedSheets?.map(x=>x.name)||[],
      excluded:projection.excludedSheets||[],
      projectedSheets:projectedWb.SheetNames,
      elapsedProjection,
      preflight:preflight?String(preflight.message):null,
      legend,
      resolution:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.lastResolution
    };
  });
  expect(result.projected).toBeTruthy();
  expect(result.selected).toContain('Configuração');
  expect(result.selected).toContain('Escala Mensal');
  expect(result.excluded).toContain('venda hora');
  expect(result.projectedSheets).not.toContain('venda hora');
  expect(result.preflight).toBeNull();
  expect(result.legend).toContain('T6 | 13:00 às 22:00');
  expect(result.legend).not.toContain('T6 | 10:00 às 19:00');
  expect(result.resolution.turns).toBeGreaterThanOrEqual(1);
  expect(result.elapsedProjection).toBeLessThan(15000);
});

test('RC58 reconhece dimensão massiva sem materializar a planilha inteira', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(() => {
    const fake={'!ref':'A1:G255457',A1:{t:'s',v:'dados'}};
    const started=performance.now();
    const size=window.ADERENCIA_SCHEDULE_PREPROCESS.sheetSize(fake);
    const relevant=window.ADERENCIA_SCHEDULE_PREPROCESS.looksRelevant(fake,'venda hora');
    return{size,relevant,elapsed:performance.now()-started};
  });
  expect(result.size).toMatchObject({rows:255457,cols:7});
  expect(result.relevant).toBeFalsy();
  expect(result.elapsed).toBeLessThan(1000);
});
