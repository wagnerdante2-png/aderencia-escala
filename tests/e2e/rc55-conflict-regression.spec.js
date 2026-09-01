const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_PARTIAL && !!window.XLSX);
}

test('RC55 rejects contradictory codes for the same employee and date across candidate grids', async ({ page }) => {
  await openApp(page);
  const result = await page.evaluate(async () => {
    const dates=Array.from({length:21},(_,i)=>`${String(11+i).padStart(2,'0')}/07/2026`);
    const employees=['ANA TESTE','BIA TESTE','CARLA TESTE','DORA TESTE','ELISA TESTE'];
    const build=(conflict=false)=>[
      ['Nome','Cargo',...dates],
      ...employees.map((name,i)=>[name,'OPERADOR',...dates.map((_,j)=>conflict&&i===0&&j===0?'F':'T1')]),
      ['T1 | 08:00 às 17:00']
    ];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(build(false)),'Grade A');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(build(true)),'Grade B');
    const file=new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],'Escala ML10 conflitante.xlsx');
    try{
      await window.ADERENCIA_SCHEDULE_PARTIAL.partial(file,{store:'ML10',start:'2026-07-11',end:'2026-08-10'});
      return {accepted:true,message:''};
    }catch(e){
      return {accepted:false,message:String(e.message)};
    }
  });
  expect(result.accepted).toBeFalsy();
  expect(result.message).toContain('conflito entre grades');
  expect(result.message).toContain('ANA TESTE');
  expect(result.message).toContain('11/07/2026');
  expect(result.message).toContain('Grade A');
  expect(result.message).toContain('Grade B');
});
