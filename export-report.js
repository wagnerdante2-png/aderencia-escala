(function(){
'use strict';
const $=id=>document.getElementById(id);
const btn=$('exportPdfBtn');
const result=$('resultCard');
if(!btn||!result)return;

const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const value=id=>clean($(id)?.textContent||'—');
const num=v=>{const m=String(v).match(/-?\d+(?:[.,]\d+)?/);return m?Number(m[0].replace(',','.')):0};
const safe=v=>clean(v).replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'');

function resultReady(){return !result.classList.contains('hidden')&&value('resultPercent')!=='—'}
function syncButton(){btn.disabled=!resultReady()}
new MutationObserver(syncButton).observe(result,{attributes:true,childList:true,subtree:true});
syncButton();

function collect(){
  const causes=[...document.querySelectorAll('#causeSummary .cause-item')].map(el=>({title:clean(el.querySelector('strong')?.textContent),detail:clean(el.querySelector('span')?.textContent)})).filter(x=>x.title);
  const cargos=[...document.querySelectorAll('#cargoSummary .cargo-item')].map(el=>({title:clean(el.querySelector('strong')?.textContent),detail:clean(el.querySelector('span')?.textContent),count:num(el.querySelector('span')?.textContent)})).filter(x=>x.title);
  const warnings=[...document.querySelectorAll('#warnings > div')].map(x=>clean(x.textContent)).filter(Boolean);
  return {
    store:value('resultStore')||value('metaStore'),period:value('metaPeriod'),source:value('metaSource'),turns:value('metaTurns'),pointMarks:value('metaPointMarks'),coverage:value('metaCoverage'),adherence:value('resultPercent'),confidence:value('confidencePercent'),confidenceBadge:clean($('confidenceBadge')?.textContent),matched:value('matchedPeople'),deviations:value('deviations'),nonconformities:value('nonConformities'),considered:value('totalMarks'),causes,cargos,warnings
  };
}

function exportPdf(){
  if(!resultReady())return;
  if(!window.jspdf?.jsPDF){alert('Gerador de PDF não carregado. Verifique a conexão com a internet e abra o aplicativo novamente.');return;}
  const d=collect(),{jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  const W=297,H=210,M=12;
  const C={navy:[19,31,44],navy2:[31,48,66],ink:[35,48,65],muted:[104,119,137],line:[224,231,237],soft:[247,249,251],white:[255,255,255],green:[28,128,82],greenSoft:[235,248,241],amber:[190,124,8],amberSoft:[255,248,235],red:[183,72,61],redSoft:[255,244,243],blue:[76,111,143],blueSoft:[240,245,249]};

  const fill=c=>doc.setFillColor(...c),stroke=c=>doc.setDrawColor(...c);
  function font(size,style='normal',c=C.ink){doc.setFont('helvetica',style);doc.setFontSize(size);doc.setTextColor(...c)}
  function text(t,x,y,opt={}){doc.text(String(t),x,y,opt)}
  function rounded(x,y,w,h,fc=C.white,rc=C.line,r=3){fill(fc);stroke(rc);doc.setLineWidth(.25);doc.roundedRect(x,y,w,h,r,r,'FD')}
  function wrap(t,w){return doc.splitTextToSize(clean(t),w)}
  function section(t,x,y){font(8.4,'bold',C.ink);text(t,x,y)}
  function progress(x,y,w,h,p,back=C.soft,fore=C.navy){fill(back);doc.roundedRect(x,y,w,h,h/2,h/2,'F');fill(fore);doc.roundedRect(x,y,Math.max(h,Math.min(w,w*p)),h,h/2,h/2,'F')}
  function compactKpi(x,y,w,h,label,val,accent=C.navy){rounded(x,y,w,h,C.white,C.line,3);fill(accent);doc.roundedRect(x,y,2.4,h,1.2,1.2,'F');font(6.2,'bold',C.muted);text(label.toUpperCase(),x+6,y+6);font(15,'bold',C.ink);text(val,x+6,y+16)}
  function info(label,val,x,y,w){font(5.8,'normal',C.muted);text(label,x,y);font(6.3,'bold',C.ink);text(val,x+w,y,{align:'right'})}

  // Cabeçalho - loja é a referência visual principal
  fill(C.navy);doc.rect(0,0,W,31,'F');
  font(7.2,'bold',[173,193,211]);text('RELATÓRIO EXECUTIVO DE ADERÊNCIA DE ESCALA',M,8);
  font(27,'bold',C.white);text(d.store||'LOJA',M,21);
  font(8.2,'normal',[215,225,234]);text(`${d.period}  •  ${d.source}`,M+48,20.5);
  font(6.5,'normal',[184,201,215]);text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,W-M,9,{align:'right'});

  // Bloco principal de aderência
  const top=38;
  rounded(M,top,79,56,C.navy2,C.navy2,4);
  font(6.8,'bold',[181,198,214]);text('ADERÊNCIA',M+7,top+9);
  font(34,'bold',C.white);text(d.adherence,M+7,top+29);
  const adh=Math.max(0,Math.min(100,num(d.adherence)))/100;
  progress(M+7,top+37,65,5,adh,[67,84,101],[255,255,255]);
  font(6.5,'normal',[198,211,222]);text('Indicador principal do período',M+7,top+49);

  // confiança propositalmente secundária
  rounded(M+83,top,45,19,C.greenSoft,C.line,3);
  font(5.7,'bold',C.muted);text('CONFIABILIDADE DA LEITURA',M+88,top+6);
  font(13,'bold',C.green);text(d.confidence,M+88,top+15);
  font(5.5,'bold',C.green);text(d.confidenceBadge||'',M+122,top+15,{align:'right'});

  compactKpi(M+83,top+23,45,15,'Desvios > 90 min',d.deviations,C.amber);
  compactKpi(M+83,top+41,45,15,'Folga/ausência com ponto',d.nonconformities,C.red);

  // Métricas rápidas
  const kx=M+133,kw=35,kg=3;
  compactKpi(kx,top,kw,26,'Colaboradores',d.matched,C.blue);
  compactKpi(kx+kw+kg,top,kw,26,'Marcações analisadas',d.considered,C.navy);
  compactKpi(kx+2*(kw+kg),top,kw,26,'Cobertura',d.coverage,C.green);
  compactKpi(kx+3*(kw+kg),top,kw,26,'Turnos',d.turns,C.blue);

  rounded(kx,top+30,149,26,C.soft,C.line,3);
  section('Leitura dos metadados',kx+6,top+37);
  info('Marcações no espelho',d.pointMarks,kx+6,top+44,41);
  info('Fonte da escala',d.source,kx+55,top+44,36);
  info('Período',d.period,kx+98,top+44,45);
  info('Loja validada',d.store,kx+6,top+51,41);
  info('Cobertura analisada',d.coverage,kx+55,top+51,36);
  info('Confiabilidade',d.confidence,kx+98,top+51,45);

  // Linha inferior - 3 colunas
  const y=101,gap=6,colW=(W-2*M-2*gap)/3;

  // Causas
  rounded(M,y,colW,78,C.white,C.line,3);
  section('Principais causas de perda de aderência',M+6,y+9);
  const causeRows=[
    {label:'Desvios acima de 90 min',value:num(d.deviations),accent:C.amber},
    {label:'Dias de folga/ausência com ponto',value:num(d.nonconformities),accent:C.red}
  ];
  const onlyPoint=d.causes.find(c=>/apenas no ponto/i.test(c.title));
  if(onlyPoint)causeRows.push({label:'Pessoas apenas no ponto',value:num(onlyPoint.title),accent:C.blue});
  const maxCause=Math.max(1,...causeRows.map(x=>x.value));
  let cy=y+17;
  causeRows.forEach(r=>{font(6.5,'bold',C.ink);text(r.label,M+6,cy);font(7,'bold',r.accent);text(String(r.value),M+colW-7,cy,{align:'right'});fill(C.soft);doc.roundedRect(M+6,cy+3,colW-13,4,2,2,'F');fill(r.accent);doc.roundedRect(M+6,cy+3,Math.max(3,(colW-13)*(r.value/maxCause)),4,2,2,'F');cy+=17});
  font(5.7,'normal',C.muted);doc.text(wrap('Folga/ausência com ponto = 1 ocorrência por colaborador/data quando existe ao menos uma batida no dia.',colW-12),M+6,y+69,{lineHeightFactor:1.25});

  // cargos
  const x2=M+colW+gap;
  rounded(x2,y,colW,78,C.white,C.line,3);
  section('Cargos com maior incidência',x2+6,y+9);
  const cargos=d.cargos.slice(0,5);
  const maxCargo=Math.max(1,...cargos.map(c=>c.count||num(c.detail)));
  let yy=y+17;
  cargos.forEach((c,i)=>{const v=c.count||num(c.detail);font(6.1,'bold',C.ink);text(c.title,x2+6,yy);font(6.5,'bold',i===0?C.navy:C.blue);text(String(v),x2+colW-7,yy,{align:'right'});fill(C.soft);doc.roundedRect(x2+6,yy+3,colW-13,3.3,1.6,1.6,'F');fill(i===0?C.navy:C.blue);doc.roundedRect(x2+6,yy+3,Math.max(2.5,(colW-13)*(v/maxCargo)),3.3,1.6,1.6,'F');yy+=11.5});
  if(!cargos.length){font(6.2,'normal',C.muted);text('Nenhuma ocorrência registrada por cargo.',x2+6,y+22)}

  // referências e leitura executiva
  const x3=x2+colW+gap;
  rounded(x3,y,colW,78,C.white,C.line,3);
  section('Referências da análise',x3+6,y+9);
  const refs=[];
  refs.push(`Aderência: ${d.adherence} no período.`);
  refs.push(`${d.deviations} entrada(s) fora da tolerância de 90 min.`);
  refs.push(`${d.nonconformities} colaborador(es)/dia com ponto em folga ou ausência planejada.`);
  if(onlyPoint)refs.push(onlyPoint.title+'.');
  const onlySchedule=d.causes.find(c=>/apenas na escala/i.test(c.title));if(onlySchedule)refs.push(onlySchedule.title+'.');
  refs.push(`Cobertura efetiva da leitura: ${d.coverage}.`);
  let ry=y+17;
  refs.slice(0,6).forEach((r,i)=>{fill(i<3?(i===1?C.amberSoft:i===2?C.redSoft:C.blueSoft):C.soft);doc.roundedRect(x3+6,ry-5,colW-12,9,2,2,'F');font(5.8,'normal',C.ink);doc.text(wrap(r,colW-18),x3+9,ry,{lineHeightFactor:1.15});ry+=10.5});

  // rodapé metodológico, sem competir com dashboard
  stroke(C.line);doc.line(M,185,W-M,185);
  font(5.8,'bold',C.ink);text('METODOLOGIA',M,191);
  font(5.6,'normal',C.muted);doc.text(wrap('Compara a primeira entrada real com a entrada prevista. Diferenças de até 90 min são toleradas. Desvio >90 min = 1 ponto. Ponto em F, FER, AF, AB, AL, FF, FC, NC ou AE = 10 pontos por colaborador/data.',205),M+25,191,{lineHeightFactor:1.18});
  font(5.6,'bold',C.navy);text('Aderência = 1 - (desvios + 10 × não conformidades) / total de marcações',W-M,191,{align:'right'});
  font(5.2,'normal',C.muted);text('Motor de Aderência • processamento local no navegador',M,H-7);
  text('Relatório executivo • 1 página',W-M,H-7,{align:'right'});

  doc.save(`Relatorio_Aderencia_${safe(d.store)}_${safe(d.period.replace(/\//g,''))}.pdf`);
}

btn.addEventListener('click',function(){const old=btn.textContent;try{btn.disabled=true;btn.textContent='Gerando PDF...';exportPdf()}catch(err){console.error(err);alert(`Não foi possível gerar o relatório: ${err.message}`)}finally{btn.textContent=old;syncButton()}});
})();