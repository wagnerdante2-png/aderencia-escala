const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_PREPROCESS?.dynamicVersion === 'RC58.5' && !!window.XLSX);
}

async function inspectDynamic(page,{savedStore='ML32',ctxStore='ML32',ctxStart='2026-06-11',ctxEnd='2026-07-10',dynamic=true}={}){
  return page.evaluate(async ({savedStore,ctxStore,ctxStart,ctxEnd,dynamic}) => {
    const wb=XLSX.utils.book_new();
    const monthRows=Array.from({length:12},()=>[]);
    monthRows[0][1]=`${savedStore} - LOJA TESTE`;
    const start=new Date('2026-06-01T12:00:00');
    for(let i=0;i<31;i++){const d=new Date(start);d.setDate(start.getDate()+i);monthRows[7][4+i]=d}
    monthRows[9]=['','','NOME','CARGO','ANA TESTE','OPERADOR'];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(monthRows),'Escala Mensal');
    if(dynamic){
      const n=+savedStore.replace(/\D/g,'');
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['',n]]),'Consolidado');
      const timeline=Array.from({length:6},()=>[]);timeline[5][0]=n;
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(timeline),'Andar no Tempo');
    }
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Turno','Entrada','Saida'],['T1','07:00','16:00']]),'Configuração');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala - Novo Modelo - teste.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const ctx={store:ctxStore,start:ctxStart,end:ctxEnd};
    let error=null,projection=null;
    try{projection=await window.ADERENCIA_SCHEDULE_PREPROCESS.projectLargeWorkbook(file,ctx)}catch(e){error={code:e.code,fatal:e.aderenciaFatal===true,message:String(e.message),details:e.details||null}}
    const raw=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:true});
    const info=window.ADERENCIA_SCHEDULE_PREPROCESS.dynamicWorkbookInfo(raw);
    return {error,info,projection:projection?{projected:projection.projected,dynamic:projection.dynamic}:null};
  },{savedStore,ctxStore,ctxStart,ctxEnd,dynamic});
}

test('RC58 bloqueia XLSM dinâmico salvo para outra loja em vez de fabricar conciliação parcial', async ({ page }) => {
  await openApp(page);
  const r=await inspectDynamic(page,{savedStore:'ML32',ctxStore:'ML40'});
  expect(r.info.store).toBe('ML32');
  expect(r.error).toMatchObject({code:'ADERENCIA_DYNAMIC_WORKBOOK_STORE_MISMATCH',fatal:true});
  expect(r.error.message).toContain('ML32');
  expect(r.error.message).toContain('ML40');
  expect(r.error.message).toContain('não recalcula');
});

test('RC58 bloqueia ciclo 11→10 quando o cache mensal termina em 01/07', async ({ page }) => {
  await openApp(page);
  const r=await inspectDynamic(page,{savedStore:'ML32',ctxStore:'ML32',ctxStart:'2026-06-11',ctxEnd:'2026-07-10'});
  expect(r.info.coverage).toMatchObject({start:'2026-06-01',end:'2026-07-01',dates:31});
  expect(r.error).toMatchObject({code:'ADERENCIA_DYNAMIC_WORKBOOK_PERIOD_INCOMPLETE',fatal:true});
  expect(r.error.message).toContain('2026-07-01');
  expect(r.error.message).toContain('2026-07-10');
});

test('RC58 permite o modelo dinâmico quando loja e período estão integralmente materializados', async ({ page }) => {
  await openApp(page);
  const r=await inspectDynamic(page,{savedStore:'ML32',ctxStore:'ML32',ctxStart:'2026-06-11',ctxEnd:'2026-06-30'});
  expect(r.error).toBeNull();
  expect(r.projection.dynamic).toMatchObject({dynamic:true,store:'ML32',coverage:{start:'2026-06-01',end:'2026-07-01',dates:31}});
});

test('RC58 não aplica a trava de cache dinâmico a uma escala estática/exportada', async ({ page }) => {
  await openApp(page);
  const r=await inspectDynamic(page,{savedStore:'ML32',ctxStore:'ML40',dynamic:false});
  expect(r.info).toBeNull();
  expect(r.error).toBeNull();
});
