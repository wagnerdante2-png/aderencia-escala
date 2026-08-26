(function(){
'use strict';
if(window.__ADERENCIA_PERIOD_RENDER_RC44__)return;window.__ADERENCIA_PERIOD_RENDER_RC44__=true;
let bouncing=false;
function bounce(id){const e=document.getElementById(id);if(e)e.dispatchEvent(new Event('change',{bubbles:true}))}
function refresh(e){if(bouncing)return;bouncing=true;try{window.ADERENCIA_GLOBAL_PERIOD=window.ADERENCIA_PERIOD;['historyMonth','monitorMonth','divMonth','semesterYear'].forEach(bounce);window.ADERENCIA_NETWORK_LED?.render?.();window.ADERENCIA_DIVERGENCE_DASHBOARD?.render?.(true);window.ADERENCIA_EVOLUTION?.render?.()}finally{queueMicrotask(()=>{bouncing=false})}}
window.addEventListener('aderencia:periodchange',refresh);
window.addEventListener('aderencia:portableloaded',()=>setTimeout(refresh,0));
if(window.ADERENCIA_PERIOD)window.ADERENCIA_GLOBAL_PERIOD=window.ADERENCIA_PERIOD;
window.ADERENCIA_PERIOD_COHERENCE={refresh};
})();