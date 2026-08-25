(function(){
'use strict';
if(window.__ADERENCIA_LAYOUT_FIX_RC19__)return;
window.__ADERENCIA_LAYOUT_FIX_RC19__=true;
const s=document.createElement('style');
s.textContent=`
@media(min-width:1251px){
  .analysis-area{align-items:stretch}
  .result-card,.diagnostic-panel{max-height:none!important}
  .diagnostic-panel{overflow:hidden!important}
  .cause-summary,.cargo-summary{gap:3px}
  .cause-item,.cargo-item{padding:4px 5px}
  .cause-item strong,.cargo-item strong{font-size:8.4px}
  .cause-item span,.cargo-item span{font-size:7.2px;line-height:1.15}
}
@media(min-width:1350px) and (max-height:820px){
  .result-card,.diagnostic-panel{min-height:285px;max-height:none!important}
  .diagnostic-panel{padding-bottom:10px}
}
`;
document.head.appendChild(s);
})();