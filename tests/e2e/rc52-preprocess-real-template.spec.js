const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.ADERENCIA_SCHEDULE_PREPROCESS && !!window.XLSX);
}

test('RC52 preprocesses an ML08 workbook before residual ML01 template metadata reaches the core parser', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    document.getElementById('pointStatus').textContent='Reconhecido: 5 funcionário(s) • ML08 • 1200 marcações';
    document.getElementById('metaPeriod').textContent='11/07/2026 a 10/08/2026';
  });
  const file = await page.evaluate(() => {
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['ML01 - RESIDUO DE TEMPLATE'],['ML02'],['ML03'],['ML08 - CAMPINAS MORAES SALES']
    ]),'Configuração');
    const dates=Array.from({length:31},(_,i)=>{const d=new Date(2026,6,11+i,12);return d;});
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const rows=[['Nome','Cargo',...dates],...employees.map((n,j)=>[n,'OPERADOR DE LOJA I',...dates.map((_,i)=>(i+j)%7===6?'F':'T1')])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Andar no Tempo');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['T1 | 08:00 às 17:00']]),'Legenda');
    return Array.from(new Uint8Array(XLSX.write(wb,{bookType:'xlsx',type:'array'})));
  });
  const bytes=Buffer.from(file);
  await page.setInputFiles('#scheduleFile',{name:'Escala - Novo Modelo - 1.2 ML08.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
  await expect(page.locator('#scheduleStatus')).toContainText(/Reconhecida: 5 funcionário\(s\).*ML08/i,{timeout:15000});
  const audit=await page.evaluate(()=>({pre:window.ADERENCIA_SCHEDULE_PREPROCESS.last,hard:window.ADERENCIA_SCHEDULE_HARDENING.lastAudit,name:document.getElementById('scheduleFile').files?.[0]?.name}));
  expect(audit.pre.mode).toBe('normalized');
  expect(audit.pre.store).toBe('ML08');
  expect(audit.name).toMatch(/^RC51_ML08_/);
  expect(audit.hard.store).toBe('ML08');
  expect(audit.hard.coverage).toBe(1);
});
