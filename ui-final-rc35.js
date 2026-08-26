(function(){
'use strict';
function refresh(){
 const stores=window.ADERENCIA_STORES||{};
 const total=Object.keys(stores).length;
 const monitor=document.querySelector('#monitorView .central-toolbar p:not(.panel-kicker)');
 if(monitor)monitor.textContent=`Visão única das ${total} lojas cadastradas por competência. Verde ≥95%, amarelo ≥80% e vermelho <80%.`;
 const badge=document.querySelector('.privacy');
 if(badge)badge.textContent='Processamento local no navegador • v1.0 RC35';
}
document.addEventListener('DOMContentLoaded',refresh);
window.addEventListener('aderencia:storeschange',refresh);
window.addEventListener('aderencia:portableloaded',refresh);
})();