const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_POINT_STORE_INTEGRITY?.duplicatePolicy === 'prefer-populated' && window.ADERENCIA_ENGINE?.version === 'v4-rc56-resilient' && !!window.jspdf?.jsPDF);
}

async function carolinaSparseDuplicatePdf(page){
  return page.evaluate(() => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(10);
    const addPage = (marks) => {
      const lines = [
        'Espelho do Ponto 11/07/2026 - 10/08/2026',
        'Matrícula: 12345 Nome: CAROLINA FERRAZ BISCAIA Chapa: 12345 Admissão: 01/01/2020',
        'Função: 1 - OPERADOR DE LOJA I C.C. 1',
        'Departamento: LOJA ML10',
        'Data Dia 1a E.',
        marks.length
          ? `06/08/2026 QUI ${marks.map((m,i)=>`${m} ${i%2?'I':'O'}`).join(' ')}`
          : '06/08/2026 QUI',
        'Horários'
      ];
      lines.forEach((line,i)=>pdf.text(line,10,15+i*7));
    };
    addPage(['07:05','12:18','13:19','16:06']);
    pdf.addPage();
    addPage([]);
    return Array.from(new Uint8Array(pdf.output('arraybuffer')));
  });
}

test('RC58 preserva batidas reais quando a mesma pessoa/data reaparece sem batidas', async ({ page }) => {
  await openApp(page);
  const bytes = await carolinaSparseDuplicatePdf(page);
  const state = await page.evaluate(async ({bytes}) => {
    const file = new File([new Uint8Array(bytes)],'espelho-carolina-real.pdf',{type:'application/pdf'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById('pointFile');
    input.files = dt.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    const limit = Date.now()+6000;
    while(Date.now()<limit){
      const guard = window.ADERENCIA_POINT_STORE_INTEGRITY;
      if(!guard.busy && (window.ADERENCIA_ENGINE.point || document.getElementById('pointStatus').textContent.startsWith('Erro:')))break;
      await new Promise(r=>setTimeout(r,25));
    }
    const emp = window.ADERENCIA_ENGINE.point?.employees?.get('CAROLINA FERRAZ BISCAIA');
    const day = emp?.days?.get('2026-08-06');
    return {
      last: window.ADERENCIA_POINT_STORE_INTEGRITY.last,
      status: document.getElementById('pointStatus').textContent,
      marks: day?.marks || null,
      firstEntry: day?.firstEntry || null,
      store: window.ADERENCIA_ENGINE.point?.store || null
    };
  },{bytes});

  expect(state.last.blocked).toBeFalsy();
  expect(state.last.dayConflicts).toHaveLength(0);
  expect(state.last.duplicateDays.filter(x=>x.kind==='sparse')).toHaveLength(1);
  expect(state.last.repairedSparseDays).toBe(1);
  expect(state.store).toBe('ML10');
  expect(state.marks).toEqual(['07:05','12:18','13:19','16:06']);
  expect(state.firstEntry).toBe('07:05');
  expect(state.status).not.toContain('Erro:');
  expect(state.status).toContain('4 marcações');
});
