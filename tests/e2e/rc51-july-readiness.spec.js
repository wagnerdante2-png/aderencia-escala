const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.XLSX);
}

const anchoredStores = ['ML11','ML22','ML25','ML26','ML36','ML41','ML45','ML51','ML52','ML53'];

test('July gate: every known RC28 false-block store builds context from the already recognized point file', async ({ page }) => {
  await openApp(page);
  for (const store of anchoredStores) {
    const ctx = await page.evaluate(store => {
      document.getElementById('pointStatus').textContent = `Reconhecido: 30 funcionário(s) • ${store} • 1800 marcações`;
      document.getElementById('metaPeriod').textContent = '11/07/2026 a 10/08/2026';
      return window.ADERENCIA_SCHEDULE_HARDENING.pointContext();
    }, store);
    expect(ctx).toEqual({ store, start:'2026-07-11', end:'2026-08-10' });
  }
});

test('July gate: suspicious tiny or excessive employee coverage is never accepted silently', async ({ page }) => {
  await openApp(page);
  const reasons = await page.evaluate(() => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 48 funcionário(s) • ML31 • 3090 marcações';
    const h = window.ADERENCIA_SCHEDULE_HARDENING;
    const ctx = { store:'ML31', start:'2026-07-11', end:'2026-08-10' };
    return [
      h.suspiciousRecognition('Reconhecida: 3 funcionário(s) • ML31 • 31 turnos • 11/07/2026 a 10/08/2026', ctx),
      h.suspiciousRecognition('Reconhecida: 90 funcionário(s) • ML31 • 31 turnos • 11/07/2026 a 10/08/2026', ctx)
    ];
  });
  expect(reasons[0]).toBe('cobertura-colaboradores-3-de-48');
  expect(reasons[1]).toBe('cobertura-colaboradores-excessiva-90-de-48');
});

test('July gate: structural fallback refuses to run without validated point context', async ({ page }) => {
  await openApp(page);
  const message = await page.evaluate(async () => {
    const ws = XLSX.utils.aoa_to_sheet([['Nome','Cargo','11/07/2026'],['ANA','OPERADOR DE LOJA I','T1']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Escala Ponto');
    const file = new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})], 'escala.xlsx');
    try { await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:null,start:null,end:null}); }
    catch (e) { return String(e.message); }
    return '';
  });
  expect(message).toContain('contexto validado do espelho indisponível');
});

test('July gate: fallback rejects a partial 20-day grid for a 31-day competence', async ({ page }) => {
  await openApp(page);
  const message = await page.evaluate(async () => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 20 funcionário(s) • ML40 • 1681 marcações';
    document.getElementById('metaPeriod').textContent = '11/07/2026 a 10/08/2026';
    const dates = Array.from({length:20},(_,i)=>{
      const d=new Date(2026,6,11+i,12);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    });
    const rows=[['ESCALA OPERACIONAL | LOJA ML40'],['Nome','Cargo',...dates],['ANA TESTE','OPERADOR DE LOJA I',...dates.map(()=> 'T1')],['BIA TESTE','OPERADOR DE LOJA I',...dates.map(()=> 'T1')],['T1 | 08:00 às 17:00']];
    const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Escala Ponto');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'ML40.xlsx');
    try { await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML40',start:'2026-07-11',end:'2026-08-10'}); }
    catch(e){ return String(e.message); }
    return '';
  });
  expect(message).toMatch(/nenhuma matriz alternativa segura|cobertura de datas insuficiente/i);
});

test('July gate: validated 31-day matrix with complete legend normalizes safely', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 5 funcionário(s) • ML10 • 1500 marcações';
    document.getElementById('metaPeriod').textContent = '11/07/2026 a 10/08/2026';
    const dates=Array.from({length:31},(_,i)=>{const d=new Date(2026,6,11+i,12);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`});
    const employees=['ANA','BIA','CARLA','DORA','ELISA'];
    const rows=[['ESCALA OPERACIONAL | LOJA ML10'],['Nome','Cargo',...dates],...employees.map((n,j)=>[n,'OPERADOR DE LOJA I',...dates.map((_,i)=>(i+j)%7===6?'F':'T1')]),['T1 | 08:00 às 17:00']];
    const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Escala Ponto');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'ML10.xlsx');
    const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-07-11',end:'2026-08-10'});
    return {name:normalized.name,audit:window.ADERENCIA_SCHEDULE_HARDENING.lastAudit,version:window.ADERENCIA_SCHEDULE_HARDENING.version};
  });
  expect(result.version).toBe('RC51.3');
  expect(result.name).toContain('RC51_ML10_');
  expect(result.audit.coverage).toBe(1);
  expect(result.audit.employees).toBe(5);
  expect(result.audit.expectedDays).toBe(31);
});
