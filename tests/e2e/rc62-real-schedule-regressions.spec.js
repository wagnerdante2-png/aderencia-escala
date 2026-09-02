const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62 && window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61 && window.XLSX);
}

function pointFactoryScript(){
  return `(() => {
    const names=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELI TESTE'];
    const cargos=['OPERADOR DE LOJA','LIDER CAIXA','FISCAL DE LOJA','ESTOQUISTA','WCA'];
    const people=names.map((name,i)=>({id:String(i+1),registration:String(i+1),name,cargo:cargos[i],plans:[{date:'2026-07-11',descriptor:{start:'07:00',end:'16:00',times:['07:00','12:00','13:00','16:00']},actual:null}]}));
    const nk=v=>String(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\\s+/g,' ').trim().split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join(' ');
    return {ctx:{store:'ML40',start:'2026-07-11',end:'2026-08-10'},people,byReg:new Map(people.map(p=>[p.registration,p])),byName:new Map(people.map(p=>[nk(p.name),p]))};
  })()`;
}

test('RC62 reconstructs sparse Escala de Folgas using point planned shifts without moving explicit days', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate((factory)=>{
    const point=eval(factory),api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62;
    const days=Array.from({length:31},(_,i)=>i+1),x0=240,step=18;
    const header={y:500,items:days.map((d,i)=>({text:String(d),x:x0+i*step,y:500,w:8})),text:`Julho 2026 ${days.join(' ')}`};
    const names=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELI TESTE'];
    const cargos=['OPERADOR DE LOJA','LIDER CAIXA','FISCAL DE LOJA','ESTOQUISTA','WCA'];
    const explicitDays=[15,16,17,18,19];
    const rows=[header];
    names.forEach((name,ri)=>{
      const y=450-ri*28,day=explicitDays[ri],items=[{text:name,x:10,y,w:115},{text:cargos[ri],x:130,y,w:95},{text:'F',x:x0+(day-1)*step,y,w:8},{text:`T${ri+5}`,x:820,y,w:16}];
      rows.push({y,items,text:items.map(x=>x.text).join(' ')});
    });
    rows.push({y:250,items:[{text:'T1 | 07:00 às 16:00',x:800,y:250,w:120}],text:'T1 | 07:00 às 16:00'});
    const pg={items:rows.flatMap(r=>r.items),rows,text:`ESCALA DE FOLGAS\nESCALA OPERACIONAL | LOJA 40\nJulho 2026\nT1 | 07:00 às 16:00`,source:'text',rotation:0};
    const out=api.parseSparsePages([pg],{name:'Escala de Folgas - 40 - 07-07-2026.pdf'},point);
    const ana=out.people.find(x=>x.name==='ANA TESTE'),fIndex=out.dates.indexOf('2026-07-15');
    return {dates:out.dates,people:out.people.length,ana:ana.values,explicit:out.explicitCells,inferred:out.inferredCells,coverage:out.cellCoverage,turn:out.turns.get('T1'),fIndex};
  }, pointFactoryScript());
  expect(r.dates).toHaveLength(21);
  expect(r.dates[0]).toBe('2026-07-11');
  expect(r.dates.at(-1)).toBe('2026-07-31');
  expect(r.people).toBe(5);
  expect(r.ana[r.fIndex]).toBe('F');
  expect(r.ana.filter(v=>v==='T1').length).toBe(20);
  expect(r.explicit).toBe(5);
  expect(r.inferred).toBe(100);
  expect(r.coverage).toBe(1);
  expect(r.turn).toEqual({start:'07:00',end:'16:00'});
});

test('RC62 recognizes WCA as a valid cargo in a sparse leave schedule row', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate((factory)=>{
    const point=eval(factory),api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62,days=Array.from({length:31},(_,i)=>i+1),x0=240,step=18;
    const header={y:500,items:days.map((d,i)=>({text:String(d),x:x0+i*step,y:500,w:8})),text:`Julho 2026 ${days.join(' ')}`};
    const rows=[header];
    point.people.forEach((p,ri)=>{const y=450-ri*25,items=[{text:p.name,x:10,y,w:115},{text:p.cargo,x:130,y,w:95},{text:'F',x:x0+14*step,y,w:8}];rows.push({y,items,text:items.map(x=>x.text).join(' ')})});
    rows.push({y:250,items:[],text:'T1 | 07:00 às 16:00'});
    const out=api.parseSparsePages([{items:rows.flatMap(r=>r.items),rows,text:'ESCALA DE FOLGAS\nJulho 2026\nT1 | 07:00 às 16:00',source:'text',rotation:0}],{name:'Escala de Folgas - 40.pdf'},point);
    return out.people.map(x=>({name:x.name,cargo:x.cargo}));
  }, pointFactoryScript());
  expect(r.some(x=>x.name==='ELI TESTE'&&x.cargo==='WCA')).toBeTruthy();
});

test('RC62 reports a real period mismatch instead of a generic grid error', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate((factory)=>{
    const point=eval(factory),api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62,days=Array.from({length:30},(_,i)=>i+1),x0=240,step=18;
    const row={y:500,items:days.map((d,i)=>({text:String(d),x:x0+i*step,y:500,w:8})),text:`Junho 2026 ${days.join(' ')}`};
    const pg={items:row.items,rows:[row],text:`ESCALA OPERACIONAL | LOJA 40\nJunho 2026\n${days.join(' ')}`,source:'ocr',rotation:90};
    try{api.parsePages([pg],{name:'ESCALA JUNHO.pdf'},point);return{code:null,message:null}}
    catch(e){return{code:e.code,message:String(e.message)}}
  }, pointFactoryScript());
  expect(r.code).toBe('ADERENCIA_PERIOD_MISMATCH');
  expect(r.message).toContain('01/06/2026 a 30/06/2026');
  expect(r.message).toContain('11/07/2026 a 10/08/2026');
});

test('RC62 only claims sparse hybrid mode with explicit Escala de Folgas evidence', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>({
    yes:window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62.sparseHint({name:'Escala de Folgas - 55 - 10-07-2026.pdf'},''),
    no:window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62.sparseHint({name:'Escala Operacional ML55.pdf'},'ESCALA OPERACIONAL | LOJA 55')
  }));
  expect(r).toEqual({yes:true,no:false});
});
