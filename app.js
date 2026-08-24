(function () {
  'use strict';

  if (!window.pdfjsLib) {
    alert('Não foi possível carregar o leitor de PDF. Verifique a conexão com a internet e abra novamente o index.html.');
    return;
  }
  if (!window.XLSX) {
    alert('Não foi possível carregar o leitor de Excel. Verifique a conexão com a internet e abra novamente o index.html.');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const $ = (id) => document.getElementById(id);
  const pointInput = $('pointFile');
  const scheduleInput = $('scheduleFile');
  const calculateBtn = $('calculateBtn');
  const resetBtn = $('resetBtn');

  let pointData = null;
  let scheduleData = null;

  const NON_WORK_CODES = new Set(['F', 'FER', 'AF', 'AB', 'AL', 'FF', 'FC', 'NC', 'AE']);
  const DAY_WITHOUT_FIXED_TIME_CODES = new Set(['D']);
  const SCHEDULE_CODE_RE = /^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE|D)$/i;
  const MONTHS = {
    JANEIRO: 0, FEVEREIRO: 1, MARCO: 2, MARÇO: 2, ABRIL: 3, MAIO: 4, JUNHO: 5,
    JULHO: 6, AGOSTO: 7, SETEMBRO: 8, OUTUBRO: 9, NOVEMBRO: 10, DEZEMBRO: 11
  };

  function norm(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isoFromBR(value) {
    const m = String(value).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  function isoDate(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function minutes(t) {
    const p = String(t).split(':').map(Number);
    return p[0] * 60 + p[1];
  }

  function timeDiff(a, b) {
    const d = Math.abs(minutes(a) - minutes(b));
    return Math.min(d, 1440 - d);
  }

  function fmtPct(v) {
    return `${(v * 100).toFixed(2).replace('.', ',')}%`;
  }

  function fmtPct1(v) {
    return `${(v * 100).toFixed(1).replace('.', ',')}%`;
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[m][n];
  }

  function similarity(a, b) {
    return 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
  }

  function tokenSimilarity(a, b) {
    const aa = new Set(a.split(' ').filter(Boolean));
    const bb = new Set(b.split(' ').filter(Boolean));
    const common = [...aa].filter(x => bb.has(x)).length;
    const union = new Set([...aa, ...bb]).size || 1;
    return common / union;
  }

  function setStatus(id, text, ok) {
    const el = $(id);
    el.textContent = text;
    el.classList.remove('muted');
    if (ok) el.classList.add('ok');
    else el.classList.remove('ok');
  }

  function updateCalculateState() {
    calculateBtn.disabled = !(pointData && scheduleData);
  }

  async function pdfPages(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const pages = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items
        .filter(i => i.str && i.str.trim())
        .map(i => ({ text: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width || 0 }));

      const rows = [];
      for (const item of items.slice().sort((a, b) => b.y - a.y || a.x - b.x)) {
        let row = rows.find(r => Math.abs(r.y - item.y) < 2.5);
        if (!row) {
          row = { y: item.y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      }

      rows.forEach(r => {
        r.items.sort((a, b) => a.x - b.x);
        r.text = r.items.map(i => i.text).join(' ');
      });
      rows.sort((a, b) => b.y - a.y);
      pages.push({ page: p, items, rows, text: rows.map(r => r.text).join('\n') });
    }

    return pages;
  }

  function parsePointPages(pages) {
    const result = {
      type: 'point', store: null, periodStart: null, periodEnd: null,
      employees: new Map(), warnings: []
    };
    let current = null;
    let inDailyTable = false;

    for (const page of pages) {
      for (const row of page.rows) {
        const line = row.text;

        const period = line.match(/Espelho\s+do\s+Ponto\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (period) {
          result.periodStart = isoFromBR(period[1]);
          result.periodEnd = isoFromBR(period[2]);
        }

        if (/Matr[ií]cula\s*:/i.test(line) && /Nome\s*:/i.test(line)) {
          const name = (line.match(/Nome\s*:\s*(.*?)(?=\s+(?:Chapa|Admiss[aã]o)\s*:|$)/i) || [])[1];
          const registration = (line.match(/Matr[ií]cula\s*:\s*(.*?)(?=\s+Nome\s*:|$)/i) || [])[1];
          if (name) {
            const key = norm(name);
            if (!result.employees.has(key)) {
              result.employees.set(key, {
                name: name.trim(), key,
                registration: (registration || '').trim(),
                store: null,
                days: new Map()
              });
            }
            current = result.employees.get(key);
            inDailyTable = false;
          }
          continue;
        }

        if (!current) continue;

        const ml = (line.match(/\bML\s*0*(\d{1,3})\b/i) || [])[1];
        if (ml) {
          current.store = `ML${String(Number(ml)).padStart(2, '0')}`;
          if (!result.store) result.store = current.store;
        }

        if (/^Data\s+Dia\s+1a\s+E\./i.test(line)) {
          inDailyTable = true;
          continue;
        }
        if (/^Hor[aá]rios\b/i.test(line) || /^(?:C[oó]digo\s+Descri[cç][aã]o|Assinatura)/i.test(line)) {
          inDailyTable = false;
          continue;
        }
        if (!inDailyTable) continue;

        const dm = line.match(/^(\d{2}\/\d{2}\/\d{4})\b/);
        if (!dm) continue;

        const date = isoFromBR(dm[1]);
        const marks = [...line.matchAll(/\b([0-2]\d:[0-5]\d)\s*(?:O|I|P)\b/g)].map(m => m[1]);
        current.days.set(date, {
          date,
          firstEntry: marks[0] || null,
          marks,
          raw: line
        });
      }
    }

    if (!result.employees.size) {
      throw new Error('Não encontrei blocos de funcionários no espelho de ponto.');
    }
    if (!result.periodStart || !result.periodEnd) {
      throw new Error('Não consegui identificar o período do espelho de ponto.');
    }
    return result;
  }

  function inferMonthYear(text) {
    const normalized = norm(text);
    let month = null;
    for (const [name, idx] of Object.entries(MONTHS)) {
      if (normalized.includes(norm(name))) {
        month = idx;
        break;
      }
    }
    const years = [...String(text).matchAll(/\b(20\d{2})\b/g)].map(m => Number(m[1]));
    return { month, year: years[0] || null };
  }

  function buildDates(dayNumbers, month, year) {
    if (month == null || !year || !dayNumbers.length) return [];
    let m = month;
    let y = year;
    let previous = dayNumbers[0];

    return dayNumbers.map((day, i) => {
      if (i > 0 && day < previous) {
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      }
      previous = day;
      return isoDate(y, m, day);
    });
  }

  function parseTurnLegend(text) {
    const turns = new Map();
    const clean = String(text).replace(/\r/g, '');
    const patterns = [
      /\b(T\d{1,2})\s*(?:\||-|:)?\s*([0-2]\d:[0-5]\d)\s*(?:A|À|AS|ÀS|-)\s*([0-2]\d:[0-5]\d)/gi,
      /\b(T\d{1,2})\b[^\n]{0,40}?([0-2]\d:[0-5]\d)[^\n]{0,16}?([0-2]\d:[0-5]\d)/gi
    ];

    for (const re of patterns) {
      for (const m of clean.matchAll(re)) {
        const code = norm(m[1]);
        if (!turns.has(code)) turns.set(code, { start: m[2], end: m[3] });
      }
    }
    return turns;
  }

  function mergeTurns(target, source) {
    for (const [code, turn] of source) {
      if (!target.has(code)) target.set(code, turn);
    }
    return target;
  }

  function detectStore(text) {
    const ml = (String(text).match(/\bML\s*0*(\d{1,3})\b/i) || [])[1];
    if (ml) return `ML${String(Number(ml)).padStart(2, '0')}`;
    const loja = (String(text).match(/\bLOJA\s*0*(\d{1,3})\b/i) || [])[1];
    return loja ? `ML${String(Number(loja)).padStart(2, '0')}` : null;
  }

  function parseSchedulePdfPages(pages) {
    const allText = pages.map(p => p.text).join('\n');
    const result = {
      type: 'schedule', source: 'pdf', store: detectStore(allText),
      periodStart: null, periodEnd: null,
      employees: new Map(), turns: parseTurnLegend(allText), warnings: []
    };
    const { month, year } = inferMonthYear(allText);

    for (const page of pages) {
      const nomeItem = page.items.find(i => norm(i.text) === 'NOME');
      const cargoItem = page.items.find(i => norm(i.text) === 'CARGO');
      if (!nomeItem || !cargoItem) continue;

      const headerY = nomeItem.y;
      let dayItems = page.items
        .filter(i => Math.abs(i.y - headerY) < 16 && /^\d{1,2}$/.test(i.text) && Number(i.text) >= 1 && Number(i.text) <= 31 && i.x > cargoItem.x + 20)
        .sort((a, b) => a.x - b.x);

      const uniqueDays = [];
      for (const item of dayItems) {
        if (!uniqueDays.some(d => Math.abs(d.x - item.x) < 3)) uniqueDays.push(item);
      }
      dayItems = uniqueDays;
      if (dayItems.length < 20) continue;

      const dates = buildDates(dayItems.map(i => Number(i.text)), month, year);
      const firstDayX = dayItems[0].x;
      const lastDayX = dayItems[dayItems.length - 1].x;

      for (const row of page.rows) {
        if (row.y >= headerY - 3) continue;

        const codes = row.items.filter(i =>
          i.x >= firstDayX - 10 && i.x <= lastDayX + 20 && SCHEDULE_CODE_RE.test(i.text)
        );
        if (codes.length < 5) continue;

        const name = row.items.filter(i => i.x < cargoItem.x - 3).map(i => i.text).join(' ').trim();
        if (!name || norm(name) === 'NOME') continue;

        const key = norm(name);
        const emp = result.employees.get(key) || { name, key, days: new Map() };

        for (const codeItem of codes) {
          let bestIndex = -1;
          let bestDist = Infinity;
          dayItems.forEach((d, idx) => {
            const dist = Math.abs(d.x - codeItem.x);
            if (dist < bestDist) {
              bestDist = dist;
              bestIndex = idx;
            }
          });
          if (bestIndex >= 0 && bestDist < 20 && dates[bestIndex]) {
            const code = norm(codeItem.text);
            const turn = result.turns.get(code);
            emp.days.set(dates[bestIndex], {
              date: dates[bestIndex], code,
              start: turn ? turn.start : null
            });
          }
        }
        result.employees.set(key, emp);
      }
    }

    if (!result.employees.size) {
      throw new Error('Não consegui localizar a matriz Nome × Dias no PDF da escala.');
    }

    const allDates = [...result.employees.values()].flatMap(e => [...e.days.keys()]).sort();
    result.periodStart = allDates[0] || null;
    result.periodEnd = allDates[allDates.length - 1] || null;
    return result;
  }

  function cellText(v) {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString();
    return String(v).trim();
  }

  function serialToIso(v) {
    if (typeof v !== 'number' || v < 30000) return null;
    const o = XLSX.SSF.parse_date_code(v);
    return o ? isoDate(o.y, o.m - 1, o.d) : null;
  }

  function dateFromCell(v) {
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      return isoDate(v.getFullYear(), v.getMonth(), v.getDate());
    }
    const serial = serialToIso(v);
    if (serial) return serial;
    return isoFromBR(v);
  }

  function locateScheduleGrid(rows) {
    const limit = Math.min(rows.length, 220);
    let best = null;

    for (let r = 0; r < limit; r++) {
      for (let c = 0; c < (rows[r] || []).length; c++) {
        if (norm(cellText(rows[r][c])) !== 'NOME') continue;

        let cargo = null;
        for (let rr = Math.max(0, r - 2); rr <= Math.min(limit - 1, r + 2); rr++) {
          for (let cc = 0; cc < (rows[rr] || []).length; cc++) {
            if (norm(cellText(rows[rr][cc])) === 'CARGO') {
              cargo = { r: rr, c: cc };
              break;
            }
          }
          if (cargo) break;
        }

        if (!cargo) continue;
        const score = 100 - Math.abs(cargo.r - r) * 5;
        if (!best || score > best.score) best = { nameRow: r, nameCol: c, cargoRow: cargo.r, cargoCol: cargo.c, score };
      }
    }
    return best;
  }

  function parseTurnLegendFromWorkbook(wb, chosenSheetName) {
    const turns = new Map();
    const preferred = [chosenSheetName, 'Escala Mensal', 'Escala Ponto']
      .filter(Boolean)
      .concat(wb.SheetNames)
      .filter((name, idx, arr) => arr.indexOf(name) === idx);

    for (const sheetName of preferred) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      for (const row of rows) {
        for (const value of row || []) {
          const s = String(value == null ? '' : value).trim();
          if (!/\bT\d{1,2}\b/i.test(s) || !/[0-2]\d:[0-5]\d/.test(s)) continue;
          mergeTurns(turns, parseTurnLegend(s));
        }
      }
      if (turns.size >= 30) break;
    }
    return turns;
  }

  function detectWorkbookStore(wb, chosen) {
    const preferred = [chosen && chosen.sheetName, 'Escala Mensal', 'Escala Ponto', 'Configuração'].filter(Boolean);
    for (const sheetName of [...new Set(preferred)]) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, range: 0 });
      const top = rows.slice(0, 15).map(r => (r || []).slice(0, 50).join(' | ')).join('\n');
      const store = detectStore(top);
      if (store) return store;
    }

    if (chosen && /ANDAR NO TEMPO/i.test(norm(chosen.sheetName))) {
      const rows = chosen.rows;
      for (let r = 0; r < Math.min(12, rows.length); r++) {
        for (let c = 0; c < Math.min(5, (rows[r] || []).length); c++) {
          const v = rows[r][c];
          const n = Number(v);
          if (Number.isInteger(n) && n >= 1 && n <= 999) {
            return `ML${String(n).padStart(2, '0')}`;
          }
        }
      }
    }
    return null;
  }

  function findBestDateRow(rows, grid) {
    let best = null;
    const startRow = Math.max(0, Math.min(grid.nameRow, grid.cargoRow) - 5);
    const endRow = Math.min(rows.length - 1, Math.max(grid.nameRow, grid.cargoRow) + 5);

    for (let r = startRow; r <= endRow; r++) {
      const candidates = [];
      let realDates = 0;
      for (let c = Math.max(grid.nameCol, grid.cargoCol) + 1; c < (rows[r] || []).length; c++) {
        const v = rows[r][c];
        const iso = dateFromCell(v);
        const n = Number(cellText(v));
        if (iso) {
          candidates.push({ c, date: iso });
          realDates++;
        } else if (Number.isInteger(n) && n >= 1 && n <= 31) {
          candidates.push({ c, day: n });
        }
      }
      const score = realDates * 3 + candidates.length;
      if (!best || score > best.score) best = { r, candidates, realDates, score };
    }
    return best;
  }

  function parseScheduleWorkbook(buffer) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
    let chosen = null;
    const orderedSheets = ['Andar no Tempo', 'Escala Ponto', 'Escala Mensal']
      .concat(wb.SheetNames)
      .filter((name, idx, arr) => arr.indexOf(name) === idx);

    for (const sheetName of orderedSheets) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
      const grid = locateScheduleGrid(rows);
      if (!grid) continue;

      const dateRow = findBestDateRow(rows, grid);
      if (!dateRow || dateRow.candidates.length < 20) continue;

      let codeCount = 0;
      const dataStart = Math.max(grid.nameRow, grid.cargoRow) + 1;
      for (const row of rows.slice(dataStart, dataStart + 120)) {
        for (const v of row || []) {
          if (SCHEDULE_CODE_RE.test(cellText(v))) codeCount++;
        }
      }

      const annualBonus = dateRow.realDates >= 300 ? 100000 : 0;
      const score = annualBonus + dateRow.realDates * 30 + dateRow.candidates.length * 5 + codeCount + grid.score;
      if (!chosen || score > chosen.score) chosen = { sheetName, rows, grid, dateRow, score };
      if (dateRow.realDates >= 300 && codeCount >= 100) break;
    }

    if (!chosen) throw new Error('Não encontrei uma aba com a estrutura da Escala Operacional.');

    const workbookTurns = parseTurnLegendFromWorkbook(wb, chosen.sheetName);
    const rows = chosen.rows;
    const grid = chosen.grid;
    const text = rows.map(r => (r || []).map(cellText).join(' | ')).join('\n');
    const turns = new Map();
    mergeTurns(turns, workbookTurns);
    mergeTurns(turns, parseTurnLegend(text));

    const result = {
      type: 'schedule', source: 'excel', sheet: chosen.sheetName,
      store: detectWorkbookStore(wb, chosen), periodStart: null, periodEnd: null,
      employees: new Map(), turns, warnings: []
    };

    const { month, year } = inferMonthYear(text);
    let dateCols = chosen.dateRow.candidates;

    if (!dateCols.some(x => x.date)) {
      const built = buildDates(dateCols.map(x => x.day), month, year);
      dateCols = dateCols.map((x, i) => ({ c: x.c, date: built[i] }));
    } else {
      dateCols = dateCols.filter(x => x.date);
    }

    if (dateCols.length < 20) throw new Error('Não consegui identificar as datas da escala Excel.');

    const dataStartRow = Math.max(grid.nameRow, grid.cargoRow) + 1;
    for (let r = dataStartRow; r < rows.length; r++) {
      const name = cellText((rows[r] || [])[grid.nameCol]);
      if (!name) continue;
      const nameNorm = norm(name);
      if (!nameNorm || /^(TOTAL|LEGENDA|GERENCIAL|MOTOR DE LANCAMENTOS|CONSOLIDADO)$/.test(nameNorm)) continue;

      const recognized = [];
      for (const d of dateCols) {
        const code = norm(cellText((rows[r] || [])[d.c]));
        if (SCHEDULE_CODE_RE.test(code)) recognized.push({ date: d.date, code });
      }
      if (recognized.length < 5) continue;

      const key = nameNorm;
      const emp = { name: name.trim(), key, days: new Map() };
      for (const x of recognized) {
        const turn = result.turns.get(x.code);
        emp.days.set(x.date, { date: x.date, code: x.code, start: turn ? turn.start : null });
      }
      result.employees.set(key, emp);
    }

    if (!result.employees.size) throw new Error('Nenhum colaborador foi reconhecido na escala Excel.');

    const allDates = [...result.employees.values()].flatMap(e => [...e.days.keys()]).sort();
    result.periodStart = allDates[0] || null;
    result.periodEnd = allDates[allDates.length - 1] || null;
    return result;
  }

  function findPointEmployee(scheduleEmp, points, used) {
    if (points.has(scheduleEmp.key) && !used.has(scheduleEmp.key)) {
      return { emp: points.get(scheduleEmp.key), key: scheduleEmp.key, confidence: 1, mode: 'exato' };
    }

    const prefixMatches = [];
    for (const [key, p] of points) {
      if (used.has(key)) continue;
      const shorter = Math.min(scheduleEmp.key.length, key.length);
      if (shorter >= 12 && (scheduleEmp.key.startsWith(key) || key.startsWith(scheduleEmp.key))) {
        prefixMatches.push({ emp: p, key, confidence: shorter / Math.max(scheduleEmp.key.length, key.length), mode: 'nome truncado' });
      }
    }
    if (prefixMatches.length === 1) return prefixMatches[0];

    const candidates = [];
    for (const [key, p] of points) {
      if (used.has(key)) continue;
      const lev = similarity(scheduleEmp.key, key);
      const tok = tokenSimilarity(scheduleEmp.key, key);
      const score = lev * 0.65 + tok * 0.35;
      candidates.push({ emp: p, key, confidence: score, mode: 'aproximado' });
    }
    candidates.sort((a, b) => b.confidence - a.confidence);
    const best = candidates[0];
    const second = candidates[1];
    if (best && best.confidence >= 0.94 && (!second || best.confidence - second.confidence >= 0.04)) return best;
    return null;
  }

  function countPointMarksInPeriod(point, start, end) {
    let total = 0;
    for (const emp of point.employees.values()) {
      for (const [date, day] of emp.days) {
        if (date < start || date > end) continue;
        total += day.marks.length;
      }
    }
    return total;
  }

  function calculate() {
    if (!pointData || !scheduleData) return;

    const warnings = [];
    if (pointData.store && scheduleData.store && pointData.store !== scheduleData.store) {
      throw new Error(`Arquivos de lojas diferentes: ponto ${pointData.store} e escala ${scheduleData.store}.`);
    }
    if (!pointData.store || !scheduleData.store) {
      throw new Error('Não foi possível validar a loja nos dois arquivos. Para um cálculo confiável, a loja precisa ser identificável no ponto e na escala.');
    }

    const start = pointData.periodStart;
    const end = pointData.periodEnd;
    if (!start || !end) throw new Error('Período do espelho de ponto não identificado.');

    if (!scheduleData.periodStart || !scheduleData.periodEnd || scheduleData.periodStart > start || scheduleData.periodEnd < end) {
      throw new Error(`A escala não cobre todo o período do espelho (${start.split('-').reverse().join('/')} a ${end.split('-').reverse().join('/')}). Use a escala correspondente ao mesmo período.`);
    }

    const used = new Set();
    let matched = 0;
    let truncatedMatches = 0;
    let approximateMatches = 0;
    let deviations = 0;
    let nonConformities = 0;
    let totalMarks = 0;
    let unresolvedTurns = 0;
    let unevaluableMarks = 0;
    const unmatchedSchedule = [];

    for (const scheduleEmp of scheduleData.employees.values()) {
      const match = findPointEmployee(scheduleEmp, pointData.employees, used);
      if (!match) {
        unmatchedSchedule.push(scheduleEmp.name);
        continue;
      }

      used.add(match.key);
      matched++;
      if (match.mode === 'nome truncado') truncatedMatches++;
      if (match.mode === 'aproximado') approximateMatches++;

      for (const [date, sday] of scheduleEmp.days) {
        if (date < start || date > end) continue;

        const pday = match.emp.days.get(date);
        if (!pday || !pday.marks.length) continue;

        if (NON_WORK_CODES.has(sday.code)) {
          totalMarks += pday.marks.length;
          nonConformities++;
          continue;
        }

        if (/^T\d{1,2}$/.test(sday.code)) {
          if (!sday.start) {
            unresolvedTurns++;
            unevaluableMarks += pday.marks.length;
            continue;
          }
          totalMarks += pday.marks.length;
          if (pday.firstEntry && timeDiff(sday.start, pday.firstEntry) > 90) deviations++;
          continue;
        }

        if (DAY_WITHOUT_FIXED_TIME_CODES.has(sday.code)) {
          unevaluableMarks += pday.marks.length;
          continue;
        }

        unevaluableMarks += pday.marks.length;
      }
    }

    if (!matched) throw new Error('Nenhum colaborador pôde ser conciliado entre a escala e o espelho de ponto.');
    if (unresolvedTurns) {
      throw new Error(`${unresolvedTurns} dia(s) com marcação possuem turno T sem horário reconhecido. O cálculo foi bloqueado para evitar um percentual incorreto.`);
    }
    if (!totalMarks) throw new Error('Não encontrei marcações utilizáveis nas datas conciliadas.');

    const totalPointMarks = countPointMarksInPeriod(pointData, start, end);
    const markCoverage = totalPointMarks ? totalMarks / totalPointMarks : 0;
    if (markCoverage < 0.98) {
      throw new Error(`Cobertura insuficiente para um resultado confiável: apenas ${fmtPct1(markCoverage)} das marcações do espelho puderam ser cruzadas (${totalMarks}/${totalPointMarks}). Verifique colaboradores/turnos não conciliados.`);
    }

    const pointOnly = [...pointData.employees.entries()]
      .filter(([key]) => !used.has(key))
      .map(([, emp]) => ({
        name: emp.name,
        marks: [...emp.days.entries()].reduce((sum, [date, day]) => sum + (date >= start && date <= end ? day.marks.length : 0), 0)
      }))
      .filter(x => x.marks > 0);

    if (truncatedMatches) warnings.push(`${truncatedMatches} nome(s) truncado(s) no PDF foram conciliados com segurança pelo prefixo do nome.`);
    if (approximateMatches) warnings.push(`${approximateMatches} nome(s) foram conciliados por similaridade controlada.`);
    if (unmatchedSchedule.length) warnings.push(`${unmatchedSchedule.length} colaborador(es) da escala não aparecem no espelho; sem marcações, não alteram o denominador.`);
    if (pointOnly.length) warnings.push(`${pointOnly.length} colaborador(es) do ponto não aparecem na escala; cobertura final das marcações: ${fmtPct1(markCoverage)}.`);
    if (unevaluableMarks) warnings.push(`${unevaluableMarks} marcação(ões) de códigos sem horário fixo foram excluídas do denominador.`);
    warnings.unshift(`Validação automática OK • loja ${pointData.store} • período completo • cobertura ${fmtPct1(markCoverage)} • ${scheduleData.turns.size} turnos reconhecidos.`);

    const adherence = 1 - (deviations + 10 * nonConformities) / totalMarks;

    $('resultPercent').textContent = fmtPct(adherence);
    $('resultStore').textContent = scheduleData.store || pointData.store || '';
    $('matchedPeople').textContent = `${matched}/${pointData.employees.size}`;
    $('deviations').textContent = String(deviations);
    $('nonConformities').textContent = String(nonConformities);
    $('totalMarks').textContent = String(totalMarks);
    $('warnings').innerHTML = warnings.map(w => `<div>${w}</div>`).join('');
    $('resultCard').classList.remove('hidden');
  }

  pointInput.addEventListener('change', async function () {
    const file = pointInput.files && pointInput.files[0];
    pointData = null;
    $('resultCard').classList.add('hidden');
    $('pointFileName').textContent = file ? file.name : 'Nenhum arquivo selecionado';
    if (!file) {
      setStatus('pointStatus', 'Aguardando arquivo', false);
      updateCalculateState();
      return;
    }

    try {
      setStatus('pointStatus', 'Lendo PDF...', false);
      const pages = await pdfPages(file);
      pointData = parsePointPages(pages);
      const total = countPointMarksInPeriod(pointData, pointData.periodStart, pointData.periodEnd);
      setStatus('pointStatus', `Reconhecido: ${pointData.employees.size} funcionário(s) • ${pointData.store || 'loja não identificada'} • ${total} marcações`, true);
    } catch (err) {
      setStatus('pointStatus', `Erro: ${err.message}`, false);
      alert(err.message);
    }
    updateCalculateState();
  });

  scheduleInput.addEventListener('change', async function () {
    const file = scheduleInput.files && scheduleInput.files[0];
    scheduleData = null;
    $('resultCard').classList.add('hidden');
    $('scheduleFileName').textContent = file ? file.name : 'Nenhum arquivo selecionado';
    if (!file) {
      setStatus('scheduleStatus', 'Aguardando arquivo', false);
      updateCalculateState();
      return;
    }

    try {
      const lower = file.name.toLowerCase();
      setStatus('scheduleStatus', 'Lendo escala...', false);
      if (lower.endsWith('.pdf')) {
        scheduleData = parseSchedulePdfPages(await pdfPages(file));
      } else if (/\.(xlsx|xlsm|xls)$/.test(lower)) {
        scheduleData = parseScheduleWorkbook(await file.arrayBuffer());
      } else {
        throw new Error('Formato de escala não suportado. Use PDF, XLSX, XLSM ou XLS.');
      }
      const period = scheduleData.periodStart && scheduleData.periodEnd
        ? ` • ${scheduleData.periodStart.split('-').reverse().join('/')} a ${scheduleData.periodEnd.split('-').reverse().join('/')}`
        : '';
      setStatus('scheduleStatus', `Reconhecida: ${scheduleData.employees.size} funcionário(s) • ${scheduleData.store || 'loja não identificada'} • ${scheduleData.turns.size} turnos${period}`, true);
    } catch (err) {
      setStatus('scheduleStatus', `Erro: ${err.message}`, false);
      alert(err.message);
    }
    updateCalculateState();
  });

  calculateBtn.addEventListener('click', function () {
    try {
      calculate();
    } catch (err) {
      $('resultCard').classList.add('hidden');
      alert(err.message);
    }
  });

  resetBtn.addEventListener('click', function () {
    pointInput.value = '';
    scheduleInput.value = '';
    pointData = null;
    scheduleData = null;
    $('pointFileName').textContent = 'Nenhum arquivo selecionado';
    $('scheduleFileName').textContent = 'Nenhum arquivo selecionado';
    $('pointStatus').textContent = 'Aguardando arquivo';
    $('scheduleStatus').textContent = 'Aguardando arquivo';
    $('pointStatus').classList.remove('ok');
    $('scheduleStatus').classList.remove('ok');
    $('resultCard').classList.add('hidden');
    updateCalculateState();
  });

  updateCalculateState();
})();