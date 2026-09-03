const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_MONITOR_REPORT_RC63 && window.ADERENCIA_OPERATIONAL_FLAGS && window.ADERENCIA_REPORT_BRAND);
}

test('monitor PDF RC63.3 carries company header, competence and operational statuses', async ({ page }) => {
  await openApp(page);
  const out=await page.evaluate(async () => {
    localStorage.setItem('aderenciaHistoricoV2',JSON.stringify([
      {store:'ML10',month:7,year:2026,adherence:96.25,savedAt:'2026-08-10T10:00:00.000Z'}
    ]));
    const flags=window.ADERENCIA_OPERATIONAL_FLAGS;
    flags.set({store:'ML10',month:7,year:2026,late:true,certified:true});
    flags.set({store:'ML24',month:7,year:2026,exception:true,exceptionReason:'Reconstrução após sinistro'});
    document.getElementById('monitorMonth').value='7';
    document.getElementById('monitorYear').value='2026';
    const calls={text:[],images:0,saved:null};
    class FakePDF{
      setFillColor(){} rect(){} setTextColor(){} setFont(){} setFontSize(){} roundedRect(){} setDrawColor(){} circle(){} line(){}
      addImage(){calls.images++}
      text(t){calls.text.push(String(t))}
      splitTextToSize(t){return [String(t)]}
      getTextWidth(t){return String(t).length*.45}
      save(name){calls.saved=name}
    }
    const original=window.jspdf.jsPDF;
    window.jspdf.jsPDF=FakePDF;
    try{await window.ADERENCIA_MONITOR_REPORT_RC63.exportMonitor()}finally{window.jspdf.jsPDF=original}
    return calls;
  });
  expect(out.saved).toBe('Monitoramento_07_2026.pdf');
  expect(out.images).toBeGreaterThan(0);
  expect(out.text).toContain('Maravilhas do Lar');
  expect(out.text).toContain('Painel de Monitoramento');
  expect(out.text).toContain('Julho • 2026');
  expect(out.text).toContain('INATIVA');
  expect(out.text).toContain('EXCEÇÃO');
  expect(out.text).toContain('ENVIO APÓS O PRAZO');
  expect(out.text).toContain('CERTIFICAÇÃO POR AMOSTRAGEM');
  expect(out.text).toContain('ATRASO');
  expect(out.text).toContain('AMOSTRAGEM');
});
