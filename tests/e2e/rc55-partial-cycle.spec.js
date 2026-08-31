const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_PARTIAL && !!window.ADERENCIA_SCHEDULE_RESILIENCE && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.ADERENCIA_PDF_CALENDAR_RC56 && !!window.XLSX);
}

function julyLayout(){
  const dates=Array.from({length:31},(_,i)=>new Date(2026,6,i+1,12));
  const employees=Array.from({length:20},(_,i)=>`FUNCIONARIO TESTE ${String(i+1).padStart(2,'0')}`);
  const rows=[['','ML10 - CAPIVARI'],[],[],[],[],[],['','','Julho','Cargo',...dates],['','','Nome','',...dates.map(d=>['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()])]];
  for(let i=0;i<employees.length;i++)rows.push(['','',employees[i],'OPERADOR DE LOJA',...dates.map((_,j)=>(i+j)%7===0?'F':'T1')]);
  return rows;
}

test('RC55 accepts exact partial intersection 11/07-31/07 for a 11/07-10/08 point cycle', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async ({rows})=>{
    document.getElementById('pointStatus').textContent='Reconhecido: 21 funcionário(s) • ML10 • 1514 marcações';
    document.getElementById('metaPeriod').textContent='11/07/2026 a 10/08/2026';
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,'Escala Mensal');
    const cfg=XLSX.utils.aoa_to_sheet([['','','','','','','','','','','','','','','','','','','','','T1 | 07:00 às 16:00']]);
    XLSX.utils.book_append_sheet(wb,cfg,'Configuração');
    const file=new File([XLSX.write(wb,{bookType:'xlsm',type:'array'})],'Escala - Novo Modelo - 1.2.xlsm');
    const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-07-11',end:'2026-08-10'});
    const parsed=XLSX.read(await normalized.arrayBuffer(),{type:'array',cellDates:true});
    const out=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    const audit=window.ADERENCIA_SCHEDULE_HARDENING.lastAudit;
    return {version:window.ADERENCIA_SCHEDULE_PARTIAL.version,name:normalized.name,first:out[2][2],last:out[2][out[2].length-1],dateCount:out[2].length-2,employeeCount:out.slice(3).filter(r=>String(r[0]||'').startsWith('FUNCIONARIO TESTE')).length,audit};
  },{rows:julyLayout()});
  expect(result.version).toBe('RC55.1');
  expect(result.name).toContain('RC55_ML10_');
  expect(result.first).toBe('11/07/2026');
  expect(result.last).toBe('31/07/2026');
  expect(result.dateCount).toBe(21);
  expect(result.employeeCount).toBe(20);
  expect(result.audit.partial).toBeTruthy();
  expect(result.audit.expectedDays).toBe(31);
  expect(result.audit.exactDateDays).toBe(21);
  expect(result.audit.missingDates).toHaveLength(10);
  expect(result.audit.inferredCells).toBe(0);
  expect(result.audit.coverage).toBe(1);
});

test('RC56 PDF parser applies proportionality instead of blocking 68% calendar overlap', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(() => {
    const api=window.ADERENCIA_PDF_CALENDAR_RC56;
    const pointCycle=Array.from({length:31},(_,i)=>new Date(2026,6,11+i,12));
    const aligned=api.alignRawDays(Array.from({length:31},(_,i)=>i+1),pointCycle,'ESCALA OPERACIONAL | LOJA 12 Julho 2026');
    const policy=api.proportionalPolicy(aligned,pointCycle.length);
    return {
      computedDays:policy.computedDays,
      expectedDays:policy.expectedDays,
      proportional:policy.proportional,
      accepted:policy.accepted,
      coverage:policy.coverage,
      first:aligned.pairs[0]?.date?.toISOString().slice(0,10),
      last:aligned.pairs.at(-1)?.date?.toISOString().slice(0,10)
    };
  });
  expect(result.accepted).toBeTruthy();
  expect(result.proportional).toBeTruthy();
  expect(result.computedDays).toBe(21);
  expect(result.expectedDays).toBe(31);
  expect(result.coverage).toBeCloseTo(21/31,5);
  expect(result.first).toBe('2026-07-11');
  expect(result.last).toBe('2026-07-31');
});

test('RC56 recovers a perforated partial interval without inventing missing dates', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async ({rows})=>{
    document.getElementById('pointStatus').textContent='Reconhecido: 21 funcionário(s) • ML10 • 1514 marcações';
    document.getElementById('metaPeriod').textContent='11/07/2026 a 10/08/2026';
    rows[6].splice(14,1); rows[7].splice(14,1); for(let r=8;r<rows.length;r++)rows[r].splice(14,1);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Escala Mensal');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['T1 | 07:00 às 16:00']]),'Configuração');
    const file=new File([XLSX.write(wb,{bookType:'xlsm',type:'array'})],'Escala ML10.xlsm');
    const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-07-11',end:'2026-08-10'});
    return {name:normalized.name,audit:window.ADERENCIA_SCHEDULE_RESILIENCE.last};
  },{rows:julyLayout()});
  expect(result.name).toContain('RC56_ML10_');
  expect(result.audit).toBeTruthy();
  expect(result.audit.partial).toBeTruthy();
  expect(result.audit.expectedDays).toBe(31);
  expect(result.audit.exactDateDays).toBe(20);
  expect(result.audit.coverage).toBeCloseTo(20/31,5);
  expect(result.audit.missingDates).toHaveLength(11);
  expect(result.audit.missingDates).toContain('2026-07-11');
  expect(result.audit.missingDates).toContain('2026-08-10');
});
