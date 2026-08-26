(function(){
'use strict';
if(window.__ADERENCIA_PERIOD_CONTROLLER_RC41__)return;
window.__ADERENCIA_PERIOD_CONTROLLER_RC41__=true;
const KEY='aderenciaGlobalPeriodV1';
const MONTH_IDS=['networkLedMonth','saveMonth','historyMonth','monitorMonth','divMonth'];
const YEAR_IDS=['networkLedYear','saveYear','historyYear','monitorYear','divYear','semesterYear'];
const DUPLICATE_IDS=['saveMonth','saveYear','historyMonth','historyYear','monitorMonth','monitorYear','divMonth','divYear','semesterYear'];
const $=id=>document.getElementById(id);
let syncing=false,installed=false;
function state(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');if(Number.isInteger(+x.month)&&+x.month>=1&&+x.month<=12&&Number.isInteger(+x.year))return{month:+x.month,year:+x.year}}catch{}
 const n=new Date();return{month:n.getMonth()+1,year:n.getFullYear()};
}
function ensureOption(el,value){if(!el)return;const v=String(value);if(!Array.from(el.options||[]).some(o=>o.value===v))el.add(new Option(v,v));}
function syncControl(id,value){const el=$(id);if(!el)return;ensureOption(el,value);if(el.value!==String(value))el.value=String(value);}
function renderMasterLabel(month,year){const h=$('networkLedHeading');if(h&&window.ADERENCIA_MONTHS)h.textContent=`${window.ADERENCIA_MONTHS[month-1]} de ${year}`;}
function emitPeriod(month,year,source){window.dispatchEvent(new CustomEvent('aderencia:periodchange',{detail:{month,year,source}}));}
function set(month,year,source='api',emit=true){
 month=+month;year=+year;
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year))return false;
 const prev=state();
 try{localStorage.setItem(KEY,JSON.stringify({month,year,source,updatedAt:new Date().toISOString()}));}catch{}
 if(syncing)return true;
 syncing=true;
 try{
  MONTH_IDS.forEach(id=>syncControl(id,month));
  YEAR_IDS.forEach(id=>syncControl(id,year));
  renderMasterLabel(month,year);
 }finally{syncing=false;}
 if(emit&&(prev.month!==month||prev.year!==year||source==='startup'||source==='analysis'||source==='competencecorrected')){
  requestAnimationFrame(()=>emitPeriod(month,year,source));
 }
 return true;
}
function readFromAnalysis(){const c=window.ADERENCIA_COMPETENCE?.fromAnalysis?.();if(c?.month&&c?.year)set(c.month,c.year,'analysis');}
function hideDuplicateSelectors(){
 DUPLICATE_IDS.forEach(id=>{const el=$(id);if(!el)return;const label=el.closest('label');(label||el).classList.add('period-duplicate-hidden');});
 const box=document.querySelector('.competence-save');if(box)box.classList.add('period-analysis-note');
}
function relabelMaster(){
 const panel=$('networkLedPanel');if(!panel)return;
 const title=panel.querySelector('.network-led-title p');if(title)title.textContent='COMPETÊNCIA GLOBAL';
 const filters=panel.querySelector('.network-led-filters');
 if(filters&&!filters.querySelector('.global-period-caption')){const c=document.createElement('span');c.className='global-period-caption';c.textContent='Mês / Ano';filters.prepend(c);}
}
function installStyles(){
 if($('periodControllerStyles'))return;
 const s=document.createElement('style');s.id='periodControllerStyles';
 s.textContent='.period-duplicate-hidden{display:none!important}.global-period-caption{font-size:8px;font-weight:800;color:#64748b;align-self:center;text-transform:uppercase;letter-spacing:.04em}.period-analysis-note{opacity:.85}.period-analysis-note>span{font-size:9px!important}.period-analysis-note select{display:none!important}@media(max-width:820px){.global-period-caption{display:none}}';
 document.head.appendChild(s);
}
function refreshStaticShell(){relabelMaster();hideDuplicateSelectors();const s=state();MONTH_IDS.forEach(id=>syncControl(id,s.month));YEAR_IDS.forEach(id=>syncControl(id,s.year));renderMasterLabel(s.month,s.year);}
function bind(){
 document.addEventListener('change',e=>{
  if(syncing)return;
  const id=e.target?.id;if(!id)return;
  const s=state();
  if(MONTH_IDS.includes(id)){const m=+e.target.value;if(Number.isInteger(m)&&m>=1&&m<=12)set(m,s.year,id);}
  else if(YEAR_IDS.includes(id)){const y=+e.target.value;if(Number.isInteger(y))set(s.month,y,id);}
 },true);
 document.addEventListener('click',e=>{if(e.target?.id==='calculateBtn'||e.target?.id==='saveHistoryBtn')setTimeout(readFromAnalysis,60);},true);
 window.addEventListener('aderencia:competencecorrected',e=>{const d=e.detail||{};if(d.month&&d.year)set(d.month,d.year,'competencecorrected');});
 const meta=$('metaPeriod');if(meta){let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(readFromAnalysis,80);}).observe(meta,{childList:true,subtree:true,characterData:true});}
 window.addEventListener('aderencia:historychange',()=>{const s=state();refreshStaticShell();requestAnimationFrame(()=>emitPeriod(s.month,s.year,'historychange'));});
 window.addEventListener('aderencia:storeschange',refreshStaticShell);
 window.addEventListener('aderencia:portableloaded',refreshStaticShell);
}
function install(){
 if(installed)return;installed=true;
 installStyles();
 setTimeout(()=>{refreshStaticShell();const s=state();set(s.month,s.year,'startup',true);bind();},80);
}
window.ADERENCIA_PERIOD={get:state,set,refresh:refreshStaticShell};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();