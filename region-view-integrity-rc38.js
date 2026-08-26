(function(){
'use strict';
if(window.__ADERENCIA_REGION_VIEW_INTEGRITY_RC38__)return;
window.__ADERENCIA_REGION_VIEW_INTEGRITY_RC38__=true;
const $=id=>document.getElementById(id);
function bounce(id){const e=$(id);if(e)e.dispatchEvent(new Event('change',{bubbles:true}))}
function bind(){
  $('historyRegion')?.addEventListener('change',e=>{if(e.target.value==='all')bounce('historyMonth')});
  $('monitorRegion')?.addEventListener('change',e=>{if(e.target.value==='all')bounce('monitorMonth')});
  $('semesterRegion')?.addEventListener('change',e=>{if(e.target.value==='all')bounce('semesterYear')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,0));else setTimeout(bind,0);
})();