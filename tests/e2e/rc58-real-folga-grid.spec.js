const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_REAL_GRID?.version === 'RC58-S1' && !!window.jspdf?.jsPDF);
}

async function sparseFolgaPdf(page){
  return page.evaluate(() => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    pdf.setFontSize(7);
    pdf.text('ESCALA OPERACIONAL | LOJA 11 Junho 2026',10,10);
    pdf.text('Nome',10,20);
    pdf.text('Cargo',48,20);
    const x0=72, step=5.75, days=[...Array.from({length:30},(_,i)=>i+1),1];
    days.forEach((d,i)=>pdf.text(String(d),x0+i*step,20));
    const people=[
      ['FUNCIONARIO TESTE ALFA','OPERADOR DE LOJA',{2:'F',7:'F',12:'F',17:'F',22:'F',27:'F'}],
      ['FUNCIONARIO TESTE BETA','OPERADOR DE LOJA',{3:'F',8:'F',13:'F',18:'F',23:'F',28:'F'}],
      ['FUNCIONARIO TESTE GAMA','FISCAL DE LOJA',{1:'F',6:'F',11:'F',16:'F',21:'F',26:'F'}],
      ['FUNCIONARIO TESTE DELTA','LIDER SETOR',{4:'F',9:'F',14:'F',19:'F',24:'F',29:'F'}],
      ['FUNCIONARIO TESTE EPSILON','OPERADOR DE LOJA',{5:'F',10:'F',15:'F',20:'F',25:'F',30:'F'}],
      ['FUNCIONARIO TESTE ZETA','ESTOQUISTA',{0:'F',5:'FER',10:'F',15:'F',20:'F',25:'F',30:'F'}]
    ];
    people.forEach(([name,cargo,codes],r)=>{
      const y=27+r*7;
      pdf.text(name,10,y);
      pdf.text(cargo,48,y);
      Object.entries(codes).forEach(([idx,code])=>pdf.text(code,x0+(+idx)*step,y));
    });
    // Legenda propositalmente fora da grade: não pode virar célula de funcionário.
    pdf.text('T1 | 07:00 às 16:00',262,27);
    pdf.text('T6 | 13:00 às 22:00',262,34);
    pdf.text('T27 | 12:00 às 18:00',262,41);
    return Array.from(new Uint8Array(pdf.output('arraybuffer')));
  });
}

test('RC58-S1 recupera grade operacional esparsa sem descartar funcionários nem inventar turno', async ({page})=>{
  await openApp(page);
  const bytes=await sparseFolgaPdf(page);
  const result=await page.evaluate(async ({bytes})=>{
    const names=['ALFA','BETA','GAMA','DELTA','EPSILON','ZETA'].map(x=>`FUNCIONARIO TESTE ${x}`);
    const ctx={
      store:'ML11',start:'2026-06-11',end:'2026-07-10',
      employees:names.map(name=>({name,key:name}))
    };
    const file=new File([new Uint8Array(bytes)],'Escala de Folgas - 11.pdf',{type:'application/pdf'});
    const p=await window.ADERENCIA_SCHEDULE_REAL_GRID.parse(file,ctx);
    return {
      employees:p.employees.size,
      dates:p.dates,
      turns:[...p.turns.keys()],
      rows:[...p.employees.values()].map(e=>({name:e.name,days:[...e.days]})),
      implicitWork:p.implicitWork
    };
  },{bytes});

  expect(result.employees).toBe(6);
  expect(result.dates).toHaveLength(21);
  expect(result.dates[0]).toBe('2026-06-11');
  expect(result.dates.at(-1)).toBe('2026-07-01');
  expect(result.implicitWork).toBeTruthy();
  for(const row of result.rows) expect(row.days).toHaveLength(21);
  const alfa=result.rows.find(x=>x.name.endsWith('ALFA'));
  expect(alfa.days.find(([d])=>d==='2026-06-11')[1]).toBe('D');
  expect(alfa.days.some(([,v])=>v==='F')).toBeTruthy();
  const cellCodes=result.rows.flatMap(x=>x.days.map(([,v])=>v));
  expect(cellCodes.some(v=>/^T(?:1|6|27)$/.test(v))).toBeFalsy();
  expect(result.turns).toEqual(expect.arrayContaining(['T1','T6','T27']));
});

test('RC58-S1 é carregado antes do R3 para preservar o PDF original', async ({page})=>{
  await openApp(page);
  const order=await page.evaluate(()=>{
    const a=window.ADERENCIA_ACTIVE_MODULES||[];
    return {real:a.indexOf('schedule-real-grid-recovery-rc58.js'),r3:a.indexOf('schedule-recovery-r3.js')};
  });
  expect(order.real).toBeGreaterThanOrEqual(0);
  expect(order.r3).toBeGreaterThan(order.real);
});
