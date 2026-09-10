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

/* RC64 - monitoramento: reserva linhas próprias para selo, ajuste e inconsistências. */
.monitor-card{
  align-items:start!important;
  align-content:start!important;
  grid-auto-flow:row!important;
  grid-auto-rows:auto!important;
  min-height:78px!important;
  padding-bottom:8px!important;
}
.monitor-card .monitor-light{margin-top:3px}
.monitor-card>b{align-self:start;white-space:nowrap}
.monitor-card>small{
  position:static!important;
  right:auto!important;
  bottom:auto!important;
  grid-column:2/-1!important;
  justify-self:stretch!important;
  margin:1px 0 0!important;
  line-height:1.2!important;
  white-space:normal!important;
  overflow-wrap:anywhere;
}
.monitor-card .op-badges{
  position:static!important;
  grid-column:2/-1!important;
  align-self:start!important;
  margin:2px 0 0!important;
  min-width:0;
}
.monitor-card .op-badge{
  position:static!important;
  max-width:100%;
  white-space:normal!important;
  line-height:1.2!important;
}
.monitor-card .op-inconsistency-summary{
  position:static!important;
  right:auto!important;
  bottom:auto!important;
  grid-column:2/-1!important;
  justify-self:stretch!important;
  margin:1px 0 0!important;
  color:#94a3b8!important;
  font-size:7.1px!important;
  line-height:1.2!important;
  font-weight:600!important;
  white-space:normal!important;
  overflow-wrap:anywhere;
}
`;
document.head.appendChild(s);
})();