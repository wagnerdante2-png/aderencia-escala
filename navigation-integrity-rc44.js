(function(){
'use strict';
if(window.__ADERENCIA_NAVIGATION_RC44__)return;window.__ADERENCIA_NAVIGATION_RC44__=true;
const MAP={analysisTab:'analysisView',batchTab:'batchView',historyTab:'historyView',monitorTab:'monitorView',divergenceTab:'divergenceView',evolutionTab:'evolutionView',recurrenceTab:'recurrenceView',semesterTab:'semesterView'};
function normalize(tabId){const viewId=MAP[tabId];if(!viewId)return;for(const[id,view]of Object.entries(MAP)){const t=document.getElementById(id),v=document.getElementById(view);if(t)t.classList.toggle('active',id===tabId);if(v)v.classList.toggle('hidden',view!==viewId)}window.dispatchEvent(new CustomEvent('aderencia:viewchange',{detail:{tabId,viewId}}))}
document.addEventListener('click',e=>{const t=e.target?.closest?.('.view-tab');if(!t||!MAP[t.id])return;queueMicrotask(()=>normalize(t.id))});
function current(){const active=document.querySelector('.view-tab.active');return active&&MAP[active.id]?{tabId:active.id,viewId:MAP[active.id]}:null}
window.ADERENCIA_NAVIGATION={map:MAP,normalize,current};
})();