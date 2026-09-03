const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62?.version === 'RC62.1');
}

test('RC62.1 month detection does not confuse MARCOLINO with Março', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62;
    return api.monthYear('NICK GABRIELY MARCOLINO OPERADOR DE LOJA JULHO 2026 ESCALA OPERACIONAL');
  });
  expect(result).toEqual({ month: 6, year: 2026 });
});

test('RC62.1 rebuilds full July calendar from partial OCR day anchors', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62;
    const anchors = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30];
    const items = anchors.map(day => ({ text:String(day), x:100+(day-1)*20, y:500, w:8 }));
    const row = { y:500, items, text:anchors.join(' ') };
    const pg = { rows:[row], items, text:'ESCALA OPERACIONAL | LOJA 36 JULHO 2026', source:'ocr-enhanced', rotation:0 };
    const grid = api.findGrid(pg);
    const cols = api.pdfDateCols(pg, grid, 'Escala de Folgas - 36 - 07-07-2026.pdf');
    return { gridDays:grid?.days, cols };
  });
  expect(result.gridDays).toHaveLength(15);
  expect(result.cols).toHaveLength(31);
  expect(result.cols[0].date).toBe('2026-07-01');
  expect(result.cols.at(-1).date).toBe('2026-07-31');
});

test('RC62.1 normalizes common OCR turn-code and cargo confusions', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62;
    return {
      codes:['113','718','TG','T1D','F'].map(x => api.code(x)),
      cargo:api.splitNameCargo('FILIPE GUEDES PAZ LIDER CAIKA')
    };
  });
  expect(result.codes).toEqual(['T13','T18','T6','T14','F']);
  expect(result.cargo).toEqual({ name:'FILIPE GUEDES PAZ', cargo:'LIDER CAIXA' });
});

test('RC62.1 table preprocessing keeps a synthetic calendar canvas usable', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(() => {
    const api = window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62;
    const c=document.createElement('canvas');c.width=720;c.height=360;
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
    x.strokeStyle='#000';x.lineWidth=1;
    const left=80,top=50,stepX=18,stepY=20;
    for(let i=0;i<=31;i++){x.beginPath();x.moveTo(left+i*stepX,top);x.lineTo(left+i*stepX,top+12*stepY);x.stroke()}
    for(let i=0;i<=12;i++){x.beginPath();x.moveTo(left,top+i*stepY);x.lineTo(left+31*stepX,top+i*stepY);x.stroke()}
    x.fillStyle='#444';x.fillRect(left+8*stepX+1,top+2*stepY+1,stepX-2,stepY-2);
    x.fillStyle='#fff';x.font='12px sans-serif';x.fillText('F',left+8*stepX+5,top+2*stepY+14);
    const out=api.prepareTableCanvas(c);
    return {w:out.width,h:out.height,changed:out!==c};
  });
  expect(result.w).toBeGreaterThan(400);
  expect(result.h).toBeGreaterThan(150);
});
