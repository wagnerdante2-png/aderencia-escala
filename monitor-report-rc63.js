(function(){
'use strict';
if(window.__ADERENCIA_MONITOR_REPORT_RC63__)return;
window.__ADERENCIA_MONITOR_REPORT_RC63__=true;
const VERSION='RC63.3';
const $=id=>document.getElementById(id);
const H=()=>window.ADERENCIA_HISTORY;
const F=()=>window.ADERENCIA_OPERATIONAL_FLAGS;
const B=()=>window.ADERENCIA_REPORT_BRAND||{};
const COLORS={
  dark:[19,31,44],text:[35,48,65],muted:[112,126,142],line:[224,231,237],
  green:[31,138,92],yellow:[209,138,10],red:[185,72,61],gray:[148,163,184],blue:[59,130,246],
  lateBg:[254,226,226],lateFg:[180,35,24],certBg:[220,252,231],certFg:[21,128,61],
  excBg:[219,234,254],excFg:[29,78,216],inactiveBg:[229,231,235],inactiveFg:[71,85,105],neutralBg:[241,245,249],neutralFg:[71,85,105]
};
function ready(){return !!window.jspdf?.jsPDF&&!!H()}
function metric(v){return Number.isFinite(v)?H().fmt(v):'—'}
function state(store,month,year,row){
  const api=F(),flag=api?.get?.(store,month,year)||{exception:false,late:false,certified:false};
  if(api?.isInactive?.(store))return{kind:'inactive',value:NaN,label:'INATIVA',color:COLORS.gray,flag};
  if(flag.exception)return{kind:'exception',value:NaN,label:'EXCEÇÃO',color:COLORS.blue,flag};
  const value=api?.score?api.score(row):(row?H().effective(row):NaN);
  return{kind:Number.isFinite(value)?'normal':'nodata',value,label:metric(value),color:colorFor(value),flag};
}
function colorFor(v){return !Number.isFinite(v)?COLORS.gray:v>=95?COLORS.green:v>=80?COLORS.yellow:COLORS.red}
function pillWidth(doc,text,fontSize=3.5){doc.setFontSize(fontSize);return Math.max(7,doc.getTextWidth(text)+3)}
function pill(doc,x,y,text,bg,fg,fontSize=3.5){const w=pillWidth(doc,text,fontSize);doc.setFillColor(...bg);doc.roundedRect(x,y,w,3.2,1.4,1.4,'F');doc.setFont('helvetica','bold');doc.setFontSize(fontSize);doc.setTextColor(...fg);doc.text(text,x+w/2,y+2.15,{align:'center'});return w}
function header(doc,month,year,logo){
  const brand=B(),company=brand.company||'Maravilhas do Lar',period=`${H().months[month-1]} • ${year}`;
  doc.setFillColor(...COLORS.dark);doc.rect(0,0,297,30,'F');
  if(logo){try{doc.addImage(logo,'PNG',10,4.2,28,13.9,undefined,'FAST')}catch(e){console.warn('Logo do relatório não pôde ser inserido',e)}}
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(company,43,11.5);
  doc.setFontSize(16);doc.text('Painel de Monitoramento',43,21.5);
  doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(205,218,230);doc.text('COMPETÊNCIA',284,10,{align:'right'});
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(255,255,255);doc.text(period,284,18,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(4.7);doc.setTextColor(205,218,230);doc.text('Aderência de Escala • Monitoramento da Rede',284,24,{align:'right'});
  let x=12,y=32.3;
  x+=pill(doc,x,y,'INATIVA',COLORS.inactiveBg,COLORS.inactiveFg,4)+2;
  x+=pill(doc,x,y,'EXCEÇÃO',COLORS.excBg,COLORS.excFg,4)+2;
  x+=pill(doc,x,y,'ENVIO APÓS O PRAZO',COLORS.lateBg,COLORS.lateFg,4)+2;
  pill(doc,x,y,'CERTIFICAÇÃO POR AMOSTRAGEM',COLORS.certBg,COLORS.certFg,4);
}
function footer(doc){doc.setDrawColor(225,232,238);doc.line(12,198,285,198);doc.setFontSize(6);doc.setTextColor(...COLORS.muted);doc.text('Maravilhas do Lar • Central de Aderência • dados armazenados localmente',12,203);doc.text(`Página 1/1 • Gerado em ${new Date().toLocaleString('pt-BR')}`,285,203,{align:'right'})}
function drawCard(doc,x,y,w,h,store,name,s,row){
  doc.setFillColor(255,255,255);doc.setDrawColor(...COLORS.line);doc.roundedRect(x,y,w,h,2.3,2.3,'FD');
  doc.setFillColor(...s.color);doc.circle(x+4.2,y+4.9,1.55,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(6.2);doc.setTextColor(...COLORS.text);doc.text(store,x+7.2,y+5.6);
  const valueText=s.label;doc.setFontSize(s.kind==='normal'?7.4:5.5);doc.text(valueText,x+w-2.8,y+5.6,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(4.65);doc.setTextColor(...COLORS.muted);doc.text(doc.splitTextToSize(name,w-6)[0],x+3,y+10.7);
  const badges=[];
  if(s.kind==='inactive')badges.push(['INATIVA',COLORS.inactiveBg,COLORS.inactiveFg]);
  if(s.kind==='exception')badges.push(['EXCEÇÃO',COLORS.excBg,COLORS.excFg]);
  if(s.flag?.late)badges.push(['ATRASO',COLORS.lateBg,COLORS.lateFg]);
  if(s.flag?.certified)badges.push(['AMOSTRAGEM',COLORS.certBg,COLORS.certFg]);
  if(row?.bonus&&s.kind==='normal')badges.push(['+10%',COLORS.neutralBg,COLORS.neutralFg]);
  let bx=x+3,by=y+h-4.1;
  for(const [text,bg,fg] of badges){const pw=pillWidth(doc,text,3.15);if(bx+pw>x+w-2.5)break;bx+=pill(doc,bx,by,text,bg,fg,3.15)+1}
}
async function resolveLogo(){const img=B().image;if(!img)return null;if(img.complete&&img.naturalWidth)return img;return await new Promise(resolve=>{let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};const t=setTimeout(()=>finish(null),1500);img.addEventListener('load',()=>{clearTimeout(t);finish(img)},{once:true});img.addEventListener('error',()=>{clearTimeout(t);finish(null)},{once:true})})}
async function exportMonitor(){
  if(!ready())return alert('Gerador de PDF indisponível.');
  const month=+($('monitorMonth')?.value||0),year=+($('monitorYear')?.value||0);if(!month||!year)return alert('Selecione mês e ano no Monitoramento.');
  const records=H().load().filter(r=>+r.month===month&&+r.year===year),api=F();
  const hasFlags=Object.keys(H().stores).some(store=>{const f=api?.get?.(store,month,year);return api?.isInactive?.(store)||f?.exception||f?.late||f?.certified});
  if(!records.length&&!hasFlags)return alert('Não há resultados ou tratativas salvas para esta competência.');
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true}),by=new Map(records.map(r=>[r.store,r])),logo=await resolveLogo();
  header(doc,month,year,logo);
  const stores=Object.keys(H().stores),cols=8,w=32.4,h=17.1,gx=1.7,gy=1.85,startX=12,startY=39.4;
  stores.forEach((store,i)=>{const row=Math.floor(i/cols),col=i%cols,x=startX+col*(w+gx),y=startY+row*(h+gy),r=by.get(store),s=state(store,month,year,r);drawCard(doc,x,y,w,h,store,H().stores[store],s,r)});
  footer(doc);doc.save(`Monitoramento_${String(month).padStart(2,'0')}_${year}.pdf`);
}
function init(){const b=$('monitorPdfBtn');if(!b||b.dataset.rc633Report)return;b.dataset.rc633Report='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();exportMonitor()},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.ADERENCIA_MONITOR_REPORT_RC63={version:VERSION,state,exportMonitor};
})();
