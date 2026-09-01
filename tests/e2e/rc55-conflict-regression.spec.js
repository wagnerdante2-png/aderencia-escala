const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_PARTIAL && !!window.ADERENCIA_SCHEDULE_CONFLICT_GUARD && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.ADERENCIA_SCHEDULE_PREPROCESS && !!window.XLSX);
}

async function conflictingFileResult(page, mode='normalize'){
  return page.evaluate(async ({mode}) => {
    const dates=Array.from({length:21},(_,i)=>`${String(11+i).padStart(2,'0')}/07/2026`);
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const build=(conflict=false)=>[
      ['Nome','Cargo',...dates],
      ...employees.map((name,i)=>[name,'OPERADOR',...dates.map((_,j)=>conflict&&i===0&&j===0?'F':'T1')]),
      ['T1 | 08:00 às 17:00']
    ];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(build(false)),'Grade A');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(build(true)),'Grade B');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10 conflitante.xlsx');
    if(mode==='event'){
      document.getElementById('pointStatus').textContent='Reconhecido: 5 funcionário(s) • ML10 • 1500 marcações';
      document.getElementById('metaPeriod').textContent='11/07/2026 a 10/08/2026';
      const input=document.getElementById('scheduleFile'),dt=new DataTransfer();
      dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      return {dispatched:true};
    }
    try{
      await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-07-11',end:'2026-08-10'});
      return {accepted:true,message:'',code:null,fatal:false,guard:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.last};
    }catch(e){
      return {accepted:false,message:String(e.message),code:e.code||null,fatal:e.aderenciaFatal===true,guard:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.last};
    }
  },{mode});
}

test('RC58 public normalization makes contradictory RC55 grids fatal across all fallbacks', async ({ page }) => {
  await openApp(page);
  const result=await conflictingFileResult(page,'normalize');
  expect(result.accepted).toBeFalsy();
  expect(result.code).toBe('ADERENCIA_CONFLICTING_SCHEDULE_GRIDS');
  expect(result.fatal).toBeTruthy();
  expect(result.guard?.blocked).toBeTruthy();
  expect(result.message).toContain('conflito entre grades');
  expect(result.message).toContain('ANA TESTE');
  expect(result.message).toContain('11/07/2026');
  expect(result.message).toContain('Grade A');
  expect(result.message).toContain('Grade B');
});

test('RC58 preprocess does not pass a fatally conflicting workbook to the main parser', async ({ page }) => {
  await openApp(page);
  await conflictingFileResult(page,'event');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_PREPROCESS?.last?.mode==='fatal-block');
  const state=await page.evaluate(() => ({
    preprocess:window.ADERENCIA_SCHEDULE_PREPROCESS.last,
    guard:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.last,
    status:document.getElementById('scheduleStatus')?.textContent||'',
    files:document.getElementById('scheduleFile')?.files?.length||0
  }));
  expect(state.preprocess.code).toBe('ADERENCIA_CONFLICTING_SCHEDULE_GRIDS');
  expect(state.guard?.blocked).toBeTruthy();
  expect(state.status).toContain('conflito entre grades');
  expect(state.files).toBe(0);
});
