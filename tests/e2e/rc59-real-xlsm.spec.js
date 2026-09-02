const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_REAL_XLSM_RC59 && window.XLSX);
}

test('RC59 registration key uses the employee number and ignores company prefix', async ({ page }) => {
  await openApp(page);
  const value=await page.evaluate(()=>window.ADERENCIA_REAL_XLSM_RC59.regKey('0101032 - 000062'));
  expect(value).toBe('62');
});

test('RC59.2 uses the planned columns from the Horários table, not the shift description', async ({ page }) => {
  await openApp(page);
  const value=await page.evaluate(()=>window.ADERENCIA_REAL_XLSM_RC59.plannedTimes(
    '21/06/2026 614 - ML32 07:00-12:00-13:00-16:00 (QUARTA-FEIRA) 11:00 13:00 14:00 20:00'
  ));
  expect(value).toEqual({start:'11:00',end:'20:00',times:['11:00','13:00','14:00','20:00']});
});

test('RC59 reconstructs Novo Modelo from materialized rules plus point schedule metadata', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async()=>{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Filial','Matricula','Nome','Desc.Funcao','N LOJA','Status','PodeAbrir','PodeFechar','FolgaFixaDia','Folga2','Folga3','DomingoGrupo','TurnoPadrao','DataFerias','DiasFerias','DataAfastamento','DiasAfastamento','Regime'],
      [101032,6,'MARISA OTTAVIANI','OPERADOR',32,'ATIVO','','','qua','','','', '', '', '', '', '', '6X1'],
      [101032,9,'ELZA JHENIFFER RAMOS DE LIMA','LIDER',32,'ATIVO','','','ter','','','', '', '', '', '', '', '6X1'],
      [101032,36,'ALEXANDRE TAVARES JUNIOR','OPERADOR',32,'ATIVO','','','qua','','','', '', '', '', '', '', '6X1']
    ]),'Banco de Dados');
    const june=Array.from({length:30},(_,i)=>new Date(2026,5,1+i));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['ML32 - TESTE'],[],[],[],[],[],[],
      ['', '', 'Junho','Cargo',...june],
      ['', '', 'Nome','',...june.map(d=>['dom','seg','ter','qua','qui','sex','sab'][d.getDay()])],
      ['', '', 'MARISA OTTAVIANI','OPERADOR',...june.map(d=>d.getDate()===17?'F':'')],
      ['', '', 'ELZA JHENIFFER RAMOS DE LIMA','LIDER',...june.map(d=>d.getDate()===16?'F':'')],
      ['', '', 'ALEXANDRE TAVARES JUNIOR','OPERADOR',...june.map(d=>d.getDate()===17?'F':'')]
    ]),'Escala Mensal');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['Parâmetro','Valor','','Turno','Entrada','Saida'],
      ['AnoEscala',2026,'','T1','07:00','16:00'],
      ['','','','T2','08:00','17:00']
    ]),'Configuração');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala - Novo Modelo - 1.2.xlsm',{type:'application/vnd.ms-excel.sheet.macroEnabled.12'});
    const changes=start=>new Map([['2026-06-11',{start,end:'15:20'}],['2026-07-01',{start,end:'15:20'}]]);
    const point=new Map([
      ['6',{registration:'6',name:'MARISA OTTAVIANI',changes:changes('07:00')}],
      ['9',{registration:'9',name:'ELZA JHENIFFER RAMOS DE LIMA',changes:changes('13:00')}],
      ['36',{registration:'36',name:'ALEXANDRE TAVARES JUNIOR',changes:changes('07:00')}]
    ]);
    const out=await window.ADERENCIA_REAL_XLSM_RC59.hybrid(file,{store:'ML32',start:'2026-06-11',end:'2026-07-10'},point);
    const parsed=XLSX.read(await out.arrayBuffer(),{type:'array',cellDates:true});
    const a=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    const audit=window.ADERENCIA_REAL_XLSM_RC59.last;
    return {name:out.name,rows:a.length,audit,header:a[2].slice(0,3),first:a[3].slice(0,6),legend:a.slice(-10).flat().filter(v=>/^T\d+ \|/.test(String(v))).length};
  });
  expect(result.name).toContain('RC59');
  expect(result.header).toEqual(['Matrícula','Nome','Cargo']);
  expect(result.audit.employees).toBe(3);
  expect(result.audit.coverage).toBeGreaterThanOrEqual(.95);
  expect(result.audit.hybridWorkCells).toBeGreaterThan(0);
  expect(result.legend).toBeGreaterThan(0);
});
