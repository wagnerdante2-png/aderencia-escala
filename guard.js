(function () {
  'use strict';

  if (!window.XLSX || !XLSX.utils || !XLSX.utils.sheet_to_json) return;

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

    // O arquivo operacional possui abas históricas gigantes (centenas de milhares
    // de linhas e até 16 mil colunas). Elas não fazem parte da escala e tentar
    // convertê-las integralmente no navegador pode derrubar a aba.
    if (size.rows > 5000 || size.cols > 1000) {
      return [];
    }

    return originalSheetToJson(ws, options);
  };
})();
