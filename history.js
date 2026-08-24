(function(){
'use strict';
const $=id=>document.getElementById(id);
const KEY='aderenciaHistoricoV1';
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STORES={
ML01:'Jundiaí Barão de Jundiaí',ML02:'Várzea Paulista',ML03:'Jundiaí Praça Rui Barbosa',ML04:'Kids (Inativa)',ML05:'Jundiaí Maxi Shopping',ML06:'Campinas Barão de Itapura',ML07:'Itu Centro',ML08:'Campinas Moraes Sales',ML09:'Indaiatuba',ML10:'Capivari',ML11:'Sorocaba Simus',ML12:'Americana',ML13:'Santa Bárbara',ML14:'Piracicaba',ML15:'Limeira',ML16:'Cosmópolis',ML17:'Sorocaba Esplanada',ML18:'Araraquara Av. 36',ML19:'São Carlos',ML20:'Valinhos',ML21:'Sertãozinho',ML22:'Ribeirão Amin Calil',ML23:'Sorocaba Ipanema',ML24:'Ribeirão Independência',ML25:'Sumaré',ML26:'Itapetininga',ML27:'Campinas Shopping',ML28:'Itu Plaza Shopping',ML29:'Mogi Guaçu',ML30:'Araraquara Centro',ML31:'Bauru Duque',ML32:'Bauru Castelo',ML33:'Campinas Amoreiras',ML34:'Jundiaí Multi Modas',ML35:'Campinas Bandeiras',ML36:'Lençóis Paulista',ML37:'Marília',ML38:'Hortolândia',ML39:'Campinas Dom Pedro',ML40:'Leme',ML41:'Botucatu',ML42:'Bauru Shopping',ML43:'Franca',ML44:'Amparo',ML45:'Araras',ML46:'Franca Shopping',ML47:'Paulínia',ML48:'Ribeirão Saudade',ML49:'Botucatu Major',ML50:'Campinas Saudade',ML51:'Itatiba',ML52:'Jaú',ML53:'Pirassununga',ML54:'Araçatuba',ML55:'Jundiaí Pincinato',ML56:'Catanduva',ML57:'Caieiras',ML58:'Salto',ML59:'Avaré',ML60:'Barretos',ML61:'Vinhedo'};
window.ADERENCIA_STORES=STORES;

const analysisTab=$('analysisTab'),historyTab=$('historyTab'),analysisView=$('analysisView'),historyView=$('historyView');
const saveBtn=$('saveHistoryBtn'),saveMonth=$('saveMonth'),saveYear=$('saveYear');
const historyMonth=$('historyMonth'),historyYear=$('historyYear'),historyStore=$('historyStore');

const pctNumber=v=>{const m=String(v||'').match(/-?\d+(?:[.,]\d+)?/);return m?Number(m[0].replace(',','.')):null};
const fmt=v=>Number.isFinite(v)?`${v.toFixed(2).replace('.',',')}%`:'—';
const storeName=code=>STORES[code]||'Loja não cadastrada';
const codeLabel=code=>`${code} - ${storeName(code)}`;
const cls=v=>v>=90?'good':v>=80?'attention':'critical';

function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.filter(valid):[]}catch{return[]}}
function valid(x){return x&&/^ML\d{2}$/.test(x.store)&&Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&Number.isInteger(x.year)&&Number.isFinite(x.adherence)}
function saveAll(rows){localStorage.setItem(KEY,JSON.stringify(rows.map(x=>({store:x.store,month:x.month,year:x.year,adherence:+x.adherence.toFixed(4),savedAt:x.savedAt||new Date().toISOString()}))))}
function yearsAvailable(){const now=new Date().getFullYear(),set=new Set([now-2,now-1,now,now+1]);load().forEach(x=>set.add(x.year));return [...set].sort((a,b)=>b-a)}
function fillSelects(){
  const monthOpts=MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  saveMonth.innerHTML=monthOpts;historyMonth.innerHTML=`<option value="all">Todos os meses</option>${monthOpts}`;
  const ys=yearsAvailable();saveYear.innerHTML=ys.map(y=>`<option value="${y}">${y}</option>`).join('');historyYear.innerHTML=`<option value="all">Todos os anos</option>${ys.map(y=>`<option value="${y}">${y}</option>`).join('')}`;
  historyStore.innerHTML=`<option value="all">Todas as lojas</option>${Object.keys(STORES).map(k=>`<option value="${k}">${codeLabel(k)}</option>`).join('')}`;
  const now=new Date();saveMonth.value=String(now.getMonth()+1);saveYear.value=String(now.getFullYear());historyMonth.value=String(now.getMonth()+1);historyYear.value=String(now.getFullYear());
}
function syncCompetenceFromAnalysis(){
  const t=$('metaPeriod')?.textContent||'';const m=t.match(/(\d{2})\/(\d{2})\/(\d{4})/);if(!m)return;
  saveMonth.value=String(Number(m[2]));if(![...saveYear.options].some(o=>o.value===m[3])){const o=document.createElement('option');o.value=m[3];o.textContent=m[3];saveYear.appendChild(o)}saveYear.value=m[3];
}
function resultReady(){return !$('resultCard')?.classList.contains('hidden')&&pctNumber($('resultPercent')?.textContent)!=null}
function syncSaveButton(){saveBtn.disabled=!resultReady();if(resultReady()){syncCompetenceFromAnalysis();updateAdherenceVisual()}}
function updateAdherenceVisual(){
  const v=pctNumber($('resultPercent')?.textContent);if(v==null)return;const bar=document.querySelector('.adherence-scale span');if(bar)bar.style.width=`${Math.max(0,Math.min(100,v))}%`;
  const e=$('adherenceReading');if(!e)return;const delta=Math.abs(v-90).toFixed(2).replace('.',',');e.textContent=v>=90?`ADEQUADO • ${delta} p.p. acima da referência de 90%`:v>=80?`ATENÇÃO • ${delta} p.p. abaixo da referência de 90%`:`CRÍTICO • ${delta} p.p. abaixo da referência de 90%`;
}
function show(view){const hist=view==='history';analysisView.classList.toggle('hidden',hist);historyView.classList.toggle('hidden',!hist);analysisTab.classList.toggle('active',!hist);historyTab.classList.toggle('active',hist);if(hist)renderHistory()}
analysisTab.addEventListener('click',()=>show('analysis'));historyTab.addEventListener('click',()=>show('history'));

saveBtn.addEventListener('click',()=>{
  if(!resultReady())return;
  const store=String($('resultStore')?.textContent||$('metaStore')?.textContent||'').match(/ML\d{2}/)?.[0];const adherence=pctNumber($('resultPercent')?.textContent);const month=Number(saveMonth.value),year=Number(saveYear.value);
  if(!store||adherence==null||!month||!year){alert('Não foi possível identificar loja, competência e aderência.');return}
  const rows=load(),idx=rows.findIndex(x=>x.store===store&&x.month===month&&x.year===year),row={store,month,year,adherence,savedAt:new Date().toISOString()};
  if(idx>=0)rows[idx]=row;else rows.push(row);saveAll(rows);fillHistoryYearsOnly();
  const old=saveBtn.textContent;saveBtn.textContent=idx>=0?'Resultado atualizado':'Resultado salvo';saveBtn.classList.add('saved-flash');setTimeout(()=>{saveBtn.textContent=old;saveBtn.classList.remove('saved-flash')},1200);
});

function fillHistoryYearsOnly(){const current=historyYear.value,ys=yearsAvailable();historyYear.innerHTML=`<option value="all">Todos os anos</option>${ys.map(y=>`<option value="${y}">${y}</option>`).join('')}`;historyYear.value=[...historyYear.options].some(o=>o.value===current)?current:'all'}
function filtered(){const m=historyMonth.value,y=historyYear.value,s=historyStore.value;return load().filter(x=>(m==='all'||x.month===Number(m))&&(y==='all'||x.year===Number(y))&&(s==='all'||x.store===s))}
function aggregateByStore(rows){const map=new Map();rows.forEach(x=>{if(!map.has(x.store))map.set(x.store,[]);map.get(x.store).push(x.adherence)});return [...map].map(([store,vals])=>({store,value:vals.reduce((a,b)=>a+b,0)/vals.length,n:vals.length})).sort((a,b)=>b.value-a.value)}
function periodText(){const m=historyMonth.value,y=historyYear.value;const ms=m==='all'?'Todos os meses':MONTHS[Number(m)-1];return y==='all'?ms:`${ms} • ${y}`}
function renderHistory(){
  const rows=filtered(),byStore=aggregateByStore(rows),vals=byStore.map(x=>x.value),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  $('histStores').textContent=String(byStore.length);$('histAverage').textContent=fmt(avg);$('histGood').textContent=String(vals.filter(v=>v>=90).length);$('histCritical').textContent=String(vals.filter(v=>v<80).length);$('historyPeriodLabel').textContent=periodText();
  $('historyRankingTitle').textContent=historyStore.value==='all'?'Aderência por loja':codeLabel(historyStore.value);
  $('historyBars').innerHTML=byStore.length?byStore.map(x=>`<div class="history-row"><span class="history-store-label" title="${codeLabel(x.store)}">${codeLabel(x.store)}</span><div class="history-bar-track"><div class="history-bar-fill ${cls(x.value)}" style="width:${Math.max(0,Math.min(100,x.value))}%"></div></div><strong>${fmt(x.value)}</strong></div>`).join(''):'<p class="empty-history">Nenhum resultado salvo para o filtro selecionado.</p>';
  renderTrend();
}
function renderTrend(){
  const all=load();let series,title;
  if(historyStore.value!=='all'){
    const store=historyStore.value;series=all.filter(x=>x.store===store&&(historyYear.value==='all'||x.year===Number(historyYear.value))).sort((a,b)=>a.year-b.year||a.month-b.month).map(x=>({label:`${String(x.month).padStart(2,'0')}/${String(x.year).slice(-2)}`,value:x.adherence}));title=`Tendência • ${codeLabel(store)}`;
  }else{
    const group=new Map();all.filter(x=>historyYear.value==='all'||x.year===Number(historyYear.value)).forEach(x=>{const k=`${x.year}-${String(x.month).padStart(2,'0')}`;if(!group.has(k))group.set(k,[]);group.get(k).push(x.adherence)});series=[...group.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>{const [y,m]=k.split('-');return{label:`${m}/${y.slice(-2)}`,value:v.reduce((a,b)=>a+b,0)/v.length}});title='Tendência • média da rede';
  }
  $('historyTrendTitle').textContent=title;
  $('historyTrendChart').innerHTML=series.length?series.map(x=>`<div class="trend-column"><span class="trend-value">${fmt(x.value)}</span><div class="trend-bar ${cls(x.value)}" style="height:${Math.max(2,Math.min(100,x.value))}%"></div><span class="trend-label">${x.label}</span></div>`).join(''):'<p class="empty-history">Salve resultados de mais competências para visualizar a evolução.</p>';
}
[historyMonth,historyYear,historyStore].forEach(x=>x.addEventListener('change',renderHistory));

$('exportHistoryBtn').addEventListener('click',()=>{const data=JSON.stringify({version:1,exportedAt:new Date().toISOString(),records:load()},null,2),blob=new Blob([data],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`backup_aderencia_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)});
$('importHistoryFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const obj=JSON.parse(await f.text()),incoming=(Array.isArray(obj)?obj:obj.records||[]).filter(valid),rows=load(),map=new Map(rows.map(x=>[`${x.store}-${x.year}-${x.month}`,x]));incoming.forEach(x=>map.set(`${x.store}-${x.year}-${x.month}`,x));saveAll([...map.values()]);fillHistoryYearsOnly();renderHistory();alert(`${incoming.length} registro(s) restaurado(s)/atualizado(s).`)}catch(err){alert('Backup inválido ou corrompido.')}e.target.value=''});

fillSelects();
const rc=$('resultCard');if(rc)new MutationObserver(syncSaveButton).observe(rc,{attributes:true,childList:true,subtree:true});syncSaveButton();
})();