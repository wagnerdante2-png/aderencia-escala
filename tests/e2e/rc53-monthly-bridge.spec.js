const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_BRIDGE && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.XLSX);
}

test('RC53 bridges ML10-style monthly grids using point period and exact schedule cells only', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 5 funcionário(s) • ML10 • 1500 marcações';
    document.getElementById('metaPeriod').textContent = '11/06/2026 a 10/07/2026';

    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const buildMonth=(year,month,days)=>{
      const dates=Array.from({length:days},(_,i)=>{
        const d=new Date(year,month,i+1,12);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      });
      return [
        ['ESCALA OPERACIONAL'],
        ['', ...dates],
        ['Nome'],
        ...employees.map((name,j)=>[name,...dates.map((_,i)=>((i+j)%7===6?'F':'T1'))]),
        ['T1 | 08:00 às 17:00']
      ];
    };

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(buildMonth(2026,5,30)),'Junho');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(buildMonth(2026,6,31)),'Julho');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10.xlsx');
    const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-06-11',end:'2026-07-10'});
    const parsed=XLSX.read(await normalized.arrayBuffer(),{type:'array',cellDates:true});
    const out=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    return {
      name: normalized.name,
      bridge: window.ADERENCIA_SCHEDULE_BRIDGE.version,
      audit: window.ADERENCIA_SCHEDULE_HARDENING.lastAudit,
      firstDate: out[2][2],
      lastDate: out[2][out[2].length-1],
      employeeRows: out.slice(3).filter(r=>String(r[0]||'').endsWith('TESTE')).length,
      cargos: out.slice(3,8).map(r=>r[1])
    };
  });

  expect(result.bridge).toBe('RC53.2');
  expect(result.name).toContain('RC51_ML10_');
  expect(result.audit.bridge).toBe('RC53.2');
  expect(result.audit.coverage).toBe(1);
  expect(result.audit.employees).toBe(5);
  expect(result.audit.expectedDays).toBe(30);
  expect(result.audit.inferredCells).toBe(0);
  expect(result.audit.unresolvedCells).toBe(0);
  expect(result.firstDate).toBe('11/06/2026');
  expect(result.lastDate).toBe('10/07/2026');
  expect(result.employeeRows).toBe(5);
  expect(result.cargos.every(x=>x==='NÃO IDENTIFICADO')).toBeTruthy();
});

test('RC53 never fabricates missing days to complete point competence', async ({ page }) => {
  await openApp(page);
  const message = await page.evaluate(async () => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 5 funcionário(s) • ML10 • 1500 marcações';
    document.getElementById('metaPeriod').textContent = '11/06/2026 a 10/07/2026';
    const dates=Array.from({length:30},(_,i)=>`${String(i+1).padStart(2,'0')}/06/2026`);
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const rows=[['ESCALA OPERACIONAL'],['',...dates],['Nome'],...employees.map(n=>[n,...dates.map(()=> 'T1')]),['T1 | 08:00 às 17:00']];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Junho');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10.xlsx');
    try { await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-06-11',end:'2026-07-10'}); }
    catch(e){ return String(e.message); }
    return '';
  });
  expect(message).toMatch(/cobertura exata da escala insuficiente|dias ausentes não são inferidos/i);
});
