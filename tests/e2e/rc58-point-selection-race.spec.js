const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_POINT_STORE_INTEGRITY?.raceVersion === 'RC58.5' && window.ADERENCIA_ENGINE?.version === 'v4-rc56-resilient' && !!window.jspdf?.jsPDF);
}

async function pointPdf(page,store,name='ANA TESTE',registration='1'){
  return page.evaluate(({store,name,registration})=>{
    const { jsPDF }=window.jspdf,pdf=new jsPDF();pdf.setFontSize(10);
    const lines=[
      'Espelho do Ponto 11/07/2026 - 10/08/2026',
      `Matrícula: ${registration} Nome: ${name} Chapa: ${registration} Admissão: 01/01/2020`,
      'Função: 1 - OPERADOR DE LOJA I C.C. 1',
      `Departamento: LOJA ${store}`,
      'Data Dia 1a E.',
      '11/07/2026 SAB 08:00 O 12:00 I 13:00 O 17:00 I',
      'Horários'
    ];
    lines.forEach((line,i)=>pdf.text(line,10,15+i*7));
    return Array.from(new Uint8Array(pdf.output('arraybuffer')));
  },{store,name,registration});
}

async function selectPoint(page,bytes,name){
  await page.evaluate(({bytes,name})=>{
    const file=new File([new Uint8Array(bytes)],name,{type:'application/pdf'}),dt=new DataTransfer();dt.items.add(file);
    const input=document.getElementById('pointFile');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  },{bytes,name});
}

test('RC58.5 invalida imediatamente o ponto anterior enquanto valida a nova seleção', async ({page})=>{
  await openApp(page);
  await selectPoint(page,await pointPdf(page,'ML10'),'primeiro.pdf');
  await page.waitForFunction(()=>window.ADERENCIA_ENGINE.point?.store==='ML10'&&!window.ADERENCIA_POINT_STORE_INTEGRITY.busy);

  const next=await pointPdf(page,'ML11','BIA TESTE','2');
  const immediate=await page.evaluate(({bytes})=>{
    const file=new File([new Uint8Array(bytes)],'segundo.pdf',{type:'application/pdf'}),dt=new DataTransfer();dt.items.add(file);
    const input=document.getElementById('pointFile');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    return {
      point:window.ADERENCIA_ENGINE.point,
      context:window.ADERENCIA_POINT_CONTEXT,
      busy:window.ADERENCIA_POINT_STORE_INTEGRITY.busy,
      disabled:input.disabled,
      calcDisabled:document.getElementById('calculateBtn').disabled
    };
  },{bytes:next});

  expect(immediate.point).toBeNull();
  expect(immediate.context).toEqual({store:null,start:null,end:null});
  expect(immediate.busy).toBeTruthy();
  expect(immediate.disabled).toBeTruthy();
  expect(immediate.calcDisabled).toBeTruthy();

  await page.waitForFunction(()=>window.ADERENCIA_ENGINE.point?.store==='ML11'&&!window.ADERENCIA_POINT_STORE_INTEGRITY.busy);
  const final=await page.evaluate(()=>({store:window.ADERENCIA_ENGINE.point?.store,disabled:document.getElementById('pointFile').disabled,last:window.ADERENCIA_POINT_STORE_INTEGRITY.last}));
  expect(final.store).toBe('ML11');
  expect(final.disabled).toBeFalsy();
  expect(final.last.source).toBe('segundo.pdf');
});

test('RC58.5 ignora validação antiga quando duas mudanças são disparadas na mesma janela assíncrona', async ({page})=>{
  await openApp(page);
  const first=await pointPdf(page,'ML10','ANA TESTE','1'),second=await pointPdf(page,'ML11','BIA TESTE','2');
  const immediate=await page.evaluate(({first,second})=>{
    const input=document.getElementById('pointFile');
    const fire=(bytes,name)=>{const f=new File([new Uint8Array(bytes)],name,{type:'application/pdf'}),dt=new DataTransfer();dt.items.add(f);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))};
    fire(first,'corrida-antiga.pdf');
    const afterFirst={selection:window.ADERENCIA_POINT_STORE_INTEGRITY.selection,point:window.ADERENCIA_ENGINE.point};
    fire(second,'corrida-nova.pdf');
    return {afterFirst,selection:window.ADERENCIA_POINT_STORE_INTEGRITY.selection,point:window.ADERENCIA_ENGINE.point,busy:window.ADERENCIA_POINT_STORE_INTEGRITY.busy};
  },{first,second});

  expect(immediate.afterFirst.selection).toBeGreaterThan(0);
  expect(immediate.selection).toBe(immediate.afterFirst.selection+1);
  expect(immediate.point).toBeNull();
  expect(immediate.busy).toBeTruthy();

  await page.waitForFunction(()=>window.ADERENCIA_ENGINE.point?.store==='ML11'&&!window.ADERENCIA_POINT_STORE_INTEGRITY.busy);
  const final=await page.evaluate(()=>({store:window.ADERENCIA_ENGINE.point?.store,last:window.ADERENCIA_POINT_STORE_INTEGRITY.last,selection:window.ADERENCIA_POINT_STORE_INTEGRITY.selection}));
  expect(final.store).toBe('ML11');
  expect(final.last.source).toBe('corrida-nova.pdf');
  expect(final.last.selection).toBe(final.selection);
});
