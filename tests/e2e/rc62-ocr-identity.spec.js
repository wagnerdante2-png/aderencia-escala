const { test, expect } = require('@playwright/test');

test('RC62.1 OCR identity bridge reconciles compressed names conservatively', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ADERENCIA_OCR_IDENTITY_RC62 && window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61);
  const result = await page.evaluate(() => {
    const api=window.ADERENCIA_OCR_IDENTITY_RC62;
    const people=[
      {id:'1',name:'ALEXANDRA SANTOS DE MACEDO'},
      {id:'2',name:'PAULA ELYDIA MARIA JUNQUEIRA'},
      {id:'3',name:'PALOMA LIMA SOUZA'},
      {id:'4',name:'GILMARA AUGUSTA MARIANO'}
    ];
    const schedule=[
      {name:'ALEXANDRASANTOSDEMAGEDO'},
      {name:'PAULAELYDIAMARIAJUNQUEIRA'},
      {name:'PALOMALIMASQUZA'},
      {name:'GILMARA AUGUSTA MARIANO'}
    ];
    const aligned=api.alignedPeople(schedule,{people});
    return {
      names:aligned.people.map(x=>x.name),
      changed:aligned.changed,
      clearScore:api.score('PALOMALIMASQUZA','PALOMA LIMA SOUZA'),
      wrongScore:api.score('PALOMALIMASQUZA','ALEXANDRA SANTOS DE MACEDO')
    };
  });
  expect(result.changed).toBe(4);
  expect(result.names).toEqual(['ALEXANDRA SANTOS DE MACEDO','PAULA ELYDIA MARIA JUNQUEIRA','PALOMA LIMA SOUZA','GILMARA AUGUSTA MARIANO']);
  expect(result.clearScore).toBeGreaterThanOrEqual(.80);
  expect(result.clearScore-result.wrongScore).toBeGreaterThan(.10);
});
