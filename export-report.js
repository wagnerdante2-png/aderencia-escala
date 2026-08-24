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

function resultReady(){
  return !result.classList.contains('hidden') && value('resultPercent')!=='—';
}
function syncButton(){ btn.disabled=!resultReady(); }
new MutationObserver(syncButton).observe(result,{attributes:true,childList:true,subtree:true});
syncButton();

function collect(){
  const causes=[...document.querySelectorAll('#causeSummary .cause-item')].map(el=>({
    title:clean(el.querySelector('strong')?.textContent),
    detail:clean(el.querySelector('span')?.textContent)
  })).filter(x=>x.title);
  const cargos=[...document.querySelectorAll('#cargoSummary .cargo-item')].map(el=>({
    title:clean(el.querySelector('strong')?.textContent),
    detail:clean(el.querySelector('span')?.textContent),
    count:num(el.querySelector('span')?.textContent)
  })).filter(x=>x.title);
  const warnings=[...document.querySelectorAll('#warnings > div')].map(x=>clean(x.textContent)).filter(Boolean);
  return {
    store:value('resultStore')||value('metaStore'),
    period:value('metaPeriod'),
    source:value('metaSource'),
    turns:value('metaTurns'),
    pointMarks:value('metaPointMarks'),
    coverage:value('metaCoverage'),
    adherence:value('resultPercent'),
    confidence:value('confidencePercent'),
    confidenceBadge:clean($('confidenceBadge')?.textContent),
    matched:value('matchedPeople'),
    deviations:value('deviations'),
    nonconformities:value('nonConformities'),
    considered:value('totalMarks'),
    causes,cargos,warnings
  };
}

function exportPdf(){
  if(!resultReady())return;
  if(!window.jspdf?.jsPDF){alert('Gerador de PDF não carregado. Verifique a conexão com a internet e abra o aplicativo novamente.');return;}
  const d=collect();
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const W=210,H=297,M=14;
  const C={navy:[20,32,45],ink:[31,45,61],muted:[103,118,137],line:[225,232,238],soft:[246,248,250],green:[24,121,78],greenSoft:[233,247,239],amber:[183,118,0],amberSoft:[255,248,235],red:[180,65,55],redSoft:[255,244,243],blue:[71,103,132],white:[255,255,255]};

  function fill(c){doc.setFillColor(...c)}
  function stroke(c){doc.setDrawColor(...c)}
  function font(size,style='normal',c=C.ink){doc.setFont('helvetica',style);doc.setFontSize(size);doc.setTextColor(...c)}
  function text(t,x,y,opt={}){doc.text(String(t),x,y,opt)}
  function rule(y,x1=M,x2=W-M){stroke(C.line);doc.setLineWidth(.3);doc.line(x1,y,x2,y)}
  function rounded(x,y,w,h,fc=C.soft,rc=C.line,r=3){fill(fc);stroke(rc);doc.roundedRect(x,y,w,h,r,r,'FD')}
  function wrap(t,w){return doc.splitTextToSize(clean(t),w)}
  function footer(page){
    rule(H-11);
    font(7,'normal',C.muted);text('Motor de Aderência • Relatório gerado localmente no navegador',M,H-6);
    text(`Página ${page}`,W-M,H-6,{align:'right'});
  }
  function topHeader(titleText,subtitle){
    fill(C.navy);doc.rect(0,0,W,32,'F');
    font(9,'bold',[181,198,214]);text('MOTOR DE ADERÊNCIA',M,10);
    font(19,'bold',C.white);text(titleText,M,20);
    font(8,'normal',[211,221,230]);text(subtitle,M,27);
  }
  function kpi(x,y,w,h,label,val,accent){
    rounded(x,y,w,h,C.white,C.line,3);
    fill(accent);doc.roundedRect(x,y,3,h,1.5,1.5,'F');
    font(7,'bold',C.muted);text(label.toUpperCase(),x+7,y+7);
    font(19,'bold',C.ink);text(val,x+7,y+19);
  }
  function sectionTitle(t,x,y){font(9,'bold',C.ink);text(t,x,y);}
  function barChart(items,x,y,w,rowH,titleText){
    sectionTitle(titleText,x,y);y+=6;
    const max=Math.max(1,...items.map(i=>i.value));
    items.forEach((it,idx)=>{
      const yy=y+idx*rowH;
      font(7.3,'bold',C.ink);text(it.label,x,yy+4.3);
      font(7,'bold',it.color);text(String(it.value),x+w,yy+4.3,{align:'right'});
      fill(C.soft);doc.roundedRect(x,yy+7,w,3.4,1.7,1.7,'F');
      fill(it.color);doc.roundedRect(x,yy+7,Math.max(1,w*(it.value/max)),3.4,1.7,1.7,'F');
    });
    return y+items.length*rowH;
  }
  function infoRow(label,val,x,y,w){font(7,'normal',C.muted);text(label,x,y);font(7.4,'bold',C.ink);text(val,x+w,y,{align:'right'});}

  // Página 1 — Dashboard executivo
  topHeader('Relatório de Aderência de Escala',`${d.store} • ${d.period} • ${d.source}`);
  font(7.3,'normal',C.muted);text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,W-M,39,{align:'right'});
  font(8,'bold',C.ink);text('Resumo executivo',M,41);

  const gap=4,kW=(W-2*M-gap)/2;
  kpi(M,46,kW,26,'Aderência',d.adherence,C.navy);
  kpi(M+kW+gap,46,kW,26,'Confiabilidade da leitura',`${d.confidence} • ${d.confidenceBadge}`,C.green);
  kpi(M,76,kW,23,'Desvios acima de 90 min',d.deviations,C.amber);
  kpi(M+kW+gap,76,kW,23,'Dias de folga/ausência com ponto',d.nonconformities,C.red);

  rounded(M,104,W-2*M,27,C.soft,C.line,3);
  sectionTitle('Metadados de validação',M+6,111);
  infoRow('Colaboradores conciliados',d.matched,M+6,118,56);
  infoRow('Marcações consideradas',d.considered,M+6,124,56);
  infoRow('Marcações no espelho',d.pointMarks,M+76,118,47);
  infoRow('Cobertura analisada',d.coverage,M+76,124,47);
  infoRow('Turnos reconhecidos',d.turns,M+137,118,45);
  infoRow('Fonte da escala',d.source,M+137,124,45);

  const causeBars=[
    {label:'Desvios > 90 min',value:num(d.deviations),color:C.amber},
    {label:'Folga/ausência com ponto',value:num(d.nonconformities),color:C.red}
  ];
  d.causes.filter(c=>/apenas no ponto/i.test(c.title)).slice(0,1).forEach(c=>causeBars.push({label:'Pessoas apenas no ponto',value:num(c.title),color:C.blue}));
  const leftW=82,rightX=M+92,rightW=W-M-rightX;
  let endLeft=barChart(causeBars,M,141,leftW,15,'Principais causas');

  const cargoBars=d.cargos.slice(0,5).map((c,i)=>({label:c.title,value:c.count||num(c.detail),color:i===0?C.navy:C.blue}));
  let endRight=barChart(cargoBars.length?cargoBars:[{label:'Sem ocorrências por cargo',value:0,color:C.blue}],rightX,141,rightW,15,'Cargos com mais ocorrências');
  const noteY=Math.max(endLeft,endRight)+7;
  rounded(M,noteY,W-2*M,33,d.confidenceBadge.toLowerCase().includes('alta')?C.greenSoft:C.amberSoft,C.line,3);
  font(8,'bold',d.confidenceBadge.toLowerCase().includes('alta')?C.green:C.amber);text(`Confiabilidade ${d.confidence} - ${d.confidenceBadge}`,M+6,noteY+8);
  font(7.5,'normal',C.ink);
  const executive=`A leitura foi validada com cobertura de ${d.coverage}. O indicador de aderência considera a primeira entrada diária e trata cada colaborador/data com ponto em dia de folga ou ausência planejada como uma única não conformidade, independentemente da quantidade de batidas no mesmo dia.`;
  doc.text(wrap(executive,W-2*M-12),M+6,noteY+15,{lineHeightFactor:1.35});
  footer(1);

  // Página 2 — Referências e detalhamento
  doc.addPage();
  topHeader('Referências da Análise',`${d.store} • ${d.period}`);
  let y=42;
  sectionTitle('Leitura rápida das causas',M,y);y+=5;
  const causeList=d.causes.length?d.causes:[{title:'Nenhuma causa detalhada registrada',detail:'—'}];
  causeList.forEach((c,i)=>{
    const lines=wrap(c.detail,W-2*M-16),h=Math.max(17,11+lines.length*3.4);
    const fc=/folga|ausência/i.test(c.title)?C.redSoft:/desvio/i.test(c.title)?C.amberSoft:C.soft;
    rounded(M,y,W-2*M,h,fc,C.line,3);
    font(8,'bold',C.ink);text(c.title,M+5,y+6.5);
    font(7,'normal',C.muted);doc.text(lines,M+5,y+12,{lineHeightFactor:1.3});
    y+=h+4;
    if(y>250&&i<causeList.length-1){footer(doc.getNumberOfPages());doc.addPage();topHeader('Referências da Análise','Continuação');y=42;}
  });

  y+=3;sectionTitle('Cargos com maior incidência',M,y);y+=5;
  const cargoList=d.cargos.length?d.cargos:[{title:'Nenhuma ocorrência por cargo',detail:'—'}];
  cargoList.forEach((c,i)=>{
    const col=i%2,row=Math.floor(i/2),cw=(W-2*M-4)/2,x=M+col*(cw+4),yy=y+row*20;
    rounded(x,yy,cw,16,C.soft,C.line,2.5);
    font(7.6,'bold',C.ink);text(c.title,x+4,yy+6);
    font(6.6,'normal',C.muted);doc.text(wrap(c.detail,cw-8),x+4,yy+11,{lineHeightFactor:1.25});
  });
  y+=Math.ceil(cargoList.length/2)*20+8;

  if(y>232){footer(doc.getNumberOfPages());doc.addPage();topHeader('Referências da Análise','Continuação');y=42;}
  sectionTitle('Notas de validação',M,y);y+=5;
  const notes=d.warnings.length?d.warnings:['Sem alertas adicionais.'];
  notes.forEach(n=>{
    const lines=wrap(n,W-2*M-10);rounded(M,y,W-2*M,8+lines.length*3.2,C.soft,C.line,2.5);
    font(7,'normal',C.ink);doc.text(lines,M+5,y+5.2,{lineHeightFactor:1.3});y+=11+lines.length*3.2;
  });

  y+=4;sectionTitle('Metodologia do indicador',M,y);y+=5;
  rounded(M,y,W-2*M,38,C.white,C.line,3);
  font(7,'normal',C.ink);
  const method='É comparada a primeira entrada real do dia com a entrada prevista na escala. Diferenças de até 90 minutos são toleradas. Diferenças acima de 90 minutos geram 1 ponto de penalidade. Quando há pelo menos uma batida de ponto em dia previsto como F, FER, AF, AB, AL, FF, FC, NC ou AE, é registrada uma única não conformidade para aquele colaborador/data.';
  doc.text(wrap(method,W-2*M-12),M+6,y+7,{lineHeightFactor:1.35});
  font(7.2,'bold',C.navy);text('Aderência = 1 - (desvios + 10 × não conformidades) / total de marcações',M+6,y+31);
  footer(doc.getNumberOfPages());

  // Garantir rodapé em páginas intermediárias criadas dinamicamente
  for(let p=2;p<=doc.getNumberOfPages();p++){
    doc.setPage(p);
    footer(p);
  }

  const periodSafe=safe(d.period.replace(/\//g,''));
  doc.save(`Relatorio_Aderencia_${safe(d.store)}_${periodSafe}.pdf`);
}

btn.addEventListener('click',function(){
  const old=btn.textContent;
  try{btn.disabled=true;btn.textContent='Gerando PDF...';exportPdf();}
  catch(err){console.error(err);alert(`Não foi possível gerar o relatório: ${err.message}`);}
  finally{btn.textContent=old;syncButton();}
});
})();
