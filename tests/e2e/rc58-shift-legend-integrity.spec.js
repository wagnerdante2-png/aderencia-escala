const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_CONFLICT_GUARD?.version === 'RC58.2' && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.XLSX);
}

async function legendCase(page, secondDefinition){
  return page.evaluate(async ({secondDefinition}) => {
    const dates=Array.from({length:21},(_,i)=>`${String(11+i).padStart(2,'0')}/07/2026`);
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const grid=[
      ['ESCALA OPERACIONAL | ML10'],
      ['Nome','Cargo',...dates],
      ...employees.map(name=>[name,'OPERADOR',...dates.map(()=> 'T1')])
    ];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(grid),'Grade ML10');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['T1 | 08:00 às 17:00']]),'Legenda A');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([secondDefinition.split('|').map(x=>x.trim())]),'Legenda B');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10 legenda.xlsx');
    const ctx={store:'ML10',start:'2026-07-11',end:'2026-08-10'};
    const preflight=await window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.preflight(file,ctx);
    let publicResult=null;
    if(preflight){
      try{await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,ctx);publicResult={accepted:true}}
      catch(e){publicResult={accepted:false,code:e.code||null,fatal:e.aderenciaFatal===true,message:String(e.message),guard:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.last}}
    }
    return {preflight:preflight?{code:preflight.code,fatal:preflight.aderenciaFatal===true,message:String(preflight.message)}:null,scan:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.lastScan,publicResult};
  },{secondDefinition});
}

test('RC58 allows the same shift definition to be repeated across workbook sheets', async ({ page }) => {
  await openApp(page);
  const result=await legendCase(page,'T1 | 08:00 | 17:00');
  expect(result.preflight).toBeNull();
  expect(result.scan.conflict).toBeNull();
});

test('RC58 blocks contradictory shift legend definitions before every Excel fallback', async ({ page }) => {
  await openApp(page);
  const result=await legendCase(page,'T1 | 09:00 | 18:00');
  expect(result.preflight.code).toBe('ADERENCIA_CONFLICTING_SHIFT_LEGEND');
  expect(result.preflight.fatal).toBeTruthy();
  expect(result.preflight.message).toContain('T1');
  expect(result.preflight.message).toContain('08:00-17:00');
  expect(result.preflight.message).toContain('09:00-18:00');
  expect(result.preflight.message).toContain('Legenda A');
  expect(result.preflight.message).toContain('Legenda B');
  expect(result.scan.conflict.kind).toBe('legend');
  expect(result.publicResult.accepted).toBeFalsy();
  expect(result.publicResult.code).toBe('ADERENCIA_CONFLICTING_SHIFT_LEGEND');
  expect(result.publicResult.fatal).toBeTruthy();
  expect(result.publicResult.guard.blocked).toBeTruthy();
});
