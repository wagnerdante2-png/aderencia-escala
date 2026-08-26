(function(){
'use strict';
function refresh(){
 const stores=window.ADERENCIA_STORES||{};
 const total=Object.keys(stores).length;
 const monitor=document.querySelector('#monitorView .central-toolbar p:not(.panel-kicker)');
 if(monitor)monitor.textContent=`Visão única das ${total} lojas cadastradas por competência. Verde ≥95%, amarelo ≥80% e vermelho <80%.`;
 const badge=document.querySelector('.privacy');
 if(badge&&window.ADERENCIA_VERSION)badge.textContent=`Processamento local no navegador • ${window.ADERENCIA_VERSION}`;
}
document.addEventListener('DOMContentLoaded',refresh);
window.addEventListener('aderencia:storeschange',refresh);
window.addEventListener('aderencia:portableloaded',refresh);
})();