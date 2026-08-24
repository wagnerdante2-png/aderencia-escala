(function(){
'use strict';
/*
  RC9 - Regra semântica do espelho de ponto.
  No relatório de ponto, P = Pré-assinalada. Pré-assinalação não é batida real do colaborador.
  O motor deve considerar como marcação efetiva apenas O (Original) e I (Incluída).
  Este adaptador é carregado antes do engine-v3 e atua somente no padrão específico usado
  para extrair marcações diárias do espelho: HH:MM O|I|P.
*/
if(window.__ADERENCIA_POINT_SEMANTICS_RC9__) return;
window.__ADERENCIA_POINT_SEMANTICS_RC9__ = true;
window.ADERENCIA_POINT_SEMANTICS = { version:'RC9', ignoredPreassigned:0 };

const nativeMatchAll = String.prototype.matchAll;
String.prototype.matchAll = function(regexp){
  const iterator = nativeMatchAll.call(this, regexp);
  try {
    const src = regexp && regexp.source || '';
    const isPointMarks = src.includes('[0-2]\\d:[0-5]\\d') && src.includes('(?:O|I|P)');
    if(!isPointMarks) return iterator;

    const kept = [];
    for(const match of iterator){
      if(/\sP\b/i.test(match[0])){
        window.ADERENCIA_POINT_SEMANTICS.ignoredPreassigned++;
        continue;
      }
      kept.push(match);
    }
    return kept[Symbol.iterator]();
  } catch(_){
    return iterator;
  }
};

window.addEventListener('click', function(e){
  if(e.target && e.target.id === 'calculateBtn'){
    setTimeout(function(){
      const n = window.ADERENCIA_POINT_SEMANTICS?.ignoredPreassigned || 0;
      if(!n) return;
      const warnings = document.getElementById('warnings');
      if(warnings && !warnings.textContent.includes('pré-assinalada')){
        warnings.insertAdjacentHTML('beforeend', `<div>${n} marcação(ões) P (pré-assinaladas) foram ignoradas por não representarem batida real.</div>`);
      }
    },120);
  }
}, true);
})();