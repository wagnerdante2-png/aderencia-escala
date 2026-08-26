(function(){
'use strict';
if(window.__ADERENCIA_RC39_INTEGRITY_CHECK__)return;
window.__ADERENCIA_RC39_INTEGRITY_CHECK__=true;
const results=[];
const add=(name,ok,detail='')=>results.push({name,ok:!!ok,detail:String(detail||'')});
const competence=start=>{const m=String(start||'').match(/^(20\d{2})-(\d{2})-(\d{2})$/);return m?`${m[1]}-${m[2]}`:null};
function run(){
  add('version',window.ADERENCIA_VERSION==='v1.0 RC39',window.ADERENCIA_VERSION);
  add('competence 11/06→10/07',competence('2026-06-11')==='2026-06');
  add('competence 11/07→10/08',competence('2026-07-11')==='2026-07');
  add('competence year rollover',competence('2026-12-11')==='2026-12');
  add('history api',!!window.ADERENCIA_HISTORY?.load&&!!window.ADERENCIA_HISTORY?.saveAll);
  add('competence api',!!window.ADERENCIA_COMPETENCE?.fromAnalysis);
  add('global period api',!!window.ADERENCIA_PERIOD?.get&&!!window.ADERENCIA_PERIOD?.set);
  add('evolution api',!!window.ADERENCIA_EVOLUTION?.render);
  add('divergence dashboard',!!window.__ADERENCIA_DIVERGENCE_DASHBOARD__);
  add('canonical divergence capture',!!window.__ADERENCIA_DIVERGENCE_CAPTURE_RC20__);
  add('store registry',!!window.ADERENCIA_STORE_REGISTRY?.load);
  const ml61=window.ADERENCIA_STORE_REGISTRY?.regionOf?.('ML61');
  add('ML61 regional',ml61==='GUARDIÕES DA CHAMA',ml61||'');
  const failures=results.filter(x=>!x.ok);
  window.ADERENCIA_RC39_HEALTH={ok:!failures.length,checkedAt:new Date().toISOString(),checks:results,failures};
  window.ADERENCIA_RC38_HEALTH=window.ADERENCIA_RC39_HEALTH;
  if(failures.length)console.error('RC39: falha na auditoria de integridade',failures);
  else console.info('RC39: auditoria de integridade aprovada',results);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,300));else setTimeout(run,300);
})();