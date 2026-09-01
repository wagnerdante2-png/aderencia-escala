const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_CONFLICT_GUARD?.version === 'RC58.2' && window.ADERENCIA_SCHEDULE_CONFLICT_GUARD?.catalogVersion === 'RC58.3' && !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.XLSX);
}

async function buildAndInspect(page,{duplicateConflict=false,duplicateIdentical=false}={}){
  return page.evaluate(async ({duplicateConflict,duplicateIdentical}) => {
    const dates=Array.from({length:21},(_,i)=>`${String(11+i).padStart(2,'0')}/07/2026`);
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const grid=[
      ['ESCALA OPERACIONAL | ML10'],
      ['Nome','Cargo',...dates],
      ...employees.map(name=>[name,'OPERADOR',...dates.map(()=> 'T6')])
    ];
    const config=[
      ['','','','Turno','Entrada','Saida','Tipo','','','','','','','','','','','','','',''],
      ['','','','T1','05:00','14:00','ABERTURA'],
      ['','','','T6','10:00','19:00','INTERMEDIARIO','','','','','','','','','','','','','','T6 | 13:00 às 22:00'],
      [],[],[],[],
      ['','','','Turno','Entrada','Saída','Descrição de Turno','Regime'],
      ['','','','T1','07:00','16:00','T1 | 07:00 às 16:00','6X1'],
      ['','','','T6','13:00','22:00','T6 | 13:00 às 22:00','6X1']
    ];
    if(duplicateConflict)config.push(['','','','T6','12:00','21:00','T6 | 12:00 às 21:00','6X1']);
    if(duplicateIdentical)config.push(['','','','T6','13:00','22:00','T6 | 13:00 às 22:00','6X1']);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(config),'Configuração');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(grid),'Escala Ponto');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala Novo Modelo ML10.xlsx');
    const ctx={store:'ML10',start:'2026-07-11',end:'2026-07-31'};
    const buffer=await file.arrayBuffer();
    const resolution=window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.resolveLegend(buffer);
    const preflight=await window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.preflight(file,ctx);
    let normalizedLegend=[];
    if(!preflight){
      const normalized=await window.ADERENCIA_SCHEDULE_HARDENING.normalizeExcel(file,ctx);
      const out=XLSX.read(await normalized.arrayBuffer(),{type:'array'}),ws=out.Sheets['Escala Ponto']||out.Sheets[out.SheetNames[0]];
      normalizedLegend=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false}).flat().filter(v=>/^T\d+\s*\|/.test(String(v)));
    }
    return {
      resolution,
      preflight:preflight?{code:preflight.code,fatal:preflight.aderenciaFatal===true,message:String(preflight.message)}:null,
      normalizedLegend,
      lastResolution:window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.lastResolution
    };
  },{duplicateConflict,duplicateIdentical});
}

test('RC58 permite catálogos de versões diferentes e escolhe o catálogo operacional com regime', async ({ page }) => {
  await openApp(page);
  const result=await buildAndInspect(page);
  expect(result.preflight).toBeNull();
  expect(result.resolution.catalogs.length).toBeGreaterThanOrEqual(2);
  expect(result.resolution.primary.sheet).toBe('Configuração');
  expect(result.resolution.primary.kind).toBe('structured');
  const t6=result.resolution.primary.entries.find(x=>x.turn==='T6');
  expect(t6).toMatchObject({start:'13:00',end:'22:00'});
  expect(result.normalizedLegend).toContain('T6 | 13:00 às 22:00');
  expect(result.normalizedLegend).not.toContain('T6 | 10:00 às 19:00');
  expect(result.lastResolution.turns).toBeGreaterThanOrEqual(2);
});

test('RC58 bloqueia contradição de turno dentro do mesmo catálogo ativo', async ({ page }) => {
  await openApp(page);
  const result=await buildAndInspect(page,{duplicateConflict:true});
  expect(result.preflight.code).toBe('ADERENCIA_CONFLICTING_SHIFT_LEGEND');
  expect(result.preflight.fatal).toBeTruthy();
  expect(result.preflight.message).toContain('T6');
  expect(result.preflight.message).toContain('13:00-22:00');
  expect(result.preflight.message).toContain('12:00-21:00');
  expect(result.preflight.message).toContain('mesmo catálogo');
});

test('RC58 permite repetição idêntica do turno dentro do mesmo catálogo', async ({ page }) => {
  await openApp(page);
  const result=await buildAndInspect(page,{duplicateIdentical:true});
  expect(result.preflight).toBeNull();
  const t6=result.resolution.primary.entries.find(x=>x.turn==='T6');
  expect(t6).toMatchObject({start:'13:00',end:'22:00'});
});
