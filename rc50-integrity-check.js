(function(){
'use strict';
function run(){
 const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
 add('version',/^v1\.0 RC(?:5[1-9]|6[0-3])$/.test(window.ADERENCIA_VERSION||''),window.ADERENCIA_VERSION||'ausente');
 const active=window.ADERENCIA_ACTIVE_MODULES||[];
 add('active-modules',Array.isArray(active)&&active.length>10,`${active.length} módulos`);
 add('no-duplicate-modules',new Set(active).size===active.length);
 add('core-health',window.ADERENCIA_HEALTH?.ok===true);
 add('runtime-cache',!!window.ADERENCIA_RUNTIME_CACHE);
 add('ocr-lazy-api',!!window.ADERENCIA_ENSURE_OCR,window.ADERENCIA_OCR_LAZY?.state||'ausente');
 add('ocr-not-eager',!document.querySelector('script[src*="tesseract.min.js"]'));
 add('pdf-security',window.ADERENCIA_PDF_SECURITY?.active===true,window.ADERENCIA_PDF_SECURITY?.version||'ausente');
 add('pdf-no-eval',window.ADERENCIA_PDF_SECURITY?.isEvalSupported===false);
 add('pdf-no-scripting',window.ADERENCIA_PDF_SECURITY?.enableScripting===false);
 add('history',!!window.ADERENCIA_HISTORY);
 add('period-api',!!window.ADERENCIA_PERIOD);
 add('period-coherence',!!window.ADERENCIA_PERIOD_COHERENCE);
 add('period-alias',window.ADERENCIA_GLOBAL_PERIOD===window.ADERENCIA_PERIOD);
 add('navigation',!!window.ADERENCIA_NAVIGATION);
 add('divergence-dashboard',!!window.ADERENCIA_DIVERGENCE_DASHBOARD);
 add('divergence-capture',!!window.__ADERENCIA_DIVERGENCE_CAPTURE_RC20__);
 add('schedule-hardening',/^RC51(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_HARDENING?.version||''),window.ADERENCIA_SCHEDULE_HARDENING?.version||'ausente');
 add('schedule-scan-grid-rc63',/^RC63(?:\.|$)/.test(window.ADERENCIA_SCAN_GRID_RC63?.version||''),window.ADERENCIA_SCAN_GRID_RC63?.version||'ausente');
 add('operational-flags-rc63',/^RC63(?:\.|$)/.test(window.ADERENCIA_OPERATIONAL_FLAGS?.version||''),window.ADERENCIA_OPERATIONAL_FLAGS?.version||'ausente');
 add('ml04-permanent-inactive',window.ADERENCIA_OPERATIONAL_FLAGS?.isInactive?.('ML04')===true);
 add('schedule-adaptive-rc62',/^RC62(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62?.version||''),window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62?.version||'ausente');
 add('schedule-adaptive-rc61',/^RC61(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61?.version||''),window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61?.version||'ausente');
 add('schedule-monthly-bridge',/^RC53(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_BRIDGE?.version||''),window.ADERENCIA_SCHEDULE_BRIDGE?.version||'ausente');
 add('schedule-preprocess',/^RC52(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_PREPROCESS?.version||''),window.ADERENCIA_SCHEDULE_PREPROCESS?.version||'ausente');
 add('schedule-transaction-guard',/^RC58(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_PREPROCESS?.transactionGuardVersion||''),window.ADERENCIA_SCHEDULE_PREPROCESS?.transactionGuardVersion||'ausente');
 add('schedule-real-xlsm-rc59',/^RC59(?:\.|$)/.test(window.ADERENCIA_REAL_XLSM_RC59?.version||''),window.ADERENCIA_REAL_XLSM_RC59?.version||'ausente');
 add('schedule-provenance-guard',/^RC55(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_HARDENING?.provenanceGuardVersion||''),window.ADERENCIA_SCHEDULE_HARDENING?.provenanceGuardVersion||'ausente');
 add('schedule-source-identity-guard',/^RC58(?:\.|$)/.test(window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58?.version||''),window.ADERENCIA_SCHEDULE_SOURCE_GUARD_RC58?.version||'ausente');
 add('pdf-store-header-guard',/^RC57(?:\.|$)/.test(window.ADERENCIA_PDF_STORE_GUARD_RC57?.version||''),window.ADERENCIA_PDF_STORE_GUARD_RC57?.version||'ausente');
 add('pdf-parser',/^(?:RC28\+RC51|RC54|RC55|RC57)$/.test(window.ADERENCIA_PDF_PARSER_VERSION||''),window.ADERENCIA_PDF_PARSER_VERSION||'ausente');
 add('pdf-ocr-fallback',/^RC57(?:\.|$)/.test(window.ADERENCIA_PDF_OCR_RC57?.version||''),window.ADERENCIA_PDF_OCR_RC57?.version||'ausente');
 add('pdf-xlsx-compat',window.ADERENCIA_PDF_XLSX_COMPAT_VERSION==='RC21',window.ADERENCIA_PDF_XLSX_COMPAT_VERSION||'ausente');
 add('recurrence',!!window.ADERENCIA_RECURRENCE);
 add('store-registry',!!window.ADERENCIA_STORE_REGISTRY);
 add('ml61-region',window.ADERENCIA_STORE_REGISTRY?.regionOf?.('ML61')==='GUARDIÕES DA CHAMA',window.ADERENCIA_STORE_REGISTRY?.regionOf?.('ML61')||'ausente');
 try{const sample=[{store:'ML01',month:6,year:2026,occurrences:[{employee:'TESTE',registration:'1',type:'DESVIO_ENTRADA_GT_90'}]},{store:'ML01',month:7,year:2026,occurrences:[{employee:'TESTE',registration:'1',type:'DESVIO_ENTRADA_GT_90'}]}],a=window.ADERENCIA_RECURRENCE?.aggregate?.(sample,'all'),s=a?.stores?.[0];add('recurrence-rule',!!s&&s.repeat.size===1&&s.people.size===1)}catch(e){add('recurrence-rule',false,e.message)}
 try{const p=window.ADERENCIA_PERIOD?.get?.(),valid=p&&Number.isInteger(+p.month)&&+p.month>=1&&+p.month<=12&&Number.isInteger(+p.year);add('period-state',valid,p?`${p.month}/${p.year}`:'ausente')}catch(e){add('period-state',false,e.message)}
 if(window.ADERENCIA_DIVERGENCE_AUDIT)add('divergence-audit',window.ADERENCIA_DIVERGENCE_AUDIT.ok!==false,window.ADERENCIA_DIVERGENCE_AUDIT.ok===false?'inconsistências detectadas':'ok');
 const ok=checks.every(x=>x.ok);window.ADERENCIA_RC50_HEALTH={ok,checks,cacheStats:window.ADERENCIA_RUNTIME_CACHE?.stats||null,ocr:window.ADERENCIA_OCR_LAZY||null,checkedAt:new Date().toISOString()};
 if(!ok)console.warn('RC63 integrity issues',checks.filter(x=>!x.ok));else console.info('RC63 integrity OK');
 return window.ADERENCIA_RC50_HEALTH;
}
const schedule=()=>setTimeout(run,1200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.ADERENCIA_RUN_RC50_CHECK=run;
})();