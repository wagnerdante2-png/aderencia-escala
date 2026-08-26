(function(){
'use strict';
if(window.__ADERENCIA_MONITOR_EXPORT__)return;
window.__ADERENCIA_MONITOR_EXPORT__=true;
const $=id=>document.getElementById(id);
const pct=v=>Number.isFinite(v)?+v.toFixed(2):null;
function semaforo(v){return !Number.isFinite(v)?'SEM RESULTADO':v>=95?'VERDE':v>=80?'AMARELO':'VERMELHO'}
function ensureButton(){
  if($('monitorExcelBtn'))return $('monitorExcelBtn');
  const pdf=$('monitorPdfBtn');
  if(!pdf)return null;
  const b=document.createElement('button');
  b.id='monitorExcelBtn';
  b.className='secondary';
  b.type='button';
  b.textContent='Exportar Excel';
  b.title='Exporta o monitoramento mensal exibido para envio ao BI';
  pdf.insertAdjacentElement('afterend',b);
  b.addEventListener('click',exportMonitorExcel);
  return b;
}
function selectedStores(){
  const H=window.ADERENCIA_HISTORY,all=Object.keys(H?.stores||{}).sort(),regional=$('monitorRegion')?.value||'all',registry=window.ADERENCIA_STORE_REGISTRY;
  if(regional==='all'||!registry)return all;
  const allowed=new Set(registry.codesFor(regional));
  return all.filter(code=>allowed.has(code));
}
function buildRows(month,year){
  const H=window.ADERENCIA_HISTORY;
  if(!H)throw new Error('Histórico ainda não foi inicializado.');
  const stores=H.stores||{},registry=window.ADERENCIA_STORE_REGISTRY;
  const hist=H.load().filter(r=>+r.month===month&&+r.year===year);
  const by=new Map(hist.map(r=>[r.store,r]));
  return selectedStores().map(store=>{
    const r=by.get(store)||null;
    const raw=r?Number(r.adherence):NaN;
    const eff=r?H.effective(r):NaN;
    return {
      'Competência':`${String(month).padStart(2,'0')}/${year}`,
      'Ano':year,
      'Mês':month,
      'Código Loja':store,
      'Loja':stores[store]||'',
      'Regional':registry?.regionOf?.(store)||'',
      'Aderência Original (%)':pct(raw),
      'Ajuste Eletivo +10%':r?.bonus?'SIM':'NÃO',
      'Aderência Considerada (%)':pct(eff),
      'Semáforo':semaforo(eff),
      'Possui Resultado':r?'SIM':'NÃO',
      'Data do Salvamento':r?.savedAt?new Date(r.savedAt).toLocaleString('pt-BR'):'',
      'Data do Ajuste':r?.bonusAt?new Date(r.bonusAt).toLocaleString('pt-BR'):''
    };
  });
}
function summary(rows,month,year){
  const valid=rows.filter(r=>r['Possui Resultado']==='SIM');
  const vals=valid.map(r=>r['Aderência Considerada (%)']).filter(Number.isFinite);
  const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,regional=$('monitorRegion')?.value||'all';
  return [
    {'Indicador':'Competência','Valor':`${String(month).padStart(2,'0')}/${year}`},
    {'Indicador':'Regional','Valor':regional==='all'?'Todas as regionais':regional},
    {'Indicador':'Lojas cadastradas no filtro','Valor':rows.length},
    {'Indicador':'Lojas com resultado','Valor':valid.length},
    {'Indicador':'Lojas sem resultado','Valor':rows.length-valid.length},
    {'Indicador':'Média (%)','Valor':pct(avg)},
    {'Indicador':'Verde (≥95%)','Valor':valid.filter(r=>r.Semáforo==='VERDE').length},
    {'Indicador':'Amarelo (80–94,99%)','Valor':valid.filter(r=>r.Semáforo==='AMARELO').length},
    {'Indicador':'Vermelho (<80%)','Valor':valid.filter(r=>r.Semáforo==='VERMELHO').length},
    {'Indicador':'Com ajuste eletivo +10%','Valor':valid.filter(r=>r['Ajuste Eletivo +10%']==='SIM').length}
  ];
}
function autosize(ws,rows){
  if(!rows.length)return;
  const headers=Object.keys(rows[0]);
  ws['!cols']=headers.map(h=>({wch:Math.min(34,Math.max(12,h.length+2,...rows.map(r=>String(r[h]??'').length+2)))}));
  ws['!autofilter']={ref:`A1:${XLSX.utils.encode_col(headers.length-1)}${rows.length+1}`};
  ws['!freeze']={xSplit:0,ySplit:1};
}
function exportMonitorExcel(){
  try{
    if(!window.XLSX)throw new Error('Biblioteca Excel não carregada. Reabra a aplicação com internet disponível.');
    const month=+$('monitorMonth')?.value,year=+$('monitorYear')?.value;
    if(!month||!year)throw new Error('Selecione mês e ano no Monitoramento.');
    const rows=buildRows(month,year);if(!rows.length)throw new Error('O filtro selecionado não possui lojas cadastradas.');
    const sum=summary(rows,month,year),wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows,{header:Object.keys(rows[0])});
    autosize(ws,rows);
    const ws2=XLSX.utils.json_to_sheet(sum);ws2['!cols']=[{wch:30},{wch:28}];
    XLSX.utils.book_append_sheet(wb,ws,'Monitoramento');XLSX.utils.book_append_sheet(wb,ws2,'Resumo');
    const regional=$('monitorRegion')?.value||'all',suffix=regional==='all'?'rede':regional.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').toLowerCase();
    wb.Props={Title:`Monitoramento de Aderência ${String(month).padStart(2,'0')}/${year}`,Subject:'Exportação mensal para BI',Author:'Motor de Aderência'};
    XLSX.writeFile(wb,`monitoramento_aderencia_${year}-${String(month).padStart(2,'0')}_${suffix}.xlsx`,{compression:true});
  }catch(e){console.error('Falha ao exportar monitoramento Excel',e);alert(`Não foi possível exportar o Excel: ${e.message||e}`)}
}
function init(){ensureButton()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.addEventListener('aderencia:historychange',ensureButton);
})();