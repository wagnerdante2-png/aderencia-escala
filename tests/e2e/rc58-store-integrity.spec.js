const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_STORE_INTEGRITY && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.XLSX);
}

async function makeWorkbook(page,{gridStores=['ML10'],fileStore='ML10',ctxStore='ML10',includeConfig=false}={}){
  return page.evaluate(async ({gridStores,fileStore,ctxStore,includeConfig}) => {
    const dates=Array.from({length:21},(_,i)=>`${String(11+i).padStart(2,'0')}/07/2026`);
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const grid=store=>[
      [`ESCALA OPERACIONAL | ${store}`],
      ['Empregado','Cargo',...dates],
      ...employees.map(name=>[name,'OPERADOR',...dates.map(()=> 'T1')]),
      ['T1 | 08:00 às 17:00']
    ];
    const wb=XLSX.utils.book_new();
    gridStores.forEach((store,i)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(grid(store)),`Grade ${store} ${i+1}`));
    if(includeConfig)XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['LOJAS DE REFERÊNCIA'],['ML11'],['ML12'],['ML13']]),'Configuração');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],`Escala ${fileStore}.xlsx`);
    const ctx={store:ctxStore,start:'2026-07-11',end:'2026-08-10'};
    const preflight=await window.ADERENCIA_SCHEDULE_STORE_INTEGRITY.preflight(file,ctx);
    let publicResult=null;
    if(preflight){
      try{
        await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,ctx);
        publicResult={accepted:true};
      }catch(e){
        publicResult={accepted:false,code:e.code||null,fatal:e.aderenciaFatal===true,message:String(e.message)};
      }
    }
    return {
      preflight:preflight?{code:preflight.code,fatal:preflight.aderenciaFatal===true,message:String(preflight.message)}:null,
      scan:window.ADERENCIA_SCHEDULE_STORE_INTEGRITY.lastScan,
      publicResult
    };
  },{gridStores,fileStore,ctxStore,includeConfig});
}

test('RC58 store integrity ignores store references in non-operational configuration sheets', async ({ page }) => {
  await openApp(page);
  const result=await makeWorkbook(page,{gridStores:['ML10'],fileStore:'ML10',ctxStore:'ML10',includeConfig:true});
  expect(result.preflight).toBeNull();
  expect(result.scan.operationalSheets).toEqual(['Grade ML10 1']);
  expect(result.scan.stores).toEqual(['ML10']);
  expect(result.scan.foreign).toEqual([]);
  expect(result.scan.ambiguous).toBeFalsy();
});

test('RC58 store integrity tolerates one stale template store when validated file and point context agree', async ({ page }) => {
  await openApp(page);
  const result=await makeWorkbook(page,{gridStores:['ML01'],fileStore:'ML08',ctxStore:'ML08'});
  expect(result.preflight).toBeNull();
  expect(result.scan.operationalSheets).toEqual(['Grade ML01 1']);
  expect(result.scan.declaredOperationalStores).toEqual(['ML01']);
  expect(result.scan.filenameStores).toEqual(['ML08']);
  expect(result.scan.foreign).toContain('ML01');
  expect(result.scan.crossGridConflict).toBeFalsy();
  expect(result.scan.ambiguous).toBeFalsy();
});

test('RC58 store integrity blocks different stores across operational grids before fallback', async ({ page }) => {
  await openApp(page);
  const result=await makeWorkbook(page,{gridStores:['ML10','ML11'],fileStore:'ML10',ctxStore:'ML10'});
  expect(result.preflight.code).toBe('ADERENCIA_AMBIGUOUS_SCHEDULE_STORE');
  expect(result.preflight.fatal).toBeTruthy();
  expect(result.preflight.message).toContain('ML10');
  expect(result.preflight.message).toContain('ML11');
  expect(result.scan.operationalSheets).toEqual(['Grade ML10 1','Grade ML11 2']);
  expect(result.scan.declaredOperationalStores).toEqual(expect.arrayContaining(['ML10','ML11']));
  expect(result.scan.crossGridConflict).toBeTruthy();
  expect(result.scan.ambiguous).toBeTruthy();
  expect(result.publicResult.accepted).toBeFalsy();
  expect(result.publicResult.code).toBe('ADERENCIA_AMBIGUOUS_SCHEDULE_STORE');
  expect(result.publicResult.fatal).toBeTruthy();
});

test('RC58 store integrity blocks an explicit foreign store in the schedule filename', async ({ page }) => {
  await openApp(page);
  const result=await makeWorkbook(page,{gridStores:['ML10'],fileStore:'ML11',ctxStore:'ML10'});
  expect(result.preflight.code).toBe('ADERENCIA_AMBIGUOUS_SCHEDULE_STORE');
  expect(result.preflight.fatal).toBeTruthy();
  expect(result.scan.filenameForeign).toEqual(['ML11']);
  expect(result.scan.crossGridConflict).toBeFalsy();
  expect(result.scan.ambiguous).toBeTruthy();
  expect(result.publicResult.accepted).toBeFalsy();
  expect(result.publicResult.code).toBe('ADERENCIA_AMBIGUOUS_SCHEDULE_STORE');
});
