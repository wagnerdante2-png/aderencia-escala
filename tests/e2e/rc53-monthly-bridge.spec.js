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
    const buildMonth=(year,month,days)=>{const dates=Array.from({length:days},(_,i)=>{const d=new Date(year,month,i+1,12);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`});return [['ESCALA OPERACIONAL'],['',...dates],['Nome'],...employees.map((name,j)=>[name,...dates.map((_,i)=>((i+j)%7===6?'F':'T1'))]),['T1 | 08:00 às 17:00']]};
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(buildMonth(2026,5,30)),'Junho');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(buildMonth(2026,6,31)),'Julho');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10.xlsx');
    const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-06-11',end:'2026-07-10'});
    const parsed=XLSX.read(await normalized.arrayBuffer(),{type:'array',cellDates:true}),out=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    return {name:normalized.name,bridge:window.ADERENCIA_SCHEDULE_BRIDGE.version,audit:window.ADERENCIA_SCHEDULE_HARDENING.lastAudit,firstDate:out[2][2],lastDate:out[2][out[2].length-1],employeeRows:out.slice(3).filter(r=>String(r[0]||'').endsWith('TESTE')).length,cargos:out.slice(3,8).map(r=>r[1])};
  });
  expect(result.bridge).toBe('RC53.3');expect(result.name).toContain('RC51_ML10_');expect(result.audit.bridge).toBe('RC53.3');expect(result.audit.coverage).toBe(1);expect(result.audit.employees).toBe(5);expect(result.audit.expectedDays).toBe(30);expect(result.audit.exactDateDays).toBe(30);expect(result.audit.inferredCells).toBe(0);expect(result.audit.unresolvedCells).toBe(0);expect(result.firstDate).toBe('11/06/2026');expect(result.lastDate).toBe('10/07/2026');expect(result.employeeRows).toBe(5);expect(result.cargos.every(x=>x==='NÃO IDENTIFICADO')).toBeTruthy();
});

test('RC53 reports exact missing dates instead of fabricating them', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    document.getElementById('pointStatus').textContent='Reconhecido: 5 funcionário(s) • ML10 • 1500 marcações';
    const dates=Array.from({length:30},(_,i)=>`${String(i+1).padStart(2,'0')}/06/2026`),employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const rows=[['ESCALA OPERACIONAL'],['',...dates],['Nome'],...employees.map(n=>[n,...dates.map(()=> 'T1')]),['T1 | 08:00 às 17:00']];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Junho');const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10.xlsx');
    try{await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-06-11',end:'2026-07-10'});return{message:''}}catch(e){return{message:String(e.message),audit:window.ADERENCIA_SCHEDULE_HARDENING.lastAudit}}
  });
  expect(result.message).toContain('escala reconhecida por nomes');expect(result.message).toContain('o espelho exige 11/06/2026 a 10/07/2026');expect(result.message).toContain('dias ausentes não são inferidos');expect(result.audit.missingDates).toHaveLength(10);expect(result.audit.lastExactDate).toBe('2026-06-30');
});

test('RC53 handles real ML10 split headers and blocks after 01/07 with a precise gap', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    document.getElementById('pointStatus').textContent='Reconhecido: 20 funcionário(s) • ML10 • 1500 marcações';
    const dates=[];for(let d=1;d<=30;d++)dates.push(`${String(d).padStart(2,'0')}/06/2026`);dates.push('01/07/2026');
    const employees=Array.from({length:20},(_,i)=>`FUNCIONARIO TESTE ${String(i+1).padStart(2,'0')}`),dateRow=['','',...dates],header=['Nome','Cargo'];
    const rows=[['ESCALA MENSAL'],dateRow,header,...employees.map((n,i)=>[n,'OPERADOR',...dates.map((_,j)=>(i+j)%7===0?'F':'T1')]),['T1 | 08:00 às 17:00']];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Escala Mensal');const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10.xlsm');
    try{await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,{store:'ML10',start:'2026-06-11',end:'2026-07-10'});return{message:''}}catch(e){return{message:String(e.message),audit:window.ADERENCIA_SCHEDULE_HARDENING.lastAudit}}
  });
  expect(result.message).toContain('até 01/07/2026');expect(result.message).toContain('Faltam 9 dia(s)');expect(result.message).toContain('02/07/2026');expect(result.audit.exactDateDays).toBe(21);expect(result.audit.lastExactDate).toBe('2026-07-01');expect(result.audit.missingDates).toHaveLength(9);expect(result.audit.inferredCells).toBe(0);
});
