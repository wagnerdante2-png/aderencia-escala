const { test, expect } = require('@playwright/test');

async function openApp(page){
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.ADERENCIA_SCHEDULE_HARDENING);
}

test('ML31 pattern: tiny Excel employee coverage is rejected as suspicious', async ({ page }) => {
  await openApp(page);
  const reason = await page.evaluate(() => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 48 funcionário(s) • ML31 • 3090 marcações';
    return window.ADERENCIA_SCHEDULE_HARDENING.suspiciousRecognition(
      'Reconhecida: 3 funcionário(s) • ML31 • 28 turnos • 01/01/2026 a 31/12/2026',
      { store:'ML31', start:'2026-06-11', end:'2026-07-10' }
    );
  });
  expect(reason).toMatch(/^cobertura-colaboradores-3-de-48$/);
});

test('ML31 pattern: schedule spanning the whole year is rejected against point competence', async ({ page }) => {
  await openApp(page);
  const reason = await page.evaluate(() => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 48 funcionário(s) • ML31 • 3090 marcações';
    return window.ADERENCIA_SCHEDULE_HARDENING.suspiciousRecognition(
      'Reconhecida: 48 funcionário(s) • ML31 • 28 turnos • 01/01/2026 a 31/12/2026',
      { store:'ML31', start:'2026-06-11', end:'2026-07-10' }
    );
  });
  expect(reason).toContain('periodo-fora-do-espelho');
});

test('normal monthly Excel recognition is not classified as suspicious', async ({ page }) => {
  await openApp(page);
  const reason = await page.evaluate(() => {
    document.getElementById('pointStatus').textContent = 'Reconhecido: 25 funcionário(s) • ML32 • 1906 marcações';
    return window.ADERENCIA_SCHEDULE_HARDENING.suspiciousRecognition(
      'Reconhecida: 24 funcionário(s) • ML32 • 28 turnos • 11/06/2026 a 10/07/2026',
      { store:'ML32', start:'2026-06-11', end:'2026-07-10' }
    );
  });
  expect(reason).toBeNull();
});

test('point context is cleared while a new point file is not yet recognized', async ({ page }) => {
  await openApp(page);
  const ctx = await page.evaluate(() => {
    document.getElementById('pointStatus').textContent = 'Lendo espelho...';
    return window.ADERENCIA_SCHEDULE_HARDENING.pointContext();
  });
  expect(ctx).toEqual({ store:null, start:null, end:null });
});

test('RC51 integrity accepts schedule hardening patch releases', async ({ page }) => {
  await openApp(page);
  const state = await page.evaluate(() => {
    const health = window.ADERENCIA_RUN_RC50_CHECK();
    const check = health.checks.find(x => x.name === 'schedule-hardening');
    return { version:window.ADERENCIA_SCHEDULE_HARDENING.version, ok:check?.ok };
  });
  expect(state.version).toMatch(/^RC51\./);
  expect(state.ok).toBe(true);
});
