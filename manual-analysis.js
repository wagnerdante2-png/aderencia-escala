(function(){
'use strict';
const H=window.ADERENCIA_HISTORY;
const $=id=>document.getElementById(id);
if(!H||!$('manualRows'))return;
const months=H.months;
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(r,m,y)=>r.month===m&&r.year===y;
function period(){return {month:Number($('manualMonth').value),year:Number($('manualYear').value)}}
function priorHistory(store,month,year){
  return H.load().filter(r=>r.store===store&&!(r.month===month&&r.year===year)&&!r.manualSource&&Number.isFinite(Number(r.adherence)));
}
function rowHTML(code,rec,month,year){
  const value=rec?H.effective(rec):0;
  const source=rec?.manualSource==='average'?'Média manual':rec?.manualSource==='missing'?'Não envio (0,1%)':rec?'Calculada':'Sem cálculo';
  const isMissing=rec?.manualSource==='missing';
  return '<tr><td>'+safe(code+' - '+H.stores[code])+'</td><td><strong>'+H.fmt(value)+'</strong></td><td>'+safe(source)+'</td><td><button type="button" data-action="average" data-store="'+code+'">Aderência por média</button></td><td><button type="button" data-action="missing" data-store="'+code+'">Aderência zerada (0,1%)</button></td><td><button type="button" data-action="bonus" data-store="'+code+'" '+(!rec||isMissing?'disabled title="Exige resultado não penalizado"':'')+'>'+(rec?.bonus?'Remover ajuste +10%':'Ajuste eletivo +10%')+'</button></td></tr>';
}
function render(){
  const {month,year}=period();
  const records=new Map(H.load().filter(r=>key(r,month,year)).map(r=>[r.store,r]));
  const codes=Object.keys(H.stores).filter(code=>code!=='ML04').sort();
  $('manualRows').innerHTML='<table style="width:100%;min-width:960px;border-collapse:collapse;text-align:left"><thead><tr><th>Loja</th><th>Aderência</th><th>Situação</th><th>Média histórica</th><th>Não envio</th><th>Ajuste eletivo</th></tr></thead><tbody>'+codes.map(code=>rowHTML(code,records.get(code),month,year)).join('')+'</tbody></table>';
}
async function confirmChange(title,message){
  return new Promise(resolve=>{
    const ok=window.confirm(title+'\n\n'+message);
    resolve(ok);
  });
}
function saveRow(row){
  const all=H.load(),idx=all.findIndex(x=>x.store===row.store&&key(x,row.month,row.year));
  if(idx>=0)all[idx]=row;else all.push(row);
  H.saveAll(all);H.notify();render();
}
$('manualRows').addEventListener('click',async e=>{
  const btn=e.target.closest('button[data-action]');if(!btn)return;
  const store=btn.dataset.store,action=btn.dataset.action;
  const {month,year}=period();
  const rows=H.load();
  const old=rows.find(r=>r.store===store&&key(r,month,year));
  const name=store+' - '+H.stores[store],competence=months[month-1]+'/'+year;
  if(action==='average'){
    const history=priorHistory(store,month,year);
    if(!history.length){alert('Não há meses com aderência calculada para obter uma média confiável.');return;}
    const value=history.reduce((sum,r)=>sum+H.effective(r),0)/history.length;
    if(!await confirmChange('Registrar média manual',name+' • '+competence+'\nMédia de '+history.length+' competência(s): '+H.fmt(value)+'.'+(old?'\nATENÇÃO: o resultado existente será substituído.':'')))return;
    saveRow({store,month,year,adherence:value,bonus:false,savedAt:new Date().toISOString(),manualSource:'average',manualAt:new Date().toISOString(),competenceRule:'MANUAL_AVERAGE'});
  }else if(action==='missing'){
    if(!await confirmChange('Penalizar não envio',name+' • '+competence+'\nRegistrar 0,1% por não envio?'+(old?'\nATENÇÃO: o resultado existente será substituído.':'')))return;
    saveRow({store,month,year,adherence:0.1,bonus:false,savedAt:new Date().toISOString(),manualSource:'missing',manualAt:new Date().toISOString(),competenceRule:'MANUAL_MISSING'});
  }else if(action==='bonus'){
    if(!old||old.manualSource==='missing')return;
    const next=!old.bonus,adjusted=Math.min(100,old.adherence*1.10);
    if(!await confirmChange(next?'Aplicar ajuste eletivo':'Remover ajuste eletivo',name+' • '+competence+'\nResultado base: '+H.fmt(old.adherence)+'\n'+(next?'Resultado ajustado: '+H.fmt(adjusted):'Retornar ao valor base')+'\nO valor base será preservado.'))return;
    saveRow({...old,bonus:next,bonusAt:next?new Date().toISOString():null,savedAt:new Date().toISOString()});
  }
});
const now=new Date();
$('manualMonth').innerHTML=months.map((n,i)=>'<option value="'+(i+1)+'">'+safe(n)+'</option>').join('');
$('manualYear').innerHTML=Array.from({length:7},(_,i)=>now.getFullYear()-3+i).concat(H.load().map(r=>r.year)).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>b-a).map(y=>'<option value="'+y+'">'+y+'</option>').join('');
$('manualMonth').value=String(now.getMonth()+1);$('manualYear').value=String(now.getFullYear());
['manualMonth','manualYear'].forEach(id=>$(id).addEventListener('change',render));
window.addEventListener('aderencia:manualview',render);
window.addEventListener('aderencia:historychange',render);
render();
})();