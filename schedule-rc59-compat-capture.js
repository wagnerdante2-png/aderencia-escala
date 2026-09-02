(function(){
'use strict';
if(window.__ADERENCIA_RC59_COMPAT_CAPTURE__)return;
window.__ADERENCIA_RC59_COMPAT_CAPTURE__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING;
if(h?.normalizeExcel)window.ADERENCIA_PRE_RC59_NORMALIZE=h.normalizeExcel.bind(h);
})();