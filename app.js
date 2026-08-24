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
    let inDailyTable = true;

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
            inDailyTable = true;
          }
          continue;
        }

        if (!current) continue;

        const ml = (line.match(/\bML\s*0*(\d{1,3})\b/i) || [])[1];
        if (ml) {
          current.store = `ML${String(Number(ml)).padStart(2, '0')}`;
          if (!result.store) result.store = current.store;
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
      /\b(T\d{1,2})\b[^\n]{0,35}?([0-2]\d:[0-5]\d)[^\n]{0,12}?([0-2]\d:[0-5]\d)/gi
    ];

    for (const re of patterns) {
      for (const m of clean.matchAll(re)) {
        const code = norm(m[1]);
        if (!turns.has(code)) turns.set(code, { start: m[2], end: m[3] });
      }
    }
    return turns;
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
        .filter(i => Math.abs(i.y - headerY) < 15 && /^\d{1,2}$/.test(i.text) && Number(i.text) >= 1 && Number(i.text) <= 31 && i.x > cargoItem.x + 20)
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
          i.x >= firstDayX - 10 && i.x <= lastDayX + 20 &&
          /^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE)$/i.test(i.text)
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
    const br = isoFromBR(v);
    return br;
  }

  function locateScheduleGrid(rows) {
    const limit = Math.min(rows.length, 180);
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

  function parseScheduleWorkbook(buffer) {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
    let chosen = null;

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
      const grid = locateScheduleGrid(rows);
      if (!grid) continue;

      let codeCount = 0;
      for (const row of rows.slice(grid.nameRow + 1, grid.nameRow + 80)) {
        for (const v of row || []) {
          if (/^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE)$/i.test(cellText(v))) codeCount++;
        }
      }
      const score = grid.score + codeCount;
      if (!chosen || score > chosen.score) chosen = { sheetName, rows, grid, score };
    }

    if (!chosen) throw new Error('Não encontrei uma aba com a estrutura da Escala Operacional.');

    const rows = chosen.rows;
    const grid = chosen.grid;
    const text = rows.map(r => (r || []).map(cellText).join(' | ')).join('\n');
    const result = {
      type: 'schedule', source: 'excel', sheet: chosen.sheetName,
      store: detectStore(text), periodStart: null, periodEnd: null,
      employees: new Map(), turns: parseTurnLegend(text), warnings: []
    };

    const { month, year } = inferMonthYear(text);

    let dateRowIndex = -1;
    let dateCols = [];
    for (let r = Math.max(0, Math.min(grid.nameRow, grid.cargoRow) - 4); r <= Math.min(rows.length - 1, Math.max(grid.nameRow, grid.cargoRow) + 4); r++) {
      const candidates = [];
      for (let c = Math.max(grid.nameCol, grid.cargoCol) + 1; c < (rows[r] || []).length; c++) {
        const v = rows[r][c];
        const iso = dateFromCell(v);
        const n = Number(cellText(v));
        if (iso) candidates.push({ c, date: iso });
        else if (Number.isInteger(n) && n >= 1 && n <= 31) candidates.push({ c, day: n });
      }
      if (candidates.length > dateCols.length) {
        dateRowIndex = r;
        dateCols = candidates;
      }
    }

    if (dateCols.length < 20) throw new Error('Não consegui identificar as datas da escala Excel.');

    if (!dateCols.some(x => x.date)) {
      const built = buildDates(dateCols.map(x => x.day), month, year);
      dateCols = dateCols.map((x, i) => ({ c: x.c, date: built[i] }));
    } else {
      dateCols = dateCols.filter(x => x.date);
    }

    const dataStartRow = Math.max(grid.nameRow, grid.cargoRow) + 1;
    for (let r = dataStartRow; r < rows.length; r++) {
      const name = cellText((rows[r] || [])[grid.nameCol]);
      if (!name) continue;
      const nameNorm = norm(name);
      if (!nameNorm || /^(TOTAL|LEGENDA|GERENCIAL|MOTOR DE LANCAMENTOS|CONSOLIDADO)$/.test(nameNorm)) continue;

      const recognized = [];
      for (const d of dateCols) {
        const code = norm(cellText((rows[r] || [])[d.c]));
        if (/^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE)$/.test(code)) {
          recognized.push({ date: d.date, code });
        }
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
      return { emp: points.get(scheduleEmp.key), key: scheduleEmp.key, confidence: 1 };
    }

    let best = null;
    for (const [key, p] of points) {
      if (used.has(key)) continue;
      const s = similarity(scheduleEmp.key, key);
      if (!best || s > best.confidence) best = { emp: p, key, confidence: s };
    }
    return best && best.confidence >= 0.92 ? best : null;
  }

  function calculate() {
    if (!pointData || !scheduleData) return;

    const warnings = [];
    if (pointData.store && scheduleData.store && pointData.store !== scheduleData.store) {
      throw new Error(`Arquivos de lojas diferentes: ponto ${pointData.store} e escala ${scheduleData.store}.`);
    }

    const start = [pointData.periodStart, scheduleData.periodStart].filter(Boolean).sort().pop() || null;
    const end = [pointData.periodEnd, scheduleData.periodEnd].filter(Boolean).sort()[0] || null;
    if (start && end && start > end) {
      throw new Error('Os períodos do ponto e da escala não possuem datas em comum.');
    }

    const used = new Set();
    let matched = 0;
    let deviations = 0;
    let nonConformities = 0;
    let totalMarks = 0;
    let unresolvedTurns = 0;
    const unmatched = [];

    for (const scheduleEmp of scheduleData.employees.values()) {
      const match = findPointEmployee(scheduleEmp, pointData.employees, used);
      if (!match) {
        unmatched.push(scheduleEmp.name);
        continue;
      }

      used.add(match.key);
      matched++;

      for (const [date, sday] of scheduleEmp.days) {
        if (start && date < start) continue;
        if (end && date > end) continue;

        const pday = match.emp.days.get(date);
        if (!pday || !pday.marks.length) continue;

        totalMarks += pday.marks.length;

        if (NON_WORK_CODES.has(sday.code)) {
          nonConformities++;
          continue;
        }

        if (/^T\d{1,2}$/.test(sday.code)) {
          if (!sday.start) {
            unresolvedTurns++;
            continue;
          }
          if (pday.firstEntry && timeDiff(sday.start, pday.firstEntry) > 90) deviations++;
        }
      }
    }

    if (!matched) throw new Error('Nenhum colaborador pôde ser conciliado entre a escala e o espelho de ponto.');
    if (!totalMarks) throw new Error('Não encontrei marcações utilizáveis nas datas conciliadas.');

    if (unmatched.length) warnings.push(`${unmatched.length} colaborador(es) da escala não foram conciliados por nome.`);
    if (unresolvedTurns) warnings.push(`${unresolvedTurns} dia(s) tinham código de turno sem horário reconhecido na legenda e não foram penalizados.`);
    if (!pointData.store || !scheduleData.store) warnings.push('Não foi possível validar automaticamente a loja em um dos arquivos.');

    const adherence = 1 - (deviations + 10 * nonConformities) / totalMarks;

    $('resultPercent').textContent = fmtPct(adherence);
    $('resultStore').textContent = scheduleData.store || pointData.store || '';
    $('matchedPeople').textContent = `${matched}/${scheduleData.employees.size}`;
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
      setStatus('pointStatus', `Reconhecido: ${pointData.employees.size} funcionário(s)${pointData.store ? ` • ${pointData.store}` : ''}`, true);
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
      setStatus('scheduleStatus', `Reconhecida: ${scheduleData.employees.size} funcionário(s)${scheduleData.store ? ` • ${scheduleData.store}` : ''}`, true);
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
    $('resultCard').classList.add('hidden');
    updateCalculateState();
  });

  updateCalculateState();
})();