(function(){
'use strict';
const $=id=>document.getElementById(id);
function analysisPeriod(){
  const text=$('metaPeriod')?.textContent||'';
  const dates=[...text.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
  if(!dates.length)return null;
  const first=dates[0];
  return{month:+first[2],year:+first[3]};
}
function setSelect(id,value){
  const el=$(id);if(!el||value==null)return;
  const v=String(value);
  if(![...el.options].some(o=>o.value===v))el.add(new Option(v,v));
  el.value=v;
}
function syncOperationalCompetence(){
  const c=analysisPeriod();if(!c)return;
  setSelect('saveMonth',c.month);setSelect('saveYear',c.year);
}
function clarifyLabel(){
  const box=document.querySelector('.competence-save');
  const label=box?.querySelector('span');
  if(label)label.textContent='Competência (mês inicial do ciclo)';
}
function addRuleNote(){
  const rules=document.querySelector('.rules');
  if(!rules||rules.querySelector('[data-cycle-rule]'))return;
  const p=document.createElement('p');
  p.dataset.cycleRule='true';
  p.innerHTML='<strong>Competência:</strong> o ciclo 11/MM a 10/MM+1 pertence ao mês em que o ciclo começa. Ex.: 11/06 a 10/07 = competência Junho. Se a escala recebida cobrir apenas parte do ciclo (ex.: 01 a 30/31), a análise usa toda a interseção disponível com o espelho e o resultado é proporcional aos dias efetivamente apurados; o arquivo não é rejeitado apenas por cobertura temporal parcial.';
  rules.appendChild(p);
}
function init(){
  clarifyLabel();addRuleNote();
  const meta=$('metaPeriod');
  if(meta)new MutationObserver(syncOperationalCompetence).observe(meta,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{if(e.target?.id==='saveHistoryBtn')syncOperationalCompetence()},true);
  syncOperationalCompetence();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();