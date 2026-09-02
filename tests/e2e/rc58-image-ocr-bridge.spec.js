const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_PDF_IMAGE_OCR_RC58?.version === 'RC58.7' && !!window.XLSX && !!window.pdfjsLib);
}

test('RC58 carrega ponte OCR antes do parser PDF textual', async ({ page }) => {
  await openApp(page);
  const state=await page.evaluate(() => {
    const a=window.ADERENCIA_ACTIVE_MODULES||[];
    return {ocr:a.indexOf('pdf-image-ocr-bridge-rc58.js'),pdf:a.indexOf('pdf-schedule-parser-rc58.js'),version:window.ADERENCIA_PDF_IMAGE_OCR_RC58.version};
  });
  expect(state.version).toBe('RC58.7');
  expect(state.ocr).toBeGreaterThan(-1);
  expect(state.pdf).toBeGreaterThan(state.ocr);
});

test('RC58 identifica PDF sem camada textual como candidato a OCR', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(async () => {
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF)return {skip:true};
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,800,500);ctx.fillStyle='black';ctx.font='28px sans-serif';ctx.fillText('ESCALA OPERACIONAL LOJA 45 JUNHO 2026',40,70);ctx.fillText('ANA TESTE  T13 T13 F T13',40,140);
    const pdf=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,842,595);
    const file=new File([pdf.output('arraybuffer')],'escala-imagem.pdf',{type:'application/pdf'});
    return {skip:false,imageOnly:await window.ADERENCIA_PDF_IMAGE_OCR_RC58.imageOnly(file)};
  });
  if(result.skip)test.skip(true,'jsPDF opcional não carregado');
  expect(result.imageOnly).toBeTruthy();
});

test('RC58 reconstrói grade OCR mensal e mantém nomes conciliados', async ({ page }) => {
  await openApp(page);
  const result=await page.evaluate(() => {
    const api=window.ADERENCIA_PDF_IMAGE_OCR_RC58;
    const days=[...Array.from({length:30},(_,i)=>i+1),1],x0=300,step=18,gridY=500;
    const gridItems=days.map((d,i)=>({text:String(d),x:x0+i*step-4,y:gridY,w:8}));
    const mkRow=(name,cargo,y,code)=>{
      const prefix={text:`${name} ${cargo}`,x:10,y,w:250};
      const cells=days.map((_,i)=>({text:i%7===5?'F':code,x:x0+i*step-6,y,w:12}));
      return {y,items:[prefix,...cells],text:[prefix,...cells].map(x=>x.text).join(' ')};
    };
    const r1=mkRow('ANA TESTE','OPERADOR DE LOJA',470,'T13'),r2=mkRow('BIA TESTE','FISCAL DE LOJA',445,'T18');
    const pageObj={items:[...gridItems,...r1.items,...r2.items],rows:[{y:gridY,items:gridItems,text:days.join(' ')},r1,r2]};
    const grid=api.findGrid(pageObj);
    const point=[{name:'ANA TESTE',key:'ANA TESTE'},{name:'BIA TESTE',key:'BIA TESTE'}];
    const rows=api.parseRows(pageObj,grid,point);
    const dates=api.sequenceDates(grid.days,{month:5,year:2026});
    const legendPage={rows:[{text:'T13 | 07:12 às 17:00',items:[]},{text:'T18 | 12:12 às 22:00',items:[]}]};
    const legend=api.parseLegend([legendPage]);
    return {columns:grid.days.length,employees:rows.map(r=>({name:r.name,cargo:r.cargo,cells:r.values.filter(Boolean).length})),first:dates[0].toISOString().slice(0,10),last:dates.at(-1).toISOString().slice(0,10),legend:[...legend.entries()]};
  });
  expect(result.columns).toBe(31);
  expect(result.employees).toHaveLength(2);
  expect(result.employees.map(x=>x.name)).toEqual(expect.arrayContaining(['ANA TESTE','BIA TESTE']));
  expect(result.employees.every(x=>x.cells===31)).toBeTruthy();
  expect(result.first).toBe('2026-06-01');
  expect(result.last).toBe('2026-07-01');
  expect(result.legend).toEqual(expect.arrayContaining([['T13',{start:'07:12',end:'17:00'}],['T18',{start:'12:12',end:'22:00'}]]));
});
