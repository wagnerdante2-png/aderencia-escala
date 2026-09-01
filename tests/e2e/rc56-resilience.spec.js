const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_ENGINE?.version === 'v4-rc56-resilient');
});

test('motor trata cobertura e confiança como diagnóstico, não como bloqueio', async ({ page }) => {
  const code = await page.evaluate(() => fetch('/engine-v4.js').then(r => r.text()));
  expect(code).toContain('indicador mantido como diagnóstico');
  expect(code).toContain('resultado proporcional preservado');
  expect(code).toContain('unresolvedMarks');
  expect(code).not.toMatch(/structCoverage\s*<\s*\.95\s*\)\s*throw/);
  expect(code).not.toMatch(/confidence\s*<\s*88\s*\)\s*throw/);
  expect(code).not.toContain('alert(e.message)');
  expect(code).not.toContain('alert(err.message)');
});

test('RC58 registra turno sem legenda e motor exclui as marcações afetadas sem inventar horário', async ({ page }) => {
  const state = await page.evaluate(async () => ({
    parser: await fetch('/pdf-schedule-parser-rc58.js').then(r => r.text()),
    engine: await fetch('/engine-v4.js').then(r => r.text()),
    active: window.ADERENCIA_PDF_PARSER_VERSION
  }));
  expect(state.active).toBe('RC58');
  expect(state.parser).toContain('missingTurns');
  expect(state.parser).toContain('sem inferir horários');
  expect(state.engine).toContain('if(!sd.start){unresolvedDays++;unresolvedMarks+=pd.marks.length;continue}');
  expect(state.engine).toContain('foram excluídas do denominador; nenhum horário foi inventado');
  expect(state.engine).toContain('turno sem horário conhecido foram excluídos do cálculo; nenhum horário foi inferido');
});

test('motor exclui de fato do denominador um turno sem horário no fluxo real de arquivos', async ({ page }) => {
  await page.waitForFunction(() => !!window.jspdf?.jsPDF && !!window.XLSX);
  const result = await page.evaluate(async () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(10);
    const lines = [
      'Espelho do Ponto 11/07/2026 - 13/07/2026',
      'Matrícula: 1 Nome: ANA TESTE Chapa: 1 Admissão: 01/01/2020',
      'Função: 1 - OPERADOR DE LOJA I C.C. 1',
      'Departamento: LOJA ML10',
      'Data Dia 1a E.',
      '11/07/2026 SAB 08:00 O 12:00 I 13:00 O 17:00 I',
      '12/07/2026 DOM 09:00 O 12:00 I 13:00 O 18:00 I',
      '13/07/2026 SEG 08:00 O 12:00 I 13:00 O 17:00 I',
      'Horários'
    ];
    lines.forEach((line, i) => pdf.text(line, 10, 15 + i * 7));
    const pointFile = new File([pdf.output('arraybuffer')], 'espelho-ml10.pdf', { type:'application/pdf' });
    const pointDT = new DataTransfer();
    pointDT.items.add(pointFile);
    const pointInput = document.getElementById('pointFile');
    pointInput.files = pointDT.files;
    pointInput.dispatchEvent(new Event('change', { bubbles:true }));

    const wait = async predicate => {
      const limit = Date.now() + 5000;
      while (Date.now() < limit) {
        if (predicate()) return;
        await new Promise(r => setTimeout(r, 25));
      }
      throw new Error('timeout aguardando processamento E2E');
    };
    await wait(() => document.getElementById('pointStatus').textContent.includes('Reconhecido:'));

    const rows = [
      ['ESCALA OPERACIONAL | LOJA ML10'],
      ['Nome','Cargo','11/07/2026','12/07/2026','13/07/2026'],
      ['ANA TESTE','OPERADOR DE LOJA I','T1','T7','T1'],
      [],
      ['T1 | 08:00 às 17:00']
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Escala Ponto');
    const scheduleFile = new File([XLSX.write(wb, { bookType:'xlsx', type:'array' })], 'Escala ML10.xlsx');
    const scheduleDT = new DataTransfer();
    scheduleDT.items.add(scheduleFile);
    const scheduleInput = document.getElementById('scheduleFile');
    scheduleInput.files = scheduleDT.files;
    scheduleInput.dispatchEvent(new Event('change', { bubbles:true }));
    await wait(() => document.getElementById('scheduleStatus').textContent.includes('Reconhecida:'));

    document.getElementById('calculateBtn').click();
    await wait(() => !!window.ADERENCIA_LAST_CALCULATION);
    const calc = window.ADERENCIA_LAST_CALCULATION;
    return {
      total: calc.total,
      unresolvedDays: calc.unresolvedDays,
      unresolvedMarks: calc.unresolvedMarks,
      adherence: calc.adherence,
      warning: document.getElementById('warnings').textContent,
      resultTotal: document.getElementById('totalMarks').textContent
    };
  });
  expect(result.total).toBe(8);
  expect(result.unresolvedDays).toBe(1);
  expect(result.unresolvedMarks).toBe(4);
  expect(result.adherence).toBe(100);
  expect(result.resultTotal).toBe('8');
  expect(result.warning).toContain('turno sem horário conhecido');
  expect(result.warning).toContain('excluídos do cálculo');
});

test('calendário PDF mensal de julho produz interseção proporcional 21 de 31 dias', async ({ page }) => {
  const out = await page.evaluate(() => {
    const expected = [];
    const a = new Date(2026, 6, 11, 12);
    const b = new Date(2026, 7, 10, 12);
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) expected.push(new Date(d));
    const raw = Array.from({ length: 31 }, (_, i) => i + 1);
    const aligned = window.ADERENCIA_PDF_CALENDAR_RC56.alignRawDays(raw, expected, 'JULHO 2026');
    const policy = window.ADERENCIA_PDF_CALENDAR_RC56.proportionalPolicy(aligned, expected.length);
    return { pairs: aligned.pairs.length, computedDays: policy.computedDays, expectedDays: policy.expectedDays, proportional: policy.proportional };
  });
  expect(out).toEqual({ pairs: 21, computedDays: 21, expectedDays: 31, proportional: true });
});

test('bootstrap mantém recuperação Excel RC56 e ativa parser PDF RC58 com aliases legados', async ({ page }) => {
  const state = await page.evaluate(() => ({
    active: window.ADERENCIA_ACTIVE_MODULES.slice(),
    schedule: window.ADERENCIA_SCHEDULE_RESILIENCE?.version,
    parser: window.ADERENCIA_PDF_PARSER_VERSION,
    alias: window.ADERENCIA_PDF_CALENDAR_RC56 === window.ADERENCIA_PDF_CALENDAR_RC57,
    proportionalPolicy: typeof window.ADERENCIA_PDF_CALENDAR_RC56?.proportionalPolicy
  }));
  expect(state.active).toContain('schedule-resilience-rc56.js');
  expect(state.active).toContain('pdf-schedule-parser-rc58.js');
  expect(state.active).toContain('pdf-calendar-compat-rc58.js');
  expect(state.active).not.toContain('pdf-schedule-parser-rc28.js');
  expect(state.schedule).toBe('RC56.1');
  expect(state.parser).toBe('RC58');
  expect(state.alias).toBeTruthy();
  expect(state.proportionalPolicy).toBe('function');
});
