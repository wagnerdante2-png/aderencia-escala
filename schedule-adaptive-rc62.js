(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_ADAPTIVE_RC62__)return;
window.__ADERENCIA_SCHEDULE_ADAPTIVE_RC62__=true;

const input=document.getElementById('scheduleFile');
const statusEl=document.getElementById('scheduleStatus');
const nameEl=document.getElementById('scheduleFileName');
const calc=document.getElementById('calculateBtn');
const result=document.getElementById('resultCard');
if(!input||!window.XLSX||!window.pdfjsLib)return;

const VERSION='RC62.1';
const CODE_RE=/^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE|D)$/i;
const MONTHS={JANEIRO:0,FEVEREIRO:1,MARCO:2,MARÇO:2,ABRIL:3,MAIO:4,JUNHO:5,JULHO:6,AGOSTO:7,SETEMBRO:8,OUTUBRO:9,NOVEMBRO:10,DEZEMBRO:11};
const JOBS=['GERENTE DE LOJA','GERENTE LOJA','LIDER CAIXA I','LIDER CAIXA II','LIDER CAIXA III','LIDER CAIXA','LIDER SETOR I','LIDER SETOR II','LIDER SETOR III','LIDER SETOR','FISCAL DE LOJA I','FISCAL DE LOJA II','FISCAL DE LOJA','OPERADOR DE LOJA IV','OPERADOR DE LOJA III','OPERADOR DE LOJA II','OPERADOR DE LOJA I','OPERADOR DE LOJA','ESTOQUISTA III','ESTOQUISTA II','ESTOQUISTA I','ESTOQUISTA','LOCUTOR','APRENDIZ','ESTAGIARIO','WCA'];

const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const nameKey=v=>norm(v).split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join(' ');
const isoDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const br=s=>String(s||'').split('-').reverse().join('/');

function code(v){
  let n=norm(v).replace(/\s+/g,'');
  if(CODE_RE.test(n))return n;
  if(/^\d{1,2}$/.test(n)){
    const q=+n;
    if(q>=1&&q<=29)return `T${q}`;
  }
  let m=n.match(/^[17](\d{1,2})$/);
  if(m){
    const q=+m[1];
    if(q>=1&&q<=29)return `T${q}`;
  }
  if(/^T/.test(n)){
    let tail=n.slice(1).replace(/[ILA]/g,'1').replace(/D/g,'4').replace(/S/g,'5').replace(/G/g,'6').replace(/B/g,'8').replace(/O/g,'0');
    if(/^\d{1,2}$/.test(tail)){
      const q=+tail;
      if(q>=1&&q<=29)return `T${q}`;
    }
  }
  return null;
}

function setStatus(text,ok=false){
  if(!statusEl)return;
  statusEl.textContent=text;
  statusEl.className='status '+(ok?'ok':'error');
}
function api(){return window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61}
function typed(codeValue,message){const e=new Error(message);e.code=codeValue;return e}

function makeRows(items,tol=3.2){
  const out=[];
  for(const it of items.slice().sort((a,b)=>b.y-a.y||a.x-b.x)){
    let r=out.find(x=>Math.abs(x.y-it.y)<=tol);
    if(!r){r={y:it.y,items:[]};out.push(r)}
    r.items.push(it);
  }
  for(const r of out){
    r.items.sort((a,b)=>a.x-b.x);
    r.text=r.items.map(x=>x.text).join(' ');
  }
  out.sort((a,b)=>b.y-a.y);
  return out;
}

function monthYear(text){
  const n=norm(text);
  const head=` ${n.slice(0,1600)} `;
  const all=` ${n} `;
  const years=[...n.matchAll(/\b(20\d{2})\b/g)].map(m=>+m[1]);
  const year=years.length?years[0]:null;
  const keys=[...new Map(Object.entries(MONTHS).map(([k,v])=>[norm(k),v])).entries()];
  for(const hay of [head,all]){
    for(const [key,month] of keys){
      const re=new RegExp(`(?:^| )${key}(?: |$)`);
      if(re.test(hay))return{month,year};
    }
  }
  return{month:null,year};
}

function datesFromDays(days,month,year){
  const base=api();
  if(base?.datesFromDays)return base.datesFromDays(days,month,year);
  if(month==null||!year||!days.length)return[];
  let m=month,y=year,prev=days[0];
  return days.map((day,i)=>{
    if(i&&day<prev){m++;if(m>11){m=0;y++}}
    prev=day;
    const d=new Date(y,m,day,12);
    return d.getMonth()===m?isoDate(d):null;
  }).filter(Boolean);
}

function expectedDates(ctx){
  const out=[];
  if(!ctx?.start||!ctx?.end)return out;
  const a=new Date(ctx.start+'T12:00:00'),b=new Date(ctx.end+'T12:00:00');
  for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1))out.push(isoDate(d));
  return out;
}

function splitNameCargo(text){
  const n=norm(text);
  for(const j of JOBS){
    const p=n.lastIndexOf(j);
    if(p>1)return{name:n.slice(0,p).trim(),cargo:j};
  }
  const aliases=[
    [/LIDER CAI[A-Z]A(?: [IVX]+)?$/,'LIDER CAIXA'],
    [/LIDER SETOR(?: [IVX]+)?$/,'LIDER SETOR'],
    [/FISCAL DE LO[J1I]A(?: [IVX]+)?$/,'FISCAL DE LOJA'],
    [/OPERADOR DE LO[J1I]A(?: [IVX]+)?$/,'OPERADOR DE LOJA'],
    [/GERENTE(?: DE)? LO[J1I]A$/,'GERENTE LOJA'],
    [/ESTOQUISTA(?: [IVX]+)?$/,'ESTOQUISTA'],
    [/APRENDIZ(?: DE)?$/,'APRENDIZ'],
    [/ESTAGIARIO(?: DE)?$/,'ESTAGIARIO'],
    [/WCA$/,'WCA']
  ];
  for(const [re,cargo] of aliases){
    const m=n.match(re);
    if(m&&m.index>1)return{name:n.slice(0,m.index).trim(),cargo};
  }
  return{name:n,cargo:'NÃO IDENTIFICADO'};
}

function median(a){
  if(!a.length)return null;
  const s=a.slice().sort((x,y)=>x-y),m=Math.floor(s.length/2);
  return s.length%2?s[m]:(s[m-1]+s[m])/2;
}

function findGrid(page){
  let best=null;
  for(const r of page.rows.slice(0,80)){
    const nums=r.items.filter(i=>/^\d{1,2}$/.test(i.text)&&+i.text>=1&&+i.text<=31).sort((a,b)=>a.x-b.x);
    if(nums.length<4)continue;
    const days=nums.map(x=>+x.text);
    let good=0;
    for(let i=1;i<days.length;i++)if(days[i]===days[i-1]+1||(days[i]===1&&days[i-1]>=28))good++;
    const spacingCandidates=[];
    for(let i=1;i<nums.length;i++){
      const dd=days[i]-days[i-1],dx=(nums[i].x+(nums[i].w||0)/2)-(nums[i-1].x+(nums[i-1].w||0)/2);
      if(dd>=1&&dd<=5&&dx>0)spacingCandidates.push(dx/dd);
    }
    const spacing=median(spacingCandidates);
    const x1=spacing?median(nums.map((it,i)=>(it.x+(it.w||0)/2)-(days[i]-1)*spacing)):null;
    const score=good/Math.max(1,days.length-1)+days.length/100+(spacing?0.2:0);
    if(!best||score>best.score)best={row:r,items:nums,days,score,spacing,x1};
  }
  return best;
}

function pdfDateCols(page,g,fileName){
  const my=monthYear(`${page.text} ${fileName}`);
  if(my.month==null||!my.year)return[];
  const min=Math.min(...g.days),max=Math.max(...g.days);
  if(page.source?.startsWith('ocr')&&g.spacing&&g.x1!=null&&g.days.length>=8&&min<=4&&max>=20){
    const count=new Date(my.year,my.month+1,0).getDate();
    return Array.from({length:count},(_,i)=>{
      const d=new Date(my.year,my.month,i+1,12);
      return{x:g.x1+i*g.spacing,date:isoDate(d)};
    });
  }
  const dates=datesFromDays(g.days,my.month,my.year);
  return g.items.slice(0,dates.length).map((x,i)=>({x:x.x+(x.w||0)/2,date:dates[i]}));
}

function sparseHint(file,full=''){
  return /ESCALA\s+DE\s+FOLGAS/i.test(String(file?.name||''))||/ESCALA\s+DE\s+FOLGAS/i.test(String(full||''));
}

function sourceRange(pages,file){
  const dates=[];
  for(const p of pages){
    const g=findGrid(p);
    if(!g)continue;
    for(const x of pdfDateCols(p,g,file.name))if(x.date)dates.push(x.date);
  }
  const uniq=[...new Set(dates)].sort();
  return uniq.length?{start:uniq[0],end:uniq.at(-1),dates:uniq}:null;
}

function assertPeriod(range,point){
  if(!range||!point?.ctx?.start||!point?.ctx?.end)return;
  const lo=range.start>point.ctx.start?range.start:point.ctx.start;
  const hi=range.end<point.ctx.end?range.end:point.ctx.end;
  if(lo>hi)throw typed('ADERENCIA_PERIOD_MISMATCH',`período da escala (${br(range.start)} a ${br(range.end)}) não cruza o espelho (${br(point.ctx.start)} a ${br(point.ctx.end)})`);
}

function sparsePeople(page,g,cols){
  const xs=cols.map(x=>x.x);
  if(!xs.length)return[];
  const spacing=xs.length>1?(xs.at(-1)-xs[0])/(xs.length-1):12;
  const left=xs[0]-spacing*.7,right=xs.at(-1)+spacing*.7,out=[];
  for(const r of page.rows){
    if(r.y>=g.row.y-1)continue;
    const prefix=r.items.filter(i=>(i.x+(i.w||0)/2)<left).map(i=>i.text).join(' ');
    const nc=splitNameCargo(prefix);
    if(!nc.name||nc.cargo==='NÃO IDENTIFICADO'||nc.name.length<4||/^(NOME|CARGO|LEGENDA|VOLTAR)/.test(nc.name))continue;
    const vals=Array(cols.length).fill('');
    const citems=r.items.filter(i=>{const cx=i.x+(i.w||0)/2;return cx>=left&&cx<=right&&code(i.text)});
    for(const it of citems){
      const cx=it.x+(it.w||0)/2;
      let bi=0,bd=Infinity;
      xs.forEach((x,j)=>{const d=Math.abs(x-cx);if(d<bd){bd=d;bi=j}});
      if(bd<=Math.max(8,spacing*.7))vals[bi]=code(it.text)||'';
    }
    out.push({name:nc.name,cargo:nc.cargo,values:vals});
  }
  return out;
}

function parseLegend(text){
  const base=api();
  const turns=base?.parseLegendText?base.parseLegendText(text):new Map();
  for(const line of String(text||'').split(/\n+/)){
    const tm=[...line.matchAll(/\b([01]?\d|2[0-3]):[0-5]\d\b/g)].map(m=>m[0].padStart(5,'0'));
    if(tm.length<2)continue;
    const before=line.slice(0,line.indexOf(tm[0])).trim().split(/\s+/).slice(-2).join('');
    const c=code(before);
    if(c&&/^T\d+$/.test(c)&&!turns.has(c))turns.set(c,{start:tm[0],end:tm[1]});
  }
  return turns;
}

function shiftCode(shift,turns,alloc){
  if(!shift?.start||!shift?.end)return null;
  for(const[k,v]of turns)if(v.start===shift.start&&v.end===shift.end)return k;
  const sig=`${shift.start}|${shift.end}`;
  if(alloc.has(sig))return alloc.get(sig);
  for(let i=80;i<=99;i++){
    const k=`T${i}`;
    if(!turns.has(k)){turns.set(k,{start:shift.start,end:shift.end});alloc.set(sig,k);return k}
  }
  return null;
}

function buildCanonical(store,dates,people,turns,meta){
  const a=[
    [`ESCALA OPERACIONAL | LOJA ${+store.slice(2)}`,store],
    [`RC62 adaptativo • fonte=${meta.source} • versão=${meta.version} • período proporcional=${br(dates[0])} a ${br(dates.at(-1))}`],
    ['Nome','Cargo',...dates.map(br)]
  ];
  for(const e of people)a.push([e.name,e.cargo||'NÃO IDENTIFICADO',...e.values]);
  a.push([],['LEGENDA DE TURNOS']);
  for(const[k,v]of turns)a.push([`${k} | ${v.start} às ${v.end}`]);
  const ws=XLSX.utils.aoa_to_sheet(a),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Escala Ponto');
  return new File([XLSX.write(wb,{bookType:'xlsx',type:'array'})],`RC51_RC61_${store}_${String(meta.original||'escala').replace(/\.[^.]+$/,'.xlsx')}`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

function parseSparsePages(pages,file,point){
  const base=api();
  if(!base?.identity||!base?.plannedAt)throw typed('ADERENCIA_RC62_DEPENDENCY','parser adaptativo base indisponível');
  const full=pages.map(p=>p.text).join('\n'),turns=parseLegend(full),pointSet=new Set(expectedDates(point.ctx)),combined=new Map(),datesMap=new Map(),sourceDates=new Set();
  for(const p of pages){
    const g=findGrid(p);if(!g)continue;
    const rawCols=pdfDateCols(p,g,file.name);rawCols.forEach(x=>sourceDates.add(x.date));
    const cols=rawCols.filter(x=>pointSet.has(x.date));if(cols.length<3)continue;
    const emps=sparsePeople(p,g,cols);if(!emps.length)continue;
    cols.forEach(x=>datesMap.set(x.date,true));
    for(const e of emps){
      const k=nameKey(e.name),cur=combined.get(k)||{name:e.name,cargo:e.cargo,byDate:new Map()};
      cols.forEach((x,i)=>{if(e.values[i])cur.byDate.set(x.date,e.values[i])});combined.set(k,cur);
    }
  }
  const src=[...sourceDates].filter(Boolean).sort();if(src.length)assertPeriod({start:src[0],end:src.at(-1)},point);
  const dates=[...datesMap.keys()].sort(),schedulePeople=[...combined.values()].map(e=>({name:e.name,cargo:e.cargo,registration:'',values:dates.map(d=>e.byDate.get(d)||'')}));
  if(dates.length<3||schedulePeople.length<3)throw typed('ADERENCIA_PDF_STRUCTURE','grade Nome × Dias da escala não pôde ser reconhecida');
  const id=base.identity(schedulePeople,point);
  if(!id.ok)throw typed('ADERENCIA_POPULATION_MISMATCH',`população da escala não corresponde ao espelho (${id.matched} de ${Math.min(schedulePeople.length,point.people.length)} pessoas conciliadas)`);
  const explicitTurns=new Set(schedulePeople.flatMap(e=>e.values).filter(x=>/^T\d+/.test(x))),missing=[...explicitTurns].filter(t=>!turns.has(t));
  if(missing.length)throw typed('ADERENCIA_TURN_LEGEND',`turnos explícitos sem horário na legenda do próprio PDF: ${missing.slice(0,8).join(', ')}`);
  const alloc=new Map(),people=[];let explicitCells=0,inferredCells=0;
  for(const m of id.matches){
    const e=m.schedule,p=m.point,vals=e.values.slice();
    for(let i=0;i<vals.length;i++){
      if(vals[i]){explicitCells++;continue}
      const sh=base.plannedAt(p,dates[i]),tc=shiftCode(sh,turns,alloc);if(tc){vals[i]=tc;inferredCells++}
    }
    people.push({name:p.name||e.name,cargo:e.cargo,values:vals});
  }
  if(people.length<3)throw typed('ADERENCIA_POPULATION_MISMATCH','menos de 3 colaboradores puderam ser conciliados com o espelho');
  const total=people.length*dates.length,filled=people.reduce((n,e)=>n+e.values.filter(Boolean).length,0),cellCoverage=total?filled/total:0;
  return{dates,people,turns,identity:id,source:pages.some(p=>p.source?.startsWith('ocr'))?'pdf-ocr':'pdf-text',version:sparseHint(file,full)?'escala-de-folgas':'ocr-grid-hibrido',sparse:sparseHint(file,full),explicitCells,inferredCells,cellCoverage,rotation:pages.find(p=>p.rotation)?.rotation||0};
}

async function textPdf(file){
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false}).promise,out=[];
  for(let n=1;n<=pdf.numPages;n++){
    const p=await pdf.getPage(n),tc=await p.getTextContent(),items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5],w:i.width||0})),rs=makeRows(items);
    out.push({page:n,pdfPage:p,items,rows:rs,text:rs.map(x=>x.text).join('\n'),source:'text',rotation:0});
  }
  return out;
}

function luma(data,i){return(data[i]+data[i+1]+data[i+2])/3}
function runs(indices){
  const out=[];if(!indices.length)return out;let a=indices[0],b=a;
  for(let i=1;i<indices.length;i++){if(indices[i]<=b+1)b=indices[i];else{out.push([a,b]);a=b=indices[i]}}
  out.push([a,b]);return out;
}
function longestRegularSequence(centers,minStep,maxStep,tol=4){
  let best=[];
  for(let i=0;i<centers.length-1;i++)for(let j=i+1;j<Math.min(centers.length,i+6);j++){
    const step=centers[j]-centers[i];if(step<minStep||step>maxStep)continue;
    const seq=[centers[i],centers[j]];let last=centers[j];
    for(let k=j+1;k<centers.length;k++)if(Math.abs((centers[k]-last)-step)<=tol){seq.push(centers[k]);last=centers[k]}
    if(seq.length>best.length)best=seq;
  }
  return best;
}

function prepareTableCanvas(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,src=ctx.getImageData(0,0,w,h),d=src.data;
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const i=(y*w+x)*4;if(luma(d,i)<232){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}
  if(maxX<0)return canvas;
  minX=Math.max(0,minX-8);minY=Math.max(0,minY-8);maxX=Math.min(w-1,maxX+8);maxY=Math.min(h-1,maxY+8);
  const cw=maxX-minX+1,ch=maxY-minY+1,crop=document.createElement('canvas');crop.width=cw;crop.height=ch;
  const cctx=crop.getContext('2d',{willReadFrequently:true});cctx.drawImage(canvas,minX,minY,cw,ch,0,0,cw,ch);
  const img=cctx.getImageData(0,0,cw,ch),p=img.data,vx=[],hy=[];
  for(let x=0;x<cw;x++){let n=0,s=0;for(let y=0;y<ch;y+=2){s++;if(luma(p,(y*cw+x)*4)<105)n++}if(s&&n/s>.50)vx.push(x)}
  for(let y=0;y<ch;y++){let n=0,s=0;for(let x=0;x<cw;x+=2){s++;if(luma(p,(y*cw+x)*4)<105)n++}if(s&&n/s>.34)hy.push(y)}
  const vCenters=runs(vx).filter(([a,b])=>b-a<=5).map(([a,b])=>(a+b)/2),hCenters=runs(hy).filter(([a,b])=>b-a<=5).map(([a,b])=>(a+b)/2),vSeq=longestRegularSequence(vCenters,16,80,5),hSeq=longestRegularSequence(hCenters,10,60,5);
  if(vSeq.length<20||hSeq.length<8)return crop;
  const out=document.createElement('canvas');out.width=cw;out.height=ch;const octx=out.getContext('2d',{willReadFrequently:true});octx.fillStyle='#fff';octx.fillRect(0,0,cw,ch);const outImg=octx.getImageData(0,0,cw,ch),q=outImg.data,calLeft=Math.round(vSeq[0]),calRight=Math.round(vSeq.at(-1));
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(x>=calLeft&&x<=calRight)continue;const i=(y*cw+x)*4,L=luma(p,i),v=L<165?0:255;q[i]=q[i+1]=q[i+2]=v;q[i+3]=255}
  for(let ri=0;ri<hSeq.length-1;ri++){
    const ya=Math.max(0,Math.round(hSeq[ri])+2),yb=Math.min(ch,Math.round(hSeq[ri+1])-2);if(yb<=ya)continue;
    for(let ci=0;ci<vSeq.length-1;ci++){
      const xa=Math.max(0,Math.round(vSeq[ci])+2),xb=Math.min(cw,Math.round(vSeq[ci+1])-2);if(xb<=xa)continue;
      const samples=[];for(let y=ya;y<yb;y+=2)for(let x=xa;x<xb;x+=2)samples.push(luma(p,(y*cw+x)*4));const bg=median(samples)||255;
      for(let y=ya;y<yb;y++)for(let x=xa;x<xb;x++){const i=(y*cw+x)*4,L=luma(p,i),v=Math.abs(L-bg)>24?0:255;q[i]=q[i+1]=q[i+2]=v;q[i+3]=255}
    }
  }
  octx.putImageData(outImg,0,0);return out;
}

function scheduleLike(text){
  const n=norm(text);return /(?:ESCALA|SCALA) OPERACIONAL/.test(n)||(/\bLOJA\b/.test(n)&&/\b20\d{2}\b/.test(n)&&Object.keys(MONTHS).some(m=>new RegExp(`(?:^| )${norm(m)}(?: |$)`).test(` ${n} `)));
}
async function recognizePsm6(T,canvas,logger){
  if(!T?.createWorker)return null;let worker=null;
  try{worker=await T.createWorker('por+eng',T.OEM?.LSTM_ONLY??1,{logger});await worker.setParameters({tessedit_pageseg_mode:T.PSM?.SINGLE_BLOCK??'6',preserve_interword_spaces:'1'});return await worker.recognize(canvas)}finally{try{await worker?.terminate?.()}catch{}}
}
function wordsFrom(result,height){return(result?.data?.words||[]).filter(w=>w.text&&+w.confidence>=25).map(w=>({text:String(w.text).trim(),x:w.bbox.x0,y:height-w.bbox.y1,w:w.bbox.x1-w.bbox.x0}))}

async function ocrPdf(file,rotation=0){
  if(!window.ADERENCIA_ENSURE_OCR)throw typed('ADERENCIA_OCR_UNAVAILABLE','PDF digitalizado exige OCR, mas o carregador OCR não está disponível');
  const T=await window.ADERENCIA_ENSURE_OCR(),pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false}).promise,out=[];
  for(let n=1;n<=pdf.numPages;n++){
    setStatus(`RC62: OCR da escala ${n}/${pdf.numPages} • rotação ${rotation}°...`,false);
    const p=await pdf.getPage(n),scale=2.35,vp=p.getViewport({scale,rotation}),canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);await p.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    const logger=m=>{if(m.status==='recognizing text')setStatus(`RC62: OCR ${n}/${pdf.numPages} • ${rotation}° • ${Math.round((m.progress||0)*100)}%`,false)};
    const raw=await T.recognize(canvas,'por+eng',{logger});let chosen=raw,chosenCanvas=canvas,enhanced=false;
    if(scheduleLike(raw?.data?.text||'')){
      try{const prepared=prepareTableCanvas(canvas),strong=await recognizePsm6(T,prepared,logger);if(strong?.data?.text){chosen=strong;chosenCanvas=prepared;enhanced=true}}catch(e){console.warn('RC62 OCR tabular fallback indisponível; mantendo OCR bruto',e)}
    }
    const words=wordsFrom(chosen,chosenCanvas.height),rs=makeRows(words,7),rawText=String(raw?.data?.text||'').trim(),strongText=String(chosen?.data?.text||'').trim();
    out.push({page:n,items:words,rows:rs,text:[rawText,strongText].filter(Boolean).join('\n'),source:enhanced?'ocr-enhanced':'ocr',rotation,enhanced});
  }
  return out;
}

function semanticFailure(e){return ['ADERENCIA_PERIOD_MISMATCH','ADERENCIA_POPULATION_MISMATCH','ADERENCIA_TURN_LEGEND'].includes(e?.code)||/população do PDF|turnos usados sem horário|população da escala/i.test(String(e?.message||''))}
function parsePages(pages,file,point){
  const full=pages.map(p=>p.text).join('\n'),range=sourceRange(pages,file);assertPeriod(range,point);
  if(sparseHint(file,full))return parseSparsePages(pages,file,point);
  const base=api();if(!base?.parsePdfPages)throw typed('ADERENCIA_RC62_DEPENDENCY','parser PDF base indisponível');
  try{return{...base.parsePdfPages(pages,file,point),rotation:pages.find(p=>p.rotation)?.rotation||0,sparse:false}}
  catch(e){
    const structural=/grade Nome × Dias/i.test(String(e?.message||''));
    if(structural&&pages.some(p=>p.enhanced)){
      try{const alt=parseSparsePages(pages,file,point);return{...alt,sparse:false,version:'ocr-grid-hibrido'}}catch(altErr){if(semanticFailure(altErr))throw altErr}
    }
    if(structural)e.code='ADERENCIA_PDF_STRUCTURE';else if(/população/i.test(String(e?.message||'')))e.code='ADERENCIA_POPULATION_MISMATCH';else if(/turnos usados sem horário/i.test(String(e?.message||'')))e.code='ADERENCIA_TURN_LEGEND';throw e;
  }
}

async function normalizePdf(file,point){
  let pages=await textPdf(file),parsed;
  try{parsed=parsePages(pages,file,point)}catch(first){
    if(semanticFailure(first))throw first;let last=first;
    for(const rotation of [0,90,270,180]){try{pages=await ocrPdf(file,rotation);parsed=parsePages(pages,file,point);break}catch(e){last=e;if(semanticFailure(e))throw e}}
    if(!parsed){last.cause=first;throw last}
  }
  const audit={version:VERSION,source:parsed.source,modelVersion:parsed.version,store:point.ctx.store,dates:parsed.dates.length,periodStart:parsed.dates[0],periodEnd:parsed.dates.at(-1),pointPeople:point.people.length,schedulePeople:parsed.identity.schedule,matchedPeople:parsed.people.length,populationRatio:parsed.identity.ratio,turns:parsed.turns.size,sparse:!!parsed.sparse,explicitCells:parsed.explicitCells??null,inferredCells:parsed.inferredCells??null,cellCoverage:parsed.cellCoverage??null,rotation:parsed.rotation||0,original:file.name,at:new Date().toISOString()};
  window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62.last=audit;
  return buildCanonical(point.ctx.store,parsed.dates,parsed.people,parsed.turns,{source:parsed.sparse?'PDF folgas híbrido':parsed.source,version:parsed.version,original:file.name});
}

let bypass=false,busy=false;
function dispatch(file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;bypass=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{bypass=false}}
window.addEventListener('change',ev=>{
  if(ev.target!==input||bypass||busy)return;const file=input.files?.[0];if(!file||/^RC51_RC61_/i.test(file.name)||!/\.pdf$/i.test(file.name))return;
  ev.preventDefault();ev.stopImmediatePropagation();const base=api();busy=true;if(nameEl)nameEl.textContent=file.name;if(calc)calc.disabled=true;if(result)result.classList.add('hidden');setStatus('RC62: validando PDF, orientação, período e população...',false);
  Promise.resolve(base?.readPointInfo?.()).then(point=>{if(!point)throw typed('ADERENCIA_RC62_DEPENDENCY','carregue primeiro um espelho de ponto reconhecido');return normalizePdf(file,point)}).then(out=>{
    dispatch(out);setTimeout(()=>{const a=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62.last,txt=String(statusEl?.textContent||'');if(nameEl)nameEl.textContent=file.name;if(a&&/^Reconhecida:/i.test(txt)){const mode=a.sparse?'folgas híbrido':a.source,rot=a.rotation?` • rotação ${a.rotation}°`:'';statusEl.textContent=`${txt} • RC62 ${mode}${rot}`;statusEl.className='status ok'}},250)
  }).catch(e=>{if(nameEl)nameEl.textContent=file.name;setStatus(`RC62: ${String(e?.message||e)}`,false);console.error('ADERENCIA RC62',e)}).finally(()=>{busy=false})
},true);
window.ADERENCIA_SCHEDULE_ADAPTIVE_RC62={version:VERSION,sparseHint,sourceRange,assertPeriod,parseSparsePages,parsePages,normalizePdf,monthYear,findGrid,pdfDateCols,code,splitNameCargo,parseLegend,prepareTableCanvas,get busy(){return busy},last:null};
})();