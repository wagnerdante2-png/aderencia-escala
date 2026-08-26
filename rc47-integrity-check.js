(function(){
'use strict';
function run(){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
  add('version',window.ADERENCIA_VERSION==='v1.0 RC47',window.ADERENCIA_VERSION||'ausente');
  add('active-modules',Array.isArray(window.ADERENCIA_ACTIVE_MODULES)&&window.ADERENCIA_ACTIVE_MODULES.length>10,`${window.ADERENCIA_ACTIVE_MODULES?.length||0} módulos`);
  try{const a=window.ADERENCIA_ACTIVE_MODULES||[],dups=a.filter((x,i)=>a.indexOf(x)!==i);add('no-duplicate-modules',dups.length===0,dups.join(', '))}catch(e){add('no-duplicate-modules',false,e.message)}
  add('runtime-cache',!!window.ADERENCIA_RUNTIME_CACHE,window.ADERENCIA_RUNTIME_CACHE?.version||'ausente');
  add('history',!!window.ADERENCIA_HISTORY);
  add('period-api',!!window.ADERENCIA_PERIOD);
  add('period-coherence',!!window.ADERENCIA_PERIOD_COHERENCE);
  add('period-alias',window.ADERENCIA_GLOBAL_PERIOD===window.ADERENCIA_PERIOD);
  add('navigation',!!window.ADERENCIA_NAVIGATION);
  add('divergence-dashboard',!!window.ADERENCIA_DIVERGENCE_DASHBOARD);
  add('divergence-capture',!!window.__ADERENCIA_DIVERGENCE_CAPTURE_RC20__);
  add('pdf-parser',window.ADERENCIA_PDF_PARSER_VERSION==='RC28',window.ADERENCIA_PDF_PARSER_VERSION||'ausente');
  add('pdf-xlsx-compat',window.ADERENCIA_PDF_XLSX_COMPAT_VERSION==='RC21',window.ADERENCIA_PDF_XLSX_COMPAT_VERSION||'ausente');
  add('recurrence',!!window.ADERENCIA_RECURRENCE);
  add('store-registry',!!window.ADERENCIA_STORE_REGISTRY);
  add('ml61-region',window.ADERENCIA_STORE_REGISTRY?.regionOf?.('ML61')==='GUARDIÕES DA CHAMA',window.ADERENCIA_STORE_REGISTRY?.regionOf?.('ML61')||'ausente');
  try{const sample=[{store:'ML01',month:6,year:2026,occurrences:[{employee:'TESTE',registration:'1',type:'DESVIO_ENTRADA_GT_90'}]},{store:'ML01',month:7,year:2026,occurrences:[{employee:'TESTE',registration:'1',type:'DESVIO_ENTRADA_GT_90'}]}],a=window.ADERENCIA_RECURRENCE?.aggregate?.(sample,'all'),s=a?.stores?.[0];add('recurrence-rule',!!s&&s.repeat.size===1&&s.people.size===1,JSON.stringify({people:s?.people?.size,repeat:s?.repeat?.size}))}catch(e){add('recurrence-rule',false,e.message)}
  try{const map=window.ADERENCIA_NAVIGATION?.map||{},missing=Object.entries(map).filter(([tab,view])=>document.getElementById(tab)&&!document.getElementById(view));add('navigation-targets',missing.length===0,missing.map(x=>x.join('→')).join(', '))}catch(e){add('navigation-targets',false,e.message)}
  try{const p=window.ADERENCIA_PERIOD?.get?.(),valid=p&&Number.isInteger(+p.month)&&+p.month>=1&&+p.month<=12&&Number.isInteger(+p.year);add('period-state',valid,p?`${p.month}/${p.year}`:'ausente')}catch(e){add('period-state',false,e.message)}
  if(window.ADERENCIA_DIVERGENCE_AUDIT)add('divergence-audit',window.ADERENCIA_DIVERGENCE_AUDIT.ok!==false,window.ADERENCIA_DIVERGENCE_AUDIT.ok===false?'inconsistências detectadas':'ok');
  const ok=checks.every(x=>x.ok);window.ADERENCIA_RC47_HEALTH={ok,checks,cacheStats:window.ADERENCIA_RUNTIME_CACHE?.stats||null,checkedAt:new Date().toISOString()};
  if(!ok)console.warn('RC47 integrity issues',checks.filter(x=>!x.ok));else console.info('RC47 integrity OK',window.ADERENCIA_RC47_HEALTH.cacheStats||'');
  return window.ADERENCIA_RC47_HEALTH;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,320),{once:true});else setTimeout(run,320);
window.ADERENCIA_RUN_RC47_CHECK=run;
})();