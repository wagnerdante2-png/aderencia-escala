(function(){
'use strict';
if(window.__ADERENCIA_RC59_COMPAT_GUARD__)return;
window.__ADERENCIA_RC59_COMPAT_GUARD__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING,legacy=window.ADERENCIA_PRE_RC59_NORMALIZE;
if(!h?.normalizeExcel||!legacy||!window.XLSX)return;
const rc59=h.normalizeExcel.bind(h);
async function isNewModel(file){try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:true});return ['Banco de Dados','Escala Mensal','Configuração'].every(n=>!!wb.Sheets[n])}catch{return false}}
h.normalizeExcel=async function(file,ctx){return await isNewModel(file)?rc59(file,ctx):legacy(file,ctx)};
window.ADERENCIA_RC59_COMPAT_GUARD={version:'RC59.3',isNewModel};
})();