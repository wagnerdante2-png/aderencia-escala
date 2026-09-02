const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_RC59_POINT_TABLE_GUARD);
});

test('RC59.4 reads effective Horários when visual columns precede the Turno description', async ({ page }) => {
  const r=await page.evaluate(()=>window.ADERENCIA_RC59_POINT_TABLE_GUARD.plannedTimes('21/06/2026 11:00 13:00 14:00 20:00 614 - ML32 07:00-12:00-13:00-16:00 (QUARTA-FEIRA)'));
  expect(r).toEqual({start:'11:00',end:'20:00',times:['11:00','13:00','14:00','20:00']});
});

test('RC59.4 also handles extracted text where Turno description precedes effective columns', async ({ page }) => {
  const r=await page.evaluate(()=>window.ADERENCIA_RC59_POINT_TABLE_GUARD.plannedTimes('21/06/2026 614 - ML32 07:00-12:00-13:00-16:00 (QUARTA-FEIRA) 11:00 13:00 14:00 20:00'));
  expect(r).toEqual({start:'11:00',end:'20:00',times:['11:00','13:00','14:00','20:00']});
});

test('RC59.4 refuses ambiguous schedule rows instead of guessing', async ({ page }) => {
  const r=await page.evaluate(()=>window.ADERENCIA_RC59_POINT_TABLE_GUARD.plannedTimes('21/06/2026 614 - ML32 07:00-12:00-13:00-16:00'));
  expect(r).toBeNull();
});
