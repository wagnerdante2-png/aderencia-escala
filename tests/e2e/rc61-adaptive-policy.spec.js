const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61 && window.XLSX);
}

test('RC61 accepts proportional 01-to-30 source against 11-to-10 point cycle', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(async()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61;
    const pointNames=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELI TESTE','FABI TESTE'];
    const people=pointNames.map((name,i)=>({id:String(i+1),registration:String(i+1),name,plans:[]}));
    function nameKey(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join(' ')}
    const point={ctx:{store:'ML40',start:'2026-06-11',end:'2026-07-10'},people,byReg:new Map(people.map(p=>[p.registration,p])),byName:new Map(people.map(p=>[nameKey(p.name),p]))};
    const dates=Array.from({length:30},(_,i)=>new Date(2026,5,i+1));
    const rows=[['Modelo 3.1'],['Nome','Cargo',...dates],
      ['ANA TESTE','OPERADOR',...dates.map(()=> 'T6')],
      ['BIA TESTE','OPERADOR',...dates.map((_,i)=>i%7===0?'F':'T6')],
      ['CARLA TESTE','LIDER',...dates.map(()=> 'T6')],
      ['DORA TESTE','FISCAL',...dates.map(()=> 'T6')],
      ['ELI TESTE','OPERADOR',...dates.map(()=> 'T6')],
      [],['Turno','Entrada','Saida'],['T6','13:00','22:00']];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Escala Mensal');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala Modelo 3.1.xlsx');
    const out=await api.normalizeExcel(file,point),parsed=XLSX.read(await out.arrayBuffer(),{type:'array',cellDates:true}),a=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    return {name:out.name,header:a[2],legend:a.flat().find(v=>String(v).startsWith('T6 |')),audit:api.last};
  });
  expect(r.name).toContain('RC51_RC61_ML40');
  expect(r.header.slice(2)).toHaveLength(20);
  expect(r.header[2]).toBe('11/06/2026');
  expect(r.header.at(-1)).toBe('30/06/2026');
  expect(r.legend).toContain('13:00');
  expect(r.legend).toContain('22:00');
  expect(r.audit.modelVersion).toBe('3.1');
  expect(r.audit.matchedPeople).toBe(5);
});

test('RC61 keeps the same turn code independent between model versions', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61,a=api.parseLegendText('MODELO 1.2\nT6 | 13:00 às 22:00'),b=api.parseLegendText('MODELO 3.1\nT6 | 10:00 às 19:00');
    return {a:a.get('T6'),b:b.get('T6')};
  });
  expect(r.a).toEqual({start:'13:00',end:'22:00'});
  expect(r.b).toEqual({start:'10:00',end:'19:00'});
});

test('RC61 population policy tolerates admissions and dismissals but rejects unrelated stores', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61;
    const names=Array.from({length:60},(_,i)=>`FUNCIONARIO ${String(i+1).padStart(2,'0')}`),people=names.map((name,i)=>({id:String(i+1),registration:String(i+1),name,plans:[]}));
    const point={ctx:{store:'ML40',start:'2026-06-11',end:'2026-07-10'},people,byReg:new Map(people.map(p=>[p.registration,p])),byName:new Map(people.map(p=>[p.name,p]))};
    const good=api.identity(names.slice(0,55).map((name,i)=>({name,registration:String(i+1)})),point);
    const bad=api.identity(Array.from({length:55},(_,i)=>({name:`OUTRA PESSOA ${i}`,registration:''})),point);
    return {good:{ok:good.ok,matched:good.matched,ratio:good.ratio},bad:{ok:bad.ok,matched:bad.matched,ratio:bad.ratio}};
  });
  expect(r.good.ok).toBeTruthy();
  expect(r.good.matched).toBe(55);
  expect(r.bad.ok).toBeFalsy();
});

test('RC61 treats a daily planned exception as exact-date only', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61,base=api.plannedParts('11/06/2026 614 - ML32 07:00-12:00-13:00-16:00 (QUARTA) 07:00 12:00 13:00 15:20'),exc=api.plannedParts('21/06/2026 614 - ML32 07:00-12:00-13:00-16:00 (QUARTA) 11:00 13:00 14:00 20:00'),p={plans:[{date:'2026-06-11',...base},{date:'2026-06-21',...exc}]};
    return {d21:api.plannedAt(p,'2026-06-21'),d22:api.plannedAt(p,'2026-06-22')};
  });
  expect(r.d21).toMatchObject({start:'11:00',end:'20:00'});
  expect(r.d22).toMatchObject({start:'07:00',end:'16:00'});
});

test('RC61 crosses month boundaries from the schedule calendar itself', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61.datesFromDays([11,12,13,30,31,1,2,10],6,2026));
  expect(r).toEqual(['2026-07-11','2026-07-12','2026-07-13','2026-07-30','2026-07-31','2026-08-01','2026-08-02','2026-08-10']);
});

test('RC61 PDF identity does not require a store header when population proves the source', async ({ page }) => {
  await openApp(page);
  const r=await page.evaluate(()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61,names=['ANA TESTE','BIA TESTE','CARLA TESTE'],people=names.map((name,i)=>({id:String(i+1),registration:String(i+1),name,plans:[]})),point={ctx:{store:'ML45',start:'2026-07-11',end:'2026-08-10'},people,byReg:new Map(people.map(p=>[p.registration,p])),byName:new Map(people.map(p=>[p.name,p]))};
    const days=[11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,1,2,3,4,5,6,7,8,9,10],x0=240,step=18;
    const header={y:500,items:days.map((d,i)=>({text:String(d),x:x0+i*step,y:500,w:8})),text:days.join(' ')};
    const rows=[header];
    names.forEach((name,ri)=>{const y=450-ri*28,items=[{text:`${name} OPERADOR DE LOJA`,x:10,y,w:180},...days.map((_,i)=>({text:'T6',x:x0+i*step,y,w:10}))];rows.push({y,items,text:items.map(x=>x.text).join(' ')})});
    const page={items:rows.flatMap(r=>r.items),rows,text:`Julho 2026\nNome Cargo ${days.join(' ')}\n${rows.slice(1).map(r=>r.text).join('\n')}\nT6 | 13:00 às 22:00`,source:'text'};
    const out=api.parsePdfPages([page],{name:'ESCALA JULHO.pdf'},point);
    return {people:out.people.length,dates:out.dates.length,first:out.dates[0],last:out.dates.at(-1),turn:out.turns.get('T6')};
  });
  expect(r.people).toBe(3);
  expect(r.dates).toBe(31);
  expect(r.first).toBe('2026-07-11');
  expect(r.last).toBe('2026-08-10');
  expect(r.turn).toEqual({start:'13:00',end:'22:00'});
});
