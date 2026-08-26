(function(){
'use strict';
if(window.__ADERENCIA_DIVERGENCE_AUDIT_RC42__)return;
window.__ADERENCIA_DIVERGENCE_AUDIT_RC42__=true;
const DETAIL_KEY='aderenciaDivergenciasV1';
const expectedPenalty=o=>o?.type==='FOLGA_AUSENCIA_COM_PONTO'?10:o?.type==='DESVIO_ENTRADA_GT_90'?1:0;
const key=o=>`${o?.employee||''}|${o?.registration||''}|${o?.date||''}|${o?.type||''}`;
function load(){try{const x=JSON.parse(localStorage.getItem(DETAIL_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function auditRow(row){const occ=Array.isArray(row?.occurrences)?row.occurrences:[],seen=new Set(),duplicates=[],badPenalty=[],badShape=[];let dev=0,nc=0,penalty=0;for(const o of occ){const k=key(o);if(seen.has(k))duplicates.push(k);else seen.add(k);const ep=expectedPenalty(o);if(ep!==Number(o?.penalty||0))badPenalty.push({key:k,expected:ep,actual:o?.penalty});if(!o?.employee||!o?.date||!o?.type)badShape.push(k);if(o?.type==='DESVIO_ENTRADA_GT_90')dev++;if(o?.type==='FOLGA_AUSENCIA_COM_PONTO')nc++;penalty+=Number(o?.penalty||0)}return{store:row?.store,month:row?.month,year:row?.year,occurrences:occ.length,dev,nc,penalty,duplicates,badPenalty,badShape,ok:!duplicates.length&&!badPenalty.length&&!badShape.length}}
function run(){const rows=load(),audits=rows.map(auditRow),failures=audits.filter(x=>!x.ok);window.ADERENCIA_DIVERGENCE_AUDIT={ok:!failures.length,checkedAt:new Date().toISOString(),rows:audits,failures};if(failures.length)console.error('RC42: inconsistências no detalhamento persistido',failures);return window.ADERENCIA_DIVERGENCE_AUDIT}
window.addEventListener('aderencia:detailcaptured',()=>setTimeout(run,0));window.addEventListener('aderencia:historychange',()=>setTimeout(run,0));window.addEventListener('aderencia:portableloaded',()=>setTimeout(run,0));if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,900));else setTimeout(run,900);window.ADERENCIA_AUDIT_DIVERGENCES=run;
})();