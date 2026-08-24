import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const $ = (id) => document.getElementById(id);
const pointInput = $('pointFile');
const scheduleInput = $('scheduleFile');
const calculateBtn = $('calculateBtn');

let pointData = null;
let scheduleData = null;

const MONTHS = {
  janeiro:0, fevereiro:1, marco:2, março:2, abril:3, maio:4, junho:5,
  julho:6, agosto:7, setembro:8, outubro:9, novembro:10, dezembro:11
};
const NON_WORK_CODES = new Set(['F','FER','AF','AB','AL','FF','FC','NC','AE']);
const DAY_CODE_RE = /^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE)$/i;

function norm(s='') {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function isoFromBR(s) {
  const m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function isoDate(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function minutes(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function timeDiff(a,b){ const d=Math.abs(minutes(a)-minutes(b)); return Math.min(d,1440-d); }
function fmtPct(v){ return `${(v*100).toFixed(2).replace('.',',')}%`; }

function levenshtein(a,b){
  const m=a.length,n=b.length, dp=Array.from({length:m+1},(_,i)=>[i]);
  for(let j=1;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n];
}
function similarity(a,b){ return 1-levenshtein(a,b)/Math.max(a.length,b.length,1); }

async function pdfPages(file){
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({data:bytes}).promise;
  const pages=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const tc=await page.getTextContent();
    const items=tc.items.filter(i=>i.str && i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5],w:i.width||0}));
    const rows=[];
    for(const item of items.sort((a,b)=>b.y-a.y || a.x-b.x)){
      let row=rows.find(r=>Math.abs(r.y-item.y)<2.2);
      if(!row){ row={y:item.y,items:[]}; rows.push(row); }
      row.items.push(item);
    }
    rows.forEach(r=>{ r.items.sort((a,b)=>a.x-b.x); r.text=r.items.map(i=>i.text).join(' '); });
    rows.sort((a,b)=>b.y-a.y);
    pages.push({page:p,items,rows,text:rows.map(r=>r.text).join('\n')});
  }
  return pages;
}

function parsePointRows(pages){
  const result={type:'point',store:null,periodStart:null,periodEnd:null,employees:new Map(),warnings:[]};
  let current=null, daily=true;
  for(const page of pages){
    for(const row of page.rows){
      const line=row.text;
      const period=line.match(/Espelho\s+do\s+Ponto\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
      if(period){ result.periodStart=isoFromBR(period[1]); result.periodEnd=isoFromBR(period[2]); }

      if(/Matr[ií]cula\s*:/i.test(line) && /Nome\s*:/i.test(line)){
        const name=(line.match(/Nome\s*:\s*(.*?)(?=\s+(?:Chapa|Admiss[aã]o)\s*:|$)/i)||[])[1];
        const mat=(line.match(/Matr[ií]cula\s*:\s*(.*?)(?=\s+Nome\s*:|$)/i)||[])[1];
        if(name){
          const key=norm(name);
          current={name:name.trim(),key,registration:(mat||'').trim(),store:null,days:new Map()};
          result.employees.set(key,current);
          daily=true;
        }
        continue;
      }
      if(!current) continue;

      const ml=(line.match(/\bML\s*0*(\d{1,3})\b/i)||[])[1];
      if(ml){ current.store=`ML${String(Number(ml)).padStart(2,'0')}`; if(!result.store) result.store=current.store; }
      if(/^Hor[aá]rios\b/i.test(line)){ daily=false; continue; }
      if(/^(?:C[oó]digo\s+Descri[cç][aã]o|Assinatura)/i.test(line)) daily=false;
      if(!daily) continue;

      const dm=line.match(/^(\d{2}\/\d{2}\/\d{4})\b/);
      if(!dm) continue;
      const date=isoFromBR(dm[1]);
      const marks=[...line.matchAll(/\b([0-2]\d:[0-5]\d)\s*(?:O|I|P)\b/g)].map(m=>m[1]);
      current.days.set(date,{date,firstEntry:marks[0]||null,marks,raw:line});
    }
  }
  if(!result.employees.size) throw new Error('Não encontrei blocos de funcionários no espelho de ponto.');
  return result;
}

function inferMonthYear(text){
  const plain=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let month=null;
  for(const [name,idx] of Object.entries(MONTHS)){
    const key=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(plain.includes(key)){ month=idx; break; }
  }
  const years=[...text.matchAll(/\b(20\d{2})\b/g)].map(m=>Number(m[1]));
  return {month,year:years[0]||null};
}
function buildDates(dayNumbers, month, year){
  if(month==null || !year || !dayNumbers.length) return [];
  let m=month,y=year,prev=dayNumbers[0];
  return dayNumbers.map((d,i)=>{
    if(i>0 && d<prev){ m++; if(m>11){m=0;y++;} }
    prev=d;
    return isoDate(y,m,d);
  });
}
function parseTurnLegend(text){
  const turns=new Map();
  const re=/\b(T\d{1,2})\s*(?:\||-|:)?[^\n]{0,30}?([0-2]\d:[0-5]\d)\s*(?:a|à|as|às|-)[^\n]{0,10}?([0-2]\d:[0-5]\d)/gi;
  for(const m of text.matchAll(re)) turns.set(norm(m[1]),{start:m[2],end:m[3]});
  return turns;
}

function parseSchedulePdfPages(pages){
  const allText=pages.map(p=>p.text).join('\n');
  const result={type:'schedule',source:'pdf',store:null,periodStart:null,periodEnd:null,employees:new Map(),turns:parseTurnLegend(allText),warnings:[]};
  const store=(allText.match(/\bML\s*0*(\d{1,3})\b/i)||allText.match(/LOJA\s+(\d{1,3})\b/i)||[])[1];
  if(store) result.store=`ML${String(Number(store)).padStart(2,'0')}`;
  const {month,year}=inferMonthYear(allText);

  for(const page of pages){
    const nomeItem=page.items.find(i=>norm(i.text)==='NOME');
    const cargoItem=page.items.find(i=>norm(i.text)==='CARGO');
    if(!nomeItem || !cargoItem) continue;

    const candidateRows=page.rows.map(r=>({
      row:r,
      days:r.items.filter(i=>/^\d{1,2}$/.test(i.text) && Number(i.text)>=1 && Number(i.text)<=31 && i.x>cargoItem.x+20).sort((a,b)=>a.x-b.x)
    })).filter(x=>x.days.length>=20);
    if(!candidateRows.length) continue;
    candidateRows.sort((a,b)=>b.days.length-a.days.length);
    const dayItems=candidateRows[0].days;
    const dayHeaderY=candidateRows[0].row.y;
    const dayNumbers=dayItems.map(i=>Number(i.text));
    const dates=buildDates(dayNumbers,month,year);
    if(!dates.length) throw new Error('Mês/ano da escala PDF não puderam ser identificados.');
    const firstDayX=dayItems[0].x;
    const lastDayX=dayItems[dayItems.length-1].x;
    const dataTopY=Math.min(nomeItem.y,dayHeaderY)-2;

    for(const row of page.rows){
      if(row.y>=dataTopY) continue;
      const cells=row.items;
      const codes=cells.filter(i=>i.x>=firstDayX-8 && i.x<=lastDayX+20 && DAY_CODE_RE.test(i.text));
      if(codes.length<5) continue;
      const name=cells.filter(i=>i.x<cargoItem.x-4).map(i=>i.text).join(' ').trim();
      if(!name || norm(name)==='NOME') continue;
      const key=norm(name);
      const emp=result.employees.get(key)||{name,key,days:new Map()};
      for(const codeItem of codes){
        let idx=0,best=Infinity;
        dayItems.forEach((d,i)=>{ const dist=Math.abs(d.x-codeItem.x); if(dist<best){best=dist;idx=i;} });
        if(best<18 && dates[idx]){
          const code=norm(codeItem.text);
          const turn=result.turns.get(code);
          emp.days.set(dates[idx],{date:dates[idx],code,start:turn?.start||null});
        }
      }
      result.employees.set(key,emp);
    }
  }
  if(!result.employees.size) throw new Error('Não consegui localizar a matriz Nome × Dias no PDF da escala.');
  const allDates=[...result.employees.values()].flatMap(e=>[...e.days.keys()]).sort();
  result.periodStart=allDates[0]||null;
  result.periodEnd=allDates.at(-1)||null;
  return result;
}

function cellText(v){
  if(v==null) return '';
  if(v instanceof Date) return v.toISOString();
  return String(v).trim();
}
function excelSerialToDate(v){
  if(typeof v!=='number' || v<30000) return null;
  const o=XLSX.SSF.parse_date_code(v);
  return o?isoDate(o.y,o.m-1,o.d):null;
}

function parseScheduleWorkbook(buffer){
  if(!window.XLSX) throw new Error('Biblioteca de Excel não carregada. Verifique sua conexão com a internet.');
  const wb=XLSX.read(buffer,{type:'array',cellDates:true,cellFormula:true});
  let best=null;

  for(const name of wb.SheetNames){
    const ws=wb.Sheets[name];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
    let score=0;
    for(const r of rows.slice(0,100)){
      const n=r.map(cellText).map(norm);
      if(n.includes('NOME')) score+=7;
      if(n.includes('CARGO')) score+=5;
      score+=n.filter(v=>/^T\d+$/.test(v)).length*.08;
      score+=n.filter(v=>/^T\d+ \d{2}:\d{2}/.test(v.replace('|',''))).length*.5;
    }
    if(norm(name)==='ESCALA MENSAL') score+=20;
    if(!best || score>best.score) best={name,rows,score};
  }

  if(!best || best.score<8) throw new Error('Não encontrei uma aba com a estrutura da Escala Operacional.');
  const rows=best.rows;
  const text=rows.map(r=>r.map(cellText).join(' | ')).join('\n');
  const result={type:'schedule',source:'excel',sheet:best.name,store:null,periodStart:null,periodEnd:null,employees:new Map(),turns:parseTurnLegend(text),warnings:[]};
  const store=(text.match(/\bML\s*0*(\d{1,3})\b/i)||text.match(/LOJA\s+(\d{1,3})\b/i)||[])[1];
  if(store) result.store=`ML${String(Number(store)).padStart(2,'0')}`;
  const {month,year}=inferMonthYear(text);

  let nameRow=-1,nameCol=-1,cargoRow=-1,cargoCol=-1;
  for(let i=0;i<Math.min(rows.length,120);i++){
    const n=rows[i].map(cellText).map(norm);
    const ni=n.indexOf('NOME');
    const ci=n.indexOf('CARGO');
    if(ni>=0 && nameRow<0){ nameRow=i; nameCol=ni; }
    if(ci>=0 && cargoRow<0){ cargoRow=i; cargoCol=ci; }
  }
  if(nameRow<0 || cargoRow<0) throw new Error('Cabeçalhos Nome/Cargo não encontrados na escala Excel.');

  const dateHeaderRow = rows[cargoRow] || rows[nameRow];
  const dateCols=[];
  const inferredDays=[];
  for(let c=cargoCol+1;c<dateHeaderRow.length;c++){
    const v=dateHeaderRow[c];
    let date=null;
    if(v instanceof Date) date=isoDate(v.getFullYear(),v.getMonth(),v.getDate());
    else date=excelSerialToDate(v);
    const num=Number(cellText(v));
    if(date) dateCols.push({c,date});
    else if(Number.isInteger(num)&&num>=1&&num<=31) inferredDays.push({c,day:num});
  }
  if(!dateCols.length && inferredDays.length){
    const dates=buildDates(inferredDays.map(x=>x.day),month,year);
    inferredDays.forEach((x,i)=>dateCols.push({c:x.c,date:dates[i]}));
  }
  if(dateCols.length<20) throw new Error('Não consegui identificar as datas da escala Excel.');

  const firstEmployeeRow=Math.max(nameRow,cargoRow)+1;
  for(let r=firstEmployeeRow;r<rows.length;r++){
    const name=cellText(rows[r][nameCol]);
    if(!name || /^(TOTAL|LEGENDA|GERENCIAL|MOTOR|CONSOLIDADO)$/i.test(name)) continue;
    const codes=dateCols.map(d=>({date:d.date,code:norm(cellText(rows[r][d.c]))})).filter(x=>DAY_CODE_RE.test(x.code));
    if(codes.length<5) continue;
    const key=norm(name);
    const emp={name:name.trim(),key,days:new Map()};
    for(const x of codes){
      const turn=result.turns.get(x.code);
      emp.days.set(x.date,{date:x.date,code:x.code,start:turn?.start||null});
    }
    result.employees.set(key,emp);
  }

  if(!result.employees.size) throw new Error('Nenhuma linha de colaborador foi reconhecida na escala Excel.');
  const allDates=[...result.employees.values()].flatMap(e=>[...e.days.keys()]).sort();
  result.periodStart=allDates[0]||null;
  result.periodEnd=allDates.at(-1)||null;
  return result;
}

function findPointEmployee(scheduleEmp, points, used){
  if(points.has(scheduleEmp.key) && !used.has(scheduleEmp.key)) return {emp:points.get(scheduleEmp.key),key:scheduleEmp.key,confidence:1};
  let best=null;
  for(const [key,p] of points){
    if(used.has(key)) continue;
    const s=similarity(scheduleEmp.key,key);
    if(s>=0.92 && (!best || s>best.confidence)) best={emp:p,key,confidence:s};
  }
  return best;
}

function calculate(point,schedule){
  const warnings=[];
  if(point.store && schedule.store && point.store!==schedule.store){
    throw new Error(`Arquivos de lojas diferentes: ponto ${point.store} e escala ${schedule.store}.`);
  }

  const starts=[point.periodStart,schedule.periodStart].filter(Boolean).sort();
  const ends=[point.periodEnd,schedule.periodEnd].filter(Boolean).sort();
  const start=starts.at(-1)||null;
  const end=ends[0]||null;
  if(start && end && start>end) throw new Error('Os períodos do ponto e da escala não possuem datas em comum.');
  if(point.periodStart!==schedule.periodStart || point.periodEnd!==schedule.periodEnd){
    warnings.push(`Períodos não são idênticos; foi considerada apenas a interseção ${start||'?'} a ${end||'?'}.`);
  }

  let deviations=0,nc=0,totalMarks=0,matched=0;
  const used=new Set();
  const unmatched=[];
  const fuzzy=[];
  const missingTurns=new Set();

  for(const sEmp of schedule.employees.values()){
    const hit=findPointEmployee(sEmp,point.employees,used);
    if(!hit){ unmatched.push(sEmp.name); continue; }
    used.add(hit.key);
    matched++;
    if(hit.confidence<1) fuzzy.push(`${sEmp.name} ↔ ${hit.emp.name}`);

    for(const [date,sDay] of sEmp.days){
      if((start && date<start) || (end && date>end)) continue;
      const pDay=hit.emp.days.get(date);
      if(!pDay) continue;
      totalMarks += pDay.marks.length;
      if(!pDay.firstEntry) continue;

      if(NON_WORK_CODES.has(sDay.code)){
        nc++;
        continue;
      }
      if(/^T\d+$/i.test(sDay.code)){
        if(!sDay.start){ missingTurns.add(sDay.code); continue; }
        if(timeDiff(sDay.start,pDay.firstEntry)>90) deviations++;
      }
    }
  }

  if(!matched) throw new Error('Nenhum colaborador da escala foi conciliado com o espelho de ponto.');
  if(!totalMarks) throw new Error('Não encontrei marcações de ponto utilizáveis no período conciliado.');
  if(unmatched.length) warnings.push(`${unmatched.length} colaborador(es) da escala sem correspondência no ponto.`);
  if(fuzzy.length) warnings.push(`${fuzzy.length} nome(s) conciliado(s) por similaridade aproximada.`);
  if(missingTurns.size) warnings.push(`Turnos sem horário reconhecido na legenda: ${[...missingTurns].sort().join(', ')}.`);

  const raw=1-(deviations+10*nc)/totalMarks;
  return {
    adherence:Math.max(0,Math.min(1,raw)), raw, deviations, nc, totalMarks,
    matched, totalSchedule:schedule.employees.size, warnings:[...new Set(warnings)],
    store:schedule.store||point.store||''
  };
}

function setStatus(id,msg,type='muted'){
  const el=$(id);
  el.textContent=msg;
  el.className=`status ${type}`;
}
function updateButton(){ calculateBtn.disabled=!(pointData&&scheduleData); }

pointInput.addEventListener('change',async()=>{
  const file=pointInput.files[0];
  pointData=null;
  updateButton();
  $('pointFileName').textContent=file?.name||'Nenhum arquivo selecionado';
  if(!file) return;
  try{
    setStatus('pointStatus','Lendo PDF…');
    pointData=parsePointRows(await pdfPages(file));
    setStatus('pointStatus',`✓ ${pointData.employees.size} colaboradores reconhecidos${pointData.store?' • '+pointData.store:''}`,'ok');
  }catch(e){
    console.error(e);
    setStatus('pointStatus',`Erro: ${e.message}`,'error');
  }
  updateButton();
});

scheduleInput.addEventListener('change',async()=>{
  const file=scheduleInput.files[0];
  scheduleData=null;
  updateButton();
  $('scheduleFileName').textContent=file?.name||'Nenhum arquivo selecionado';
  if(!file) return;
  try{
    setStatus('scheduleStatus','Lendo escala…');
    if(/\.pdf$/i.test(file.name)) scheduleData=parseSchedulePdfPages(await pdfPages(file));
    else scheduleData=parseScheduleWorkbook(await file.arrayBuffer());
    setStatus('scheduleStatus',`✓ ${scheduleData.employees.size} colaboradores reconhecidos${scheduleData.store?' • '+scheduleData.store:''} • ${scheduleData.source.toUpperCase()}`,'ok');
  }catch(e){
    console.error(e);
    setStatus('scheduleStatus',`Erro: ${e.message}`,'error');
  }
  updateButton();
});

calculateBtn.addEventListener('click',()=>{
  try{
    const r=calculate(pointData,scheduleData);
    $('resultPercent').textContent=fmtPct(r.adherence);
    $('resultStore').textContent=r.store||'Loja não identificada';
    $('matchedPeople').textContent=`${r.matched}/${r.totalSchedule}`;
    $('deviations').textContent=r.deviations;
    $('nonConformities').textContent=r.nc;
    $('totalMarks').textContent=r.totalMarks;
    $('warnings').innerHTML=r.warnings.map(w=>`⚠ ${w}`).join('<br>');
    $('resultCard').classList.remove('hidden');
  }catch(e){
    $('resultCard').classList.add('hidden');
    alert(e.message);
  }
});

$('resetBtn').addEventListener('click',()=>{
  pointInput.value='';
  scheduleInput.value='';
  pointData=null;
  scheduleData=null;
  $('pointFileName').textContent='Nenhum arquivo selecionado';
  $('scheduleFileName').textContent='Nenhum arquivo selecionado';
  setStatus('pointStatus','Aguardando arquivo');
  setStatus('scheduleStatus','Aguardando arquivo');
  $('resultCard').classList.add('hidden');
  updateButton();
});
