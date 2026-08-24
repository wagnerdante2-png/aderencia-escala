(function(){
'use strict';
const $=id=>document.getElementById(id);
const calc=$('calculateBtn'),reset=$('resetBtn');
function n(v){const m=String(v||'').match(/-?\d+(?:[.,]\d+)?/);return m?Number(m[0].replace(',','.')):0}
function updateExecutiveReading(){
  const el=$('adherenceReading'),pct=$('resultPercent'); if(!el||!pct||pct.textContent==='—')return;
  const v=n(pct.textContent); let label,cls;
  if(v>=90){label='Adequado';cls='good'} else if(v>=80){label='Atenção';cls='attention'} else {label='Crítico';cls='critical'}
  const delta=Math.abs(v-90).toFixed(2).replace('.',',');
  el.textContent=v===90?`${label} • exatamente na referência de 90%`:`${label} • ${delta} p.p. ${v>90?'acima':'abaixo'} da referência de 90%`;
  el.className=`adherence-reading ${cls}`;
}
if(calc)calc.addEventListener('click',()=>setTimeout(updateExecutiveReading,0));
if(reset)reset.addEventListener('click',()=>{const e=$('adherenceReading');if(e){e.textContent='Indicador principal do período';e.className='adherence-reading'}});
})();