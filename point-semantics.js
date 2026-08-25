(function(){
'use strict';
/*
  Regra semântica do espelho:
  O = Original, I = Incluída, P = Pré-assinalada.
  Apenas O/I representam marcações efetivas para a aderência.

  O engine legado usa uma expressão específica com O|I|P. Enquanto essa regra
  não estiver incorporada diretamente ao engine, este adaptador filtra SOMENTE
  essa expressão exata, sem interferir em outros usos de String.matchAll.
*/
if(window.__ADERENCIA_POINT_SEMANTICS_RC14__)return;
window.__ADERENCIA_POINT_SEMANTICS_RC14__=true;
window.ADERENCIA_POINT_SEMANTICS={version:'RC14',ignoredPreassigned:0};

const nativeMatchAll=String.prototype.matchAll;
const TARGET='\\b([0-2]\\d:[0-5]\\d)\\s*(?:O|I|P)\\b';
String.prototype.matchAll=function(regexp){
  const iterator=nativeMatchAll.call(this,regexp);
  try{
    if(!regexp||regexp.source!==TARGET)return iterator;
    const kept=[];
    for(const match of iterator){
      if(/\sP\b/i.test(match[0])){window.ADERENCIA_POINT_SEMANTICS.ignoredPreassigned++;continue}
      kept.push(match);
    }
    return kept[Symbol.iterator]();
  }catch(_){return iterator}
};

document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='pointFile')window.ADERENCIA_POINT_SEMANTICS.ignoredPreassigned=0;
},true);

document.addEventListener('click',e=>{
  if(!(e.target&&e.target.id==='calculateBtn'))return;
  setTimeout(()=>{
    const n=window.ADERENCIA_POINT_SEMANTICS?.ignoredPreassigned||0;
    if(!n)return;
    const warnings=document.getElementById('warnings');
    if(warnings&&!warnings.textContent.includes('pré-assinalada'))warnings.insertAdjacentHTML('beforeend',`<div>${n} marcação(ões) P (pré-assinaladas) foram ignoradas por não representarem batida real.</div>`);
  },120);
},true);
})();