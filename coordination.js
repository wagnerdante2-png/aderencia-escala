(function(){
'use strict';
const $=id=>document.getElementById(id);
function endCompetence(){
  const t=$('metaPeriod')?.textContent||'';
  const dates=[...t.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
  if(!dates.length)return null;
  const d=dates[dates.length-1];
  return{month:Number(d[2]),year:Number(d[3])};
}
function ensureOption(select,value){if(!select)return;if(![...select.options].some(o=>o.value===String(value)))select.add(new Option(String(value),String(value)))}
function syncSaveCompetence(){const c=endCompetence();if(!c)return;const m=$('saveMonth'),y=$('saveYear');ensureOption(y,c.year);if(m)m.value=String(c.month);if(y)y.value=String(c.year)}
function setSelect(id,value){const e=$(id);if(!e)return;ensureOption(e,value);e.value=String(value);e.dispatchEvent(new Event('change',{bubbles:true}))}
function syncAll(month,year,store){
  setSelect('historyMonth',month);setSelect('historyYear',year);if(store)setSelect('historyStore',store);
  setSelect('monitorMonth',month);setSelect('monitorYear',year);
  setSelect('semesterYear',year);if(store)setSelect('semesterStore',store);
}
const period=$('metaPeriod');if(period)new MutationObserver(syncSaveCompetence).observe(period,{childList:true,characterData:true,subtree:true});
const result=$('resultCard');if(result)new MutationObserver(syncSaveCompetence).observe(result,{attributes:true,attributeFilter:['class']});
const save=$('saveHistoryBtn');if(save)save.addEventListener('click',()=>{
  const c=endCompetence();const month=Number($('saveMonth')?.value)||c?.month;const year=Number($('saveYear')?.value)||c?.year;const store=(String($('resultStore')?.textContent||$('metaStore')?.textContent||'').match(/ML\d{2}/)||[])[0];
  if(month&&year)setTimeout(()=>syncAll(month,year,store),0);
});
['historyTab','monitorTab','semesterTab'].forEach(id=>$(id)?.addEventListener('click',()=>{
  const c={month:Number($('saveMonth')?.value),year:Number($('saveYear')?.value)};const store=(String($('resultStore')?.textContent||$('metaStore')?.textContent||'').match(/ML\d{2}/)||[])[0];if(c.month&&c.year)syncAll(c.month,c.year,store);
}));
syncSaveCompetence();
})();