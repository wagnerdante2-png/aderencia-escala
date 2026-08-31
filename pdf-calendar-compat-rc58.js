(function(){
'use strict';
if(window.__ADERENCIA_PDF_CALENDAR_COMPAT_RC58__)return;
window.__ADERENCIA_PDF_CALENDAR_COMPAT_RC58__=true;
const api=window.ADERENCIA_PDF_CALENDAR_RC58;
if(!api)return;
function proportionalPolicy(al,expectedDays){
  const computedDays=Array.isArray(al?.pairs)?al.pairs.length:0;
  const total=Math.max(0,Number(expectedDays)||0);
  const coverage=total?computedDays/total:0;
  return {
    accepted:computedDays>0,
    proportional:total>0&&computedDays<total,
    computedDays,
    expectedDays:total,
    coverage
  };
}
if(typeof api.proportionalPolicy!=='function')api.proportionalPolicy=proportionalPolicy;
window.ADERENCIA_PDF_CALENDAR_RC57=api;
window.ADERENCIA_PDF_CALENDAR_RC56=api;
window.ADERENCIA_PDF_CALENDAR_COMPAT_RC58={version:'RC58.2',proportionalPolicy};
})();
