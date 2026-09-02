const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58 && window.ADERENCIA_SCHEDULE_PREPROCESS && window.ADERENCIA_SCHEDULE_HARDENING && window.XLSX);
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

test('RC58 preprocess blocks fatal store mismatch instead of sending it to core fallback', async ({ page }) => {
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
  await page.waitForFunction(()=>window.ADERENCIA_SCHEDULE_PREPROCESS.last?.mode==='blocked',{timeout:10000});
  const state=await page.evaluate(()=>({
    pre:window.ADERENCIA_SCHEDULE_PREPROCESS.last,
    disabled:document.getElementById('calculateBtn').disabled,
    hidden:document.getElementById('resultCard').classList.contains('hidden'),
    input:document.getElementById('scheduleFile').files?.[0]?.name,
    label:document.getElementById('scheduleFileName').textContent,
    status:document.getElementById('scheduleStatus').textContent
  }));
  expect(state.pre.fatal).toBeTruthy();
  expect(state.pre.errorCode).toBe('ADERENCIA_SOURCE_IDENTITY');
  expect(state.disabled).toBeTruthy();
  expect(state.hidden).toBeTruthy();
  expect(state.input).toBe('Escala ML10.xlsx');
  expect(state.label).toBe('Escala ML10.xlsx');
  expect(state.status).toContain('RC58');
});

test('RC58 keeps structural failures recoverable through the core fallback', async ({ page }) => {
  await openApp(page);
  await page.evaluate(()=>{
    document.getElementById('pointStatus').textContent='Reconhecido: 5 funcionário(s) • ML11 • 1200 marcações';
    document.getElementById('metaPeriod').textContent='11/06/2026 a 10/07/2026';
  });
  await page.setInputFiles('#scheduleFile',{name:'Escala ML11.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('arquivo estruturalmente invalido')});
  await page.waitForFunction(()=>window.ADERENCIA_SCHEDULE_PREPROCESS.last?.source==='Escala ML11.xlsx',{timeout:10000});
  const pre=await page.evaluate(()=>window.ADERENCIA_SCHEDULE_PREPROCESS.last);
  expect(pre.mode).toBe('core-fallback');
  expect(pre.fatal).toBeFalsy();
});
