const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_HARDENING && !!window.ADERENCIA_SCHEDULE_PREPROCESS && !!window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61 && !!window.XLSX);
}

test('RC61 normalizes an ML08 workbook even when residual ML01 template metadata exists', async ({ page }) => {
  await openApp(page);
  const diagnostic=await page.evaluate(async()=>{
    const api=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61;
    const employeeNames=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const normName=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join(' ');
    const people=employeeNames.map((name,i)=>({id:String(i+1),registration:String(i+1),name,plans:[]}));
    const point={ctx:{store:'ML08',start:'2026-07-11',end:'2026-08-10'},people,byReg:new Map(people.map(p=>[p.registration,p])),byName:new Map(people.map(p=>[normName(p.name),p]))};

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
      ['ML01 - RESIDUO DE TEMPLATE'],['ML02'],['ML03'],['ML08 - CAMPINAS MORAES SALES']
    ]),'Configuração');
    const dates=Array.from({length:31},(_,i)=>new Date(2026,6,11+i,12));
    const rows=[['Modelo 1.2'],['Nome','Cargo',...dates],...employeeNames.map((n,j)=>[n,'OPERADOR DE LOJA I',...dates.map((_,i)=>(i+j)%7===6?'F':'T1')])];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Andar no Tempo');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['T1 | 08:00 às 17:00']]),'Legenda');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala - Novo Modelo - 1.2 ML08.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

    const out=await api.normalizeExcel(file,point);
    const parsed=XLSX.read(await out.arrayBuffer(),{type:'array',cellDates:true});
    const table=XLSX.utils.sheet_to_json(parsed.Sheets['Escala Ponto'],{header:1,defval:'',raw:false});
    return {
      name:out.name,
      sheets:parsed.SheetNames,
      header:table[2],
      audit:api.last
    };
  });

  console.log('RC61_RESIDUAL_TEMPLATE_DIAGNOSTIC',JSON.stringify(diagnostic));
  expect(diagnostic.name).toMatch(/^RC51_RC61_ML08_/);
  expect(diagnostic.sheets).toContain('Escala Ponto');
  expect(diagnostic.header.slice(2)).toHaveLength(31);
  expect(diagnostic.header[2]).toBe('11/07/2026');
  expect(diagnostic.header.at(-1)).toBe('10/08/2026');
  expect(diagnostic.audit.store).toBe('ML08');
  expect(diagnostic.audit.matchedPeople).toBe(5);
  expect(diagnostic.audit.cellCoverage).toBe(1);
});
