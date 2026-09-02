const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58 && window.ADERENCIA_SCHEDULE_PREPROCESS && window.ADERENCIA_SCHEDULE_HARDENING && window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61 && window.XLSX);
}

test('RC58 source guard rejects a filename that explicitly identifies another store', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    const file=new File(['not-needed'],'Escala Operacional ML10.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    try{await window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58.inspect(file,{store:'ML11'});return{message:'',fatal:false}}
    catch(e){return{message:String(e.message),fatal:e.aderenciaFatal===true,code:e.code}}
  });
  expect(result.fatal).toBeTruthy();
  expect(result.code).toBe('ADERENCIA_SOURCE_IDENTITY');
  expect(result.message).toContain('ML10');
  expect(result.message).toContain('ML11');
});

test('RC58 source guard rejects a strong operational header when filename has no store', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['ESCALA OPERACIONAL | LOJA ML10'],
      ['Nome','Cargo','01/07/2026'],
      ['ANA TESTE','OPERADOR','T1']
    ]),'Escala Mensal');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala Operacional.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    try{await window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58.inspect(file,{store:'ML11'});return{message:'',fatal:false}}
    catch(e){return{message:String(e.message),fatal:e.aderenciaFatal===true}}
  });
  expect(result.fatal).toBeTruthy();
  expect(result.message).toContain('cabeçalho operacional');
  expect(result.message).toContain('ML10');
  expect(result.message).toContain('ML11');
});

test('RC58 accepts matching store in filename without being confused by weak template metadata', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    const file=new File(['x'],'Escala - Novo Modelo ML08.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    return window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58.inspect(file,{store:'ML08'});
  });
  expect(result).toMatchObject({mode:'filename-confirmed',expected:'ML08',store:'ML08'});
});

test('RC61 front door owns the original schedule event before the RC58 transaction fallback', async ({ page }) => {
  await openApp(page);
  await page.evaluate(()=>{
    document.getElementById('pointStatus').textContent='Reconhecido: 5 funcionário(s) • ML11 • 1200 marcações';
    document.getElementById('metaPeriod').textContent='11/06/2026 a 10/07/2026';
    document.getElementById('calculateBtn').disabled=false;
    document.getElementById('resultCard').classList.remove('hidden');
  });
  const bytes=await page.evaluate(()=>{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['ESCALA OPERACIONAL | LOJA ML10'],['Nome','Cargo'],['ANA TESTE','OPERADOR']]),'Escala Mensal');
    return Array.from(new Uint8Array(XLSX.write(wb,{bookType:'xlsx',type:'array'})));
  });
  await page.setInputFiles('#scheduleFile',{name:'Escala ML10.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(bytes)});
  await page.waitForFunction(()=>!window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61.busy && /^RC61:/.test(document.getElementById('scheduleStatus').textContent),{timeout:10000});
  const state=await page.evaluate(()=>({
    pre:window.ADERENCIA_SCHEDULE_PREPROCESS.last,
    disabled:document.getElementById('calculateBtn').disabled,
    hidden:document.getElementById('resultCard').classList.contains('hidden'),
    input:document.getElementById('scheduleFile').files?.[0]?.name,
    label:document.getElementById('scheduleFileName').textContent,
    status:document.getElementById('scheduleStatus').textContent
  }));
  expect(state.pre).toBeNull();
  expect(state.disabled).toBeTruthy();
  expect(state.hidden).toBeTruthy();
  expect(state.input).toBe('Escala ML10.xlsx');
  expect(state.label).toBe('Escala ML10.xlsx');
  expect(state.status).toContain('carregue primeiro um espelho de ponto reconhecido');
});

test('RC61 fails closed on a structurally invalid Excel instead of manufacturing a legacy core fallback', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61;
    const names=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELI TESTE'];
    const people=names.map((name,i)=>({id:String(i+1),registration:String(i+1),name,plans:[]}));
    const point={ctx:{store:'ML11',start:'2026-06-11',end:'2026-07-10'},people,byReg:new Map(people.map(p=>[p.registration,p])),byName:new Map(people.map(p=>[p.name,p]))};
    const file=new File(['arquivo estruturalmente invalido'],'Escala ML11.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    try{
      await api.normalizeExcel(file,point);
      return {ok:true,message:''};
    }catch(e){
      return {ok:false,message:String(e?.message||e)};
    }
  });
  expect(result.ok).toBeFalsy();
  expect(result.message).toBeTruthy();
});
