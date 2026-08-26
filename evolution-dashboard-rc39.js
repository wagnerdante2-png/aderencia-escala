(function(){
'use strict';
if(window.__ADERENCIA_EVOLUTION_DASHBOARD_RC40__)return;
window.__ADERENCIA_EVOLUTION_DASHBOARD_RC40__=true;
const $=id=>document.getElementById(id);
const fmt=v=>Number.isFinite(v)?`${v.toFixed(2).replace('.',',')}%`:'—';
const effective=r=>window.ADERENCIA_HISTORY?.effective?.(r)??Number(r?.adherence);
function stores(){return window.ADERENCIA_STORE_REGISTRY?.load?.()||Object.fromEntries(Object.entries(window.ADERENCIA_STORES||{}).map(([code,name])=>[code,{code,name,region:''}]))}
function rows(){return window.ADERENCIA_HISTORY?.load?.()||[]}
function regionOptions(){const regs=window.ADERENCIA_STORE_REGISTRY?.regions||[];return '<option value="all">Todas as regionais</option>'+regs.map(r=>`<option value="${r}">${r}</option>`).join('')}
function storeOptions(region='all'){const reg=stores();return '<option value="all">Todas as lojas</option>'+Object.keys(reg).filter(k=>region==='all'||reg[k].region===region).sort().map(k=>`<option value="${k}">${k} - ${reg[k].name}</option>`).join('')}
function monthlySeries(year,region,store){
 const reg=stores();
 const allowed=new Set(Object.keys(reg).filter(k=>(region==='all'||reg[k].region===region)&&(store==='all'||k===store)));
 const all=rows().filter(r=>+r.year===+year&&allowed.has(r.store));
 const netRows=rows().filter(r=>+r.year===+year);
 const bars=[],line=[],counts=[];
 for(let m=1;m<=12;m++){
  const vals=all.filter(r=>r.month===m).map(effective).filter(Number.isFinite);
  const net=netRows.filter(r=>r.month===m).map(effective).filter(Number.isFinite);
  bars.push(vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:NaN);
  line.push(net.length?net.reduce((a,b)=>a+b,0)/net.length:NaN);
  counts.push(vals.length);
 }
 return{bars,line,counts,baseCount:allowed.size};
}
function lineSegments(values,xFor,yFor){
 const segments=[];let current=[];
 values.forEach((v,i)=>{
  if(Number.isFinite(v))current.push([xFor(i),yFor(v)]);
  else if(current.length){segments.push(current);current=[]}
 });
 if(current.length)segments.push(current);
 return segments;
}
function render(){
 if(!$('evolutionChart'))return;
 const period=window.ADERENCIA_PERIOD?.get?.()||{month:new Date().getMonth()+1,year:new Date().getFullYear()};
 const region=$('evolutionRegion')?.value||'all',store=$('evolutionStore')?.value||'all',s=monthlySeries(period.year,region,store);
 const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],W=1100,H=340,P=46,plotW=W-P*2,plotH=H-P*2,slot=plotW/12,barW=slot*.58;
 const xFor=i=>P+i*slot+slot/2;
 const yFor=v=>H-P-(Math.max(0,Math.min(100,v))/100)*plotH;
 const bars=s.bars.map((v,i)=>{
  if(!Number.isFinite(v))return'';
  const x=xFor(i)-barW/2,y=yFor(v),h=Math.max(2,H-P-y),sel=i+1===period.month?' selected':'';
  return `<g class="evo-bar${sel}"><rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5"><title>${months[i]}/${String(period.year).slice(-2)}: ${fmt(v)} • ${s.counts[i]} resultado(s)</title></rect><text x="${xFor(i)}" y="${Math.max(16,y-7)}" text-anchor="middle">${v.toFixed(1).replace('.',',')}%</text></g>`;
 }).join('');
 const labels=months.map((m,i)=>`<text class="evo-label${i+1===period.month?' selected':''}" x="${xFor(i)}" y="${H-13}" text-anchor="middle">${m}</text>`).join('');
 const segments=lineSegments(s.line,xFor,yFor);
 const lines=segments.map(seg=>seg.length>1?`<path class="evo-line" d="M ${seg.map(p=>p.join(' ')).join(' L ')}"></path>`:'').join('');
 const points=s.line.map((v,i)=>Number.isFinite(v)?`<circle cx="${xFor(i)}" cy="${yFor(v)}" r="4"><title>Média da rede em ${months[i]}: ${fmt(v)}</title></circle>`:'').join('');
 const y95=yFor(95),y80=yFor(80);
 $('evolutionChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução mensal de aderência"><line class="evo-grid" x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}"></line><line class="evo-grid ref95" x1="${P}" y1="${y95}" x2="${W-P}" y2="${y95}"></line><line class="evo-grid ref80" x1="${P}" y1="${y80}" x2="${W-P}" y2="${y80}"></line><text class="evo-ref-label" x="${W-P-4}" y="${y95-4}" text-anchor="end">95%</text><text class="evo-ref-label" x="${W-P-4}" y="${y80-4}" text-anchor="end">80%</text>${bars}${lines}${points}${labels}</svg>`;
 const title=store!=='all'?`${store} - ${stores()[store]?.name||''}`:region!=='all'?region:'Rede';
 $('evolutionTitle').textContent=`Evolução • ${title} • ${period.year}`;
 $('evolutionLegend').textContent=store!=='all'||region!=='all'?'Barras: seleção atual • Linha: média da rede':'Barras e linha: média da rede';
 const current=s.bars[period.month-1],prev=period.month>1?s.bars[period.month-2]:NaN,delta=Number.isFinite(current)&&Number.isFinite(prev)?current-prev:NaN;
 $('evolutionCurrent').textContent=fmt(current);
 $('evolutionDelta').textContent=Number.isFinite(delta)?`${delta>=0?'+':''}${delta.toFixed(2).replace('.',',')} p.p.`:'—';
 $('evolutionCoverage').textContent=String(s.counts[period.month-1]||0);
 $('evolutionBase').textContent=String(s.baseCount);
}
function inject(){
 if($('evolutionTab'))return;
 const nav=document.querySelector('.view-tabs'),semester=$('semesterTab');if(!nav)return;
 const tab=document.createElement('button');tab.id='evolutionTab';tab.className='view-tab';tab.type='button';tab.textContent='Evolução';nav.insertBefore(tab,semester||null);
 const view=document.createElement('section');view.id='evolutionView';view.className='hidden';view.innerHTML=`<section class="central-toolbar card"><div><p class="panel-kicker">ANÁLISE DE EVOLUÇÃO</p><h2 id="evolutionTitle">Evolução de aderência</h2><p id="evolutionLegend">Barras mensais com linha comparativa da rede.</p></div><div class="history-filters"><label>Regional<select id="evolutionRegion">${regionOptions()}</select></label><label>Loja<select id="evolutionStore">${storeOptions()}</select></label></div></section><section class="history-kpis evolution-kpis"><article class="history-kpi card"><span>Mês selecionado</span><strong id="evolutionCurrent">—</strong></article><article class="history-kpi card"><span>Variação vs. mês anterior</span><strong id="evolutionDelta">—</strong></article><article class="history-kpi card"><span>Lojas com resultado no mês</span><strong id="evolutionCoverage">0</strong></article><article class="history-kpi card"><span>Base selecionada</span><strong id="evolutionBase">0</strong></article></section><section class="card evolution-chart-card"><div id="evolutionChart" class="evolution-chart"></div></section>`;
 const anchor=$('semesterView')||document.querySelector('main .shell')||document.querySelector('main');if(anchor?.parentNode)anchor.parentNode.insertBefore(view,anchor);else document.querySelector('main')?.appendChild(view);
 const style=document.createElement('style');style.textContent='.evolution-kpis{grid-template-columns:repeat(4,1fr)!important}.evolution-chart-card{padding:16px;margin-top:10px}.evolution-chart{width:100%;overflow:hidden}.evolution-chart svg{width:100%;height:auto;min-height:300px}.evo-bar rect{fill:#64748b;opacity:.82}.evo-bar.selected rect{fill:#0f172a}.evo-bar text{font-size:10px;font-weight:800;fill:#334155}.evo-label{font-size:11px;fill:#64748b}.evo-label.selected{font-weight:900;fill:#0f172a}.evo-line{fill:none;stroke:#111827;stroke-width:3}.evolution-chart circle{fill:#fff;stroke:#111827;stroke-width:3}.evo-grid{stroke:#dbe3ea;stroke-width:1}.evo-grid.ref95{stroke-dasharray:6 5;stroke:#22c55e}.evo-grid.ref80{stroke-dasharray:6 5;stroke:#eab308}.evo-ref-label{font-size:9px;font-weight:800;fill:#64748b}@media(max-width:900px){.evolution-kpis{grid-template-columns:repeat(2,1fr)!important}.evolution-chart{overflow:auto}.evolution-chart svg{min-width:900px}}';document.head.appendChild(style);
 tab.addEventListener('click',()=>{['analysisView','batchView','historyView','monitorView','divergenceView','semesterView'].forEach(id=>$(id)?.classList.add('hidden'));document.querySelectorAll('.view-tab').forEach(x=>x.classList.remove('active'));view.classList.remove('hidden');tab.classList.add('active');render()});
 ['analysisTab','batchTab','historyTab','monitorTab','divergenceTab','semesterTab'].forEach(id=>document.addEventListener('click',e=>{if(e.target?.id===id)view.classList.add('hidden')},true));
 $('evolutionRegion').addEventListener('change',()=>{const cur=$('evolutionStore').value;$('evolutionStore').innerHTML=storeOptions($('evolutionRegion').value);if([...$('evolutionStore').options].some(o=>o.value===cur))$('evolutionStore').value=cur;render()});
 $('evolutionStore').addEventListener('change',render);
 window.addEventListener('aderencia:periodchange',render);window.addEventListener('aderencia:historychange',render);window.addEventListener('aderencia:portableloaded',render);
 window.addEventListener('aderencia:storeschange',()=>{const region=$('evolutionRegion').value,cur=$('evolutionStore').value;$('evolutionRegion').innerHTML=regionOptions();$('evolutionRegion').value=[...$('evolutionRegion').options].some(o=>o.value===region)?region:'all';$('evolutionStore').innerHTML=storeOptions($('evolutionRegion').value);if([...$('evolutionStore').options].some(o=>o.value===cur))$('evolutionStore').value=cur;render()});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,180));else setTimeout(inject,180);
window.ADERENCIA_EVOLUTION={render};
})();