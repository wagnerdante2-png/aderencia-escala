(function () {
  'use strict';

  if (window.XLSX && XLSX.utils && XLSX.utils.sheet_to_json) {
    const originalSheetToJson = XLSX.utils.sheet_to_json.bind(XLSX.utils);

    function sheetSize(ws) {
      try {
        if (!ws || !ws['!ref']) return { rows: 0, cols: 0 };
        const range = XLSX.utils.decode_range(ws['!ref']);
        return {
          rows: range.e.r - range.s.r + 1,
          cols: range.e.c - range.s.c + 1
        };
      } catch (_) {
        return { rows: 0, cols: 0 };
      }
    }

    XLSX.utils.sheet_to_json = function guardedSheetToJson(ws, options) {
      const size = sheetSize(ws);
      // O arquivo operacional possui abas históricas gigantes que não fazem parte
      // da escala. Convertê-las integralmente no navegador pode derrubar a aba.
      if (size.rows > 5000 || size.cols > 1000) return [];
      return originalSheetToJson(ws, options);
    };
  }

  /*
   * Proteção para a inferência de mês do app.js.
   *
   * A escala em PDF contém nomes de colaboradores. Um colaborador chamado
   * "MARCO ANTONIO ..." fazia o algoritmo antigo encontrar MARCO antes de JULHO
   * e interpretar uma escala de julho como março. Quando app.js procura nomes de
   * meses dentro de um texto grande, exigimos que o mês esteja ligado ao ano
   * (ex.: JULHO 2026), como ocorre no cabeçalho da escala. Assim nomes próprios
   * deixam de ser confundidos com competência.
   */
  const nativeIncludes = String.prototype.includes;
  const MONTH_NAMES = new Set([
    'JANEIRO','FEVEREIRO','MARCO','MARÇO','ABRIL','MAIO','JUNHO',
    'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
  ]);

  String.prototype.includes = function(searchString, position) {
    const search = String(searchString);
    const source = String(this);

    if (MONTH_NAMES.has(search) && source.length > 500) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // O cabeçalho pode ter alguns termos entre o mês e o ano dependendo de
      // como o PDF foi exportado, mas nunca centenas de caracteres.
      const headerMonth = new RegExp('\\b' + escaped + '\\b.{0,60}\\b20\\d{2}\\b', 'i');
      return headerMonth.test(source);
    }

    return nativeIncludes.call(source, searchString, position);
  };
})();
