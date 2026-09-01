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
