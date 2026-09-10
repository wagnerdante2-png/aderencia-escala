(function(){
'use strict';
/*
  Regra semântica do espelho:
  O = Original, I = Incluída, P = Pré-assinalada.
  Apenas O/I representam marcações efetivas para a aderência.

  Em linhas explicitamente marcadas como AUSENTE, horários administrativos
  posicionados depois do marcador de ausência (abono/ausência/jornada) não
  representam entrada real. Se existir uma marcação O/I antes do marcador,
  ela continua sendo considerada normalmente.

  O engine legado usa uma expressão específica com O|I|P. Enquanto essa regra
  não estiver incorporada diretamente ao engine, este adaptador filtra SOMENTE
  essa expressão exata, sem interferir em outros usos de String.matchAll.
*/
if(window.__ADERENCIA_POINT_SEMANTICS_RC14__)return;
window.__ADERENCIA_POINT_SEMANTICS_RC14__=true;
window.ADERENCIA_POINT_SEMANTICS={version:'RC64.2',ignoredPreassigned:0,ignoredAbsenceArtifacts:0};

const nativeMatchAll=String.prototype.matchAll;
const TARGET='\\b([0-2]\\d:[0-5]\\d)\\s*(?:O|I|P)\\b';
String.prototype.matchAll=function(regexp){
  const iterator=nativeMatchAll.call(this,regexp);
  try{
    if(!regexp||regexp.source!==TARGET)return iterator;
    const kept=[],text=String(this),absenceAt=text.search(/\*{0,2}\s*AUSENTE\s*\*{0,2}/i);
    for(const match of iterator){
      if(/\sP\b/i.test(match[0])){
        window.ADERENCIA_POINT_SEMANTICS.ignoredPreassigned++;
        continue;
      }
      if(absenceAt>=0&&Number.isFinite(match.index)&&match.index>absenceAt){
        window.ADERENCIA_POINT_SEMANTICS.ignoredAbsenceArtifacts++;
        continue;
      }
      kept.push(match);
    }
    return kept[Symbol.iterator]();
  }catch(_){return iterator}
};

document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='pointFile'){
    window.ADERENCIA_POINT_SEMANTICS.ignoredPreassigned=0;
    window.ADERENCIA_POINT_SEMANTICS.ignoredAbsenceArtifacts=0;
  }
},true);

document.addEventListener('click',e=>{
  if(!(e.target&&e.target.id==='calculateBtn'))return;
  setTimeout(()=>{
    const semantics=window.ADERENCIA_POINT_SEMANTICS||{},p=semantics.ignoredPreassigned||0,a=semantics.ignoredAbsenceArtifacts||0,warnings=document.getElementById('warnings');
    if(!warnings)return;
    if(p&&!warnings.textContent.includes('pré-assinalada'))warnings.insertAdjacentHTML('beforeend',`<div>${p} marcação(ões) P (pré-assinaladas) foram ignoradas por não representarem batida real.</div>`);
    if(a&&!warnings.textContent.includes('horário(s) administrativo(s) em linha de ausência'))warnings.insertAdjacentHTML('beforeend',`<div>${a} horário(s) administrativo(s) em linha de ausência foram ignorados. Ausência sem entrada efetiva não reduz a aderência.</div>`);
  },120);
},true);
})();