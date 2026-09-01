const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_POINT_STORE_INTEGRITY?.version === 'RC58.1' && window.ADERENCIA_ENGINE?.version === 'v4-rc56-resilient' && !!window.jspdf?.jsPDF);
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

test('RC58 aceita repetição da mesma loja nos campos Departamento/Lotação do espelho', async ({ page }) => {
  await openApp(page);
  const bytes=await pointPdf(page,['ML10','ML10','ML10']);
  const result=await page.evaluate(async ({bytes}) => {
    const file=new File([new Uint8Array(bytes)],'espelho-ml10.pdf',{type:'application/pdf'});
    return window.ADERENCIA_POINT_STORE_INTEGRITY.scan(file);
  },{bytes});
  expect(result.stores).toEqual(['ML10']);
  expect(result.observations).toHaveLength(3);
});

test('RC58 bloqueia espelho que mistura lojas distintas e limpa o input antes do engine', async ({ page }) => {
  await openApp(page);
  const bytes=await pointPdf(page,['ML10','ML10','ML11']);
  const state=await page.evaluate(async ({bytes}) => {
    const file=new File([new Uint8Array(bytes)],'espelho-misto.pdf',{type:'application/pdf'}),dt=new DataTransfer();
    dt.items.add(file);
    const input=document.getElementById('pointFile');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    const limit=Date.now()+5000;
    while(Date.now()<limit){if(window.ADERENCIA_POINT_STORE_INTEGRITY.last?.blocked)break;await new Promise(r=>setTimeout(r,25))}
    return {
      last:window.ADERENCIA_POINT_STORE_INTEGRITY.last,
      status:document.getElementById('pointStatus').textContent,
      files:input.files.length,
      enginePoint:window.ADERENCIA_ENGINE.point,
      context:window.ADERENCIA_POINT_CONTEXT
    };
  },{bytes});
  expect(state.last.blocked).toBeTruthy();
  expect(state.last.stores.sort()).toEqual(['ML10','ML11']);
  expect(state.status).toContain('espelho mistura lojas');
  expect(state.status).toContain('ML10');
  expect(state.status).toContain('ML11');
  expect(state.files).toBe(0);
  expect(state.enginePoint).toBeNull();
  expect(state.context).toEqual({store:null,start:null,end:null});
});
