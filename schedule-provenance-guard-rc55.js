(function(){
'use strict';
const h=window.ADERENCIA_SCHEDULE_HARDENING;
if(!h||h.__RC55_PROVENANCE_GUARD__)return;
const storeFromName=name=>{const s=String(name||''),m=s.match(/(?:^|[^A-Z0-9])ML[\s_-]*0*(\d{1,3})(?=$|[^0-9])/i)||s.match(/(?:^|[^A-Z0-9])LOJA[\s_-]*(?:ML[\s_-]*)?0*(\d{1,3})(?=$|[^0-9])/i);return m?`ML${String(+m[1]).padStart(2,'0')}`:null};
const baseNormalize=h.normalizeExcel.bind(h);
h.normalizeExcel=async function(file,ctx){
 if(h.isSyntheticScheduleFile?.(file?.name)){
  const fileStore=storeFromName(file?.name);
  if(!ctx?.store||!fileStore||fileStore!==ctx.store)throw new Error(`RC55: loja não pôde ser confirmada contra o espelho (${fileStore||'não identificada'} ≠ ${ctx?.store||'sem contexto'}).`);
 }
 return baseNormalize(file,ctx);
};
h.__RC55_PROVENANCE_GUARD__=true;
h.provenanceGuardVersion='RC55.1';
h.storeFromSyntheticName=storeFromName;
})();