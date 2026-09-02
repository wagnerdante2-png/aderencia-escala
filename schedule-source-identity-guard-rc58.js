(function(){
'use strict';
const h=window.ADERENCIA_SCHEDULE_HARDENING;
if(!h||h.__RC58_SOURCE_IDENTITY_GUARD__||!window.XLSX)return;
const baseNormalize=h.normalizeExcel.bind(h);
const store=v=>{const m=String(v||'').match(/\bML[\s_-]*0*(\d{1,3})\b/i)||String(v||'').match(/\bLOJA[\s_-]*(?:ML[\s_-]*)?0*(\d{1,3})\b/i);return m?`ML${String(+m[1]).padStart(2,'0')}`:null};
const stores=v=>{const out=[];for(const m of String(v||'').matchAll(/\bML[\s_-]*0*(\d{1,3})\b/gi))out.push(`ML${String(+m[1]).padStart(2,'0')}`);for(const m of String(v||'').matchAll(/\bLOJA[\s_-]*(?:ML[\s_-]*)?0*(\d{1,3})\b/gi))out.push(`ML${String(+m[1]).padStart(2,'0')}`);return [...new Set(out)]};
function fatal(message,meta={}){const e=new Error(`RC58: ${message}`);e.aderenciaFatal=true;e.code='ADERENCIA_SOURCE_IDENTITY';e.meta=meta;return e}
function weakSheet(name){return /CONFIG|PARAM|LEGENDA|FERIAD|CADAST|BANCO|HIST|DASH|RESUMO|INDICADOR/i.test(String(name||''))}
function operationalStores(wb){const out=new Set();for(const name of wb.SheetNames){if(weakSheet(name))continue;const ws=wb.Sheets[name];if(!ws)continue;let rows=[];try{rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false}).slice(0,30)}catch{continue}for(const row of rows){const text=(row||[]).slice(0,100).join(' | ');if(!/(?:ESCALA|\bLOJA\b|\bML\s*0*\d{1,3}\b)/i.test(text))continue;stores(text).forEach(s=>out.add(s))}}return[...out]}
async function inspect(file,ctx){
 const expected=ctx?.store||null,name=String(file?.name||'');
 if(!file||!expected)return{mode:'no-context',expected,file:name};
 if(h.isSyntheticScheduleFile?.(name))return{mode:'synthetic',expected,file:name};
 if(!/\.(xlsx|xlsm|xls)$/i.test(name))return{mode:'non-excel',expected,file:name};
 const fromName=stores(name);
 if(fromName.length>1)throw fatal(`nome do arquivo contém lojas conflitantes (${fromName.join(', ')}).`,{expected,fromName,file:name});
 if(fromName.length===1){if(fromName[0]!==expected)throw fatal(`loja indicada no nome do arquivo (${fromName[0]}) diverge do espelho (${expected}).`,{expected,fromName,file:name});return{mode:'filename-confirmed',expected,store:fromName[0],file:name}}
 let wb;try{wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellFormula:true})}catch{return{mode:'unreadable-for-guard',expected,file:name}}
 const ops=operationalStores(wb);
 if(ops.length&&!ops.includes(expected))throw fatal(`cabeçalho operacional da escala (${ops.join(', ')}) diverge do espelho (${expected}).`,{expected,operationalStores:ops,file:name});
 return{mode:ops.includes(expected)?'operational-header-confirmed':'no-strong-store-evidence',expected,operationalStores:ops,file:name};
}
h.normalizeExcel=async function(file,ctx){const audit=await inspect(file,ctx);api.lastAudit={...audit,at:new Date().toISOString()};return baseNormalize(file,ctx)};
h.__RC58_SOURCE_IDENTITY_GUARD__=true;
h.sourceIdentityGuardVersion='RC58.1';
const api={version:'RC58.1',store,stores,operationalStores,inspect,fatal,lastAudit:null};
window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58=api;
})();