const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_POINT_STORE_INTEGRITY?.version === 'RC58.3' && window.ADERENCIA_ENGINE?.version === 'v4-rc56-resilient' && !!window.jspdf?.jsPDF);
}

async function pointPdf(page, stores){
  return page.evaluate(({stores}) => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(10);
    const lines = ['Espelho do Ponto 11/07/2026 - 13/07/2026'];
    stores.forEach((store,i) => {
      lines.push(`Matrícula: ${i+1} Nome: FUNCIONARIO ${i+1} Chapa: ${i+1} Admissão: 01/01/2020`);
      lines.push('Função: 1 - OPERADOR DE LOJA I C.C. 1');
      lines.push(`Departamento: LOJA ${store}`);
    });
    lines.forEach((line,i)=>pdf.text(line,10,15+i*7));
    return Array.from(new Uint8Array(pdf.output('arraybuffer')));
  },{stores});
}

async function pointPdfPeriods(page, periods){
  return page.evaluate(({periods}) => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(10);
    periods.forEach((period,index) => {
      if(index)pdf.addPage();
      const lines=[
        `Espelho do Ponto ${period}`,
        `Matrícula: ${index+1} Nome: FUNCIONARIO ${index+1} Chapa: ${index+1} Admissão: 01/01/2020`,
        'Função: 1 - OPERADOR DE LOJA I C.C. 1',
        'Departamento: LOJA ML10'
      ];
      lines.forEach((line,i)=>pdf.text(line,10,15+i*7));
    });
    return Array.from(new Uint8Array(pdf.output('arraybuffer')));
  },{periods});
}

async function duplicateDayPdf(page, secondMarks, secondRegistration='1'){
  return page.evaluate(({secondMarks,secondRegistration}) => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(10);
    const add=(registration,marks)=>{
      const lines=[
        'Espelho do Ponto 11/07/2026 - 10/08/2026',
        `Matrícula: ${registration} Nome: ANA TESTE Chapa: ${registration} Admissão: 01/01/2020`,
        'Função: 1 - OPERADOR DE LOJA I C.C. 1',
        'Departamento: LOJA ML10',
        'Data Dia 1a E.',
        `11/07/2026 SAB ${marks.map((m,i)=>`${m} ${i%2?'I':'O'}`).join(' ')}`,
        'Horários'
      ];
      lines.forEach((line,i)=>pdf.text(line,10,15+i*7));
    };
    add('1',['08:00','12:00','13:00','17:00']);
    pdf.addPage();
    add(secondRegistration,secondMarks);
    return Array.from(new Uint8Array(pdf.output('arraybuffer')));
  },{secondMarks,secondRegistration});
}

async function dispatchPoint(page,bytes,name){
  return page.evaluate(async ({bytes,name}) => {
    const file=new File([new Uint8Array(bytes)],name,{type:'application/pdf'}),dt=new DataTransfer();
    dt.items.add(file);
    const input=document.getElementById('pointFile');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    const limit=Date.now()+5000;
    while(Date.now()<limit){
      const last=window.ADERENCIA_POINT_STORE_INTEGRITY.last;
      if(last?.blocked||window.ADERENCIA_ENGINE.point||document.getElementById('pointStatus').textContent.startsWith('Erro:'))break;
      await new Promise(r=>setTimeout(r,25));
    }
    return {
      last:window.ADERENCIA_POINT_STORE_INTEGRITY.last,
      status:document.getElementById('pointStatus').textContent,
      files:input.files.length,
      enginePoint:window.ADERENCIA_ENGINE.point?{store:window.ADERENCIA_ENGINE.point.store,employees:window.ADERENCIA_ENGINE.point.employees.size}:null,
      context:window.ADERENCIA_POINT_CONTEXT
    };
  },{bytes,name});
}

test('RC58 aceita repetição da mesma loja nos campos Departamento/Lotação do espelho', async ({ page }) => {
  await openApp(page);
  const bytes=await pointPdf(page,['ML10','ML10','ML10']);
  const result=await page.evaluate(async ({bytes}) => {
    const file=new File([new Uint8Array(bytes)],'espelho-ml10.pdf',{type:'application/pdf'});
    return window.ADERENCIA_POINT_STORE_INTEGRITY.scan(file);
  },{bytes});
  expect(result.stores).toEqual(['ML10']);
  expect(result.periods).toEqual(['11/07/2026 - 13/07/2026']);
  expect(result.observations).toHaveLength(3);
});

test('RC58 bloqueia espelho que mistura lojas distintas e limpa o input antes do engine', async ({ page }) => {
  await openApp(page);
  const state=await dispatchPoint(page,await pointPdf(page,['ML10','ML10','ML11']),'espelho-misto.pdf');
  expect(state.last.blocked).toBeTruthy();
  expect(state.last.reason).toBe('stores');
  expect(state.last.stores.sort()).toEqual(['ML10','ML11']);
  expect(state.status).toContain('espelho mistura lojas');
  expect(state.files).toBe(0);
  expect(state.enginePoint).toBeNull();
  expect(state.context).toEqual({store:null,start:null,end:null});
});

test('RC58 aceita cabeçalho de período repetido de forma idêntica em páginas diferentes', async ({ page }) => {
  await openApp(page);
  const bytes=await pointPdfPeriods(page,['11/07/2026 - 10/08/2026','11/07/2026 - 10/08/2026']);
  const result=await page.evaluate(async ({bytes}) => {
    const file=new File([new Uint8Array(bytes)],'espelho-periodo-repetido.pdf',{type:'application/pdf'});
    return window.ADERENCIA_POINT_STORE_INTEGRITY.scan(file);
  },{bytes});
  expect(result.stores).toEqual(['ML10']);
  expect(result.periods).toEqual(['11/07/2026 - 10/08/2026']);
  expect(result.periodObservations).toHaveLength(2);
});

test('RC58 bloqueia espelho com períodos contraditórios antes do engine', async ({ page }) => {
  await openApp(page);
  const state=await dispatchPoint(page,await pointPdfPeriods(page,['11/07/2026 - 10/08/2026','11/06/2026 - 10/07/2026']),'espelho-periodos-mistos.pdf');
  expect(state.last.blocked).toBeTruthy();
  expect(state.last.reason).toBe('periods');
  expect(state.last.periods.sort()).toEqual(['11/06/2026 - 10/07/2026','11/07/2026 - 10/08/2026']);
  expect(state.status).toContain('espelho contém períodos diferentes');
  expect(state.files).toBe(0);
  expect(state.enginePoint).toBeNull();
  expect(state.context).toEqual({store:null,start:null,end:null});
});

test('RC58 tolera repetição idêntica da mesma pessoa e data sem criar conflito', async ({ page }) => {
  await openApp(page);
  const bytes=await duplicateDayPdf(page,['08:00','12:00','13:00','17:00']);
  const result=await page.evaluate(async ({bytes}) => {
    const file=new File([new Uint8Array(bytes)],'espelho-duplicata-identica.pdf',{type:'application/pdf'});
    return window.ADERENCIA_POINT_STORE_INTEGRITY.scan(file);
  },{bytes});
  expect(result.identityConflicts).toHaveLength(0);
  expect(result.dayConflicts).toHaveLength(0);
  expect(result.duplicateDays).toHaveLength(1);
});

test('RC58 bloqueia o mesmo nome associado a matrículas diferentes', async ({ page }) => {
  await openApp(page);
  const state=await dispatchPoint(page,await duplicateDayPdf(page,['08:00','12:00','13:00','17:00'],'2'),'espelho-homonimos.pdf');
  expect(state.last.blocked).toBeTruthy();
  expect(state.last.reason).toBe('identities');
  expect(state.last.identityConflicts).toHaveLength(1);
  expect(state.last.identityConflicts[0].registrations.sort()).toEqual(['1','2']);
  expect(state.status).toContain('mesmo nome associado a matrículas diferentes');
  expect(state.files).toBe(0);
  expect(state.enginePoint).toBeNull();
});

test('RC58 bloqueia batidas conflitantes para a mesma pessoa e data', async ({ page }) => {
  await openApp(page);
  const state=await dispatchPoint(page,await duplicateDayPdf(page,['09:00','12:00','13:00','18:00']),'espelho-batidas-conflitantes.pdf');
  expect(state.last.blocked).toBeTruthy();
  expect(state.last.reason).toBe('days');
  expect(state.last.dayConflicts).toHaveLength(1);
  expect(state.status).toContain('marcações conflitantes');
  expect(state.status).toContain('11/07/2026');
  expect(state.status).toContain('08:00');
  expect(state.status).toContain('09:00');
  expect(state.files).toBe(0);
  expect(state.enginePoint).toBeNull();
});
