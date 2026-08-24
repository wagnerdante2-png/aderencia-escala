(function(){
'use strict';
const $=id=>document.getElementById(id);

function pointEmployeeTotal(){
  const text=$('pointStatus')?.textContent||'';
  const m=text.match(/Reconhecido:\s*(\d+)\s+funcion/i);
  return m?Number(m[1]):null;
}

function polish(){
  const nc=$('nonConformities');
  if(nc){
    const label=nc.parentElement?.querySelector('span');
    if(label) label.textContent='Dias de folga/ausência com ponto';
  }

  const matched=$('matchedPeople');
  if(matched){
    const m=(matched.textContent||'').match(/^(\d+)\/(\d+)$/);
    const total=pointEmployeeTotal();
    if(m&&total&&Number(m[2])<Number(m[1])) matched.textContent=`${m[1]}/${total}`;
  }

  const causes=$('causeSummary');
  if(causes){
    for(const item of causes.querySelectorAll('.cause-item')){
      const strong=item.querySelector('strong');
      const span=item.querySelector('span');
      if(strong&&/folgas?\/aus[eê]ncias? com marca[cç][aã]o/i.test(strong.textContent||'')){
        const n=((strong.textContent||'').match(/^\d+/)||['0'])[0];
        strong.textContent=`${n} dia(s) de folga/ausência com ponto`;
        if(span) span.textContent='1 ocorrência por colaborador/data quando existe ao menos 1 batida de ponto no dia. A quantidade de batidas do mesmo dia não multiplica esta ocorrência.';
      }
    }
  }

  const cargo=$('cargoSummary');
  if(cargo){
    for(const span of cargo.querySelectorAll('.cargo-item span')){
      span.textContent=(span.textContent||'').replace(/folga\/ausência/g,'dia(s) de folga/ausência com ponto');
    }
  }
}

const obs=new MutationObserver(polish);
obs.observe(document.body,{subtree:true,childList:true,characterData:true});
document.addEventListener('DOMContentLoaded',polish);
polish();
})();
