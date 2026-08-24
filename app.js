(function () {
  'use strict';

  if (!window.pdfjsLib || !window.XLSX) {
    alert('Não foi possível carregar os leitores de PDF/Excel. Verifique a conexão com a internet e abra novamente o index.html.');
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const $ = id => document.getElementById(id);
  const pointInput = $('pointFile');
  const scheduleInput = $('scheduleFile');
  const calculateBtn = $('calculateBtn');
  const resetBtn = $('resetBtn');

  let pointData = null;
  let scheduleData = null;

  const NON_WORK_CODES = new Set(['F','FER','AF','AB','AL','FF','FC','NC','AE']);
  const FLEX_CODES = new Set(['D']);
  const CODE_RE = /^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE|D)$/i;
  const MONTHS = {
    JANEIRO:0, FEVEREIRO:1, MARCO:2, MARÇO:2, ABRIL:3, MAIO:4, JUNHO:5,
    JULHO:6, AGOSTO:7, SETEMBRO:8, OUTUBRO:9, NOVEMBRO:10, DEZEMBRO:11
  };

  function norm(v) {
    return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  }
  function isoDate(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  function isoFromBR(v){ const m=String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?`${m[3]}-${m[2]}-${m[1]}`:null; }
  function fmtDate(v){ return v ? v.split('-').reverse().join('/') : '—'; }
  function minutes(t){ const [h,m]=String(t).split(':').map(Number); return h*60+m; }
  function timeDiff(a,b){ const d=Math.abs(minutes(a)-minutes(b)); return Math.min(d,1440-d); }
  function fmtPct(v,d=2){ return `${(v*100).toFixed(d).replace('.',',')}%`; }

  function levenshtein(a,b){
    const m=a.length,n=b.length,dp=Array.from({length:m+1},(_,i)=>[i]);
    for(let j=1;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return dp[m][n];
  }
  function similarity(a,b){ return 1-levenshtein(a,b)/Math.max(a.length,b.length,1); }
  function tokenSimilarity(a,b){
    const aa=new Set(a.split(' ').filter(Boolean)),bb=new Set(b.split(' ').filter(Boolean));
    const common=[...aa].filter(x=>bb.has(x)).length, union=new Set([...aa,...bb]).size||1;
    return common/union;
  }

  function setStatus(id,text,ok){
    const el=$(id); el.textContent=text; el.classList.remove('muted','ok','error'); el.classList.add(ok?'ok':'error');
  }
  function updateCalculateState(){ calculateBtn.disabled=!(pointData&&scheduleData); }

  async function pdfPages(file){
    const bytes=new Uint8Array(await file.arrayBuffer());
    const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    const pages=[];
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p), tc=await page.getTextContent();
      const items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5],w:i.width||0}));
      const rows=[];
      for(const item of items.slice().sort((a,b)=>b.y-a.y||a.x-b.x)){
        let row=rows.find(r=>Math.abs(r.y-item.y)<2.5);
        if(!row){row={y:item.y,items:[]};rows.push(row);}
        row.items.push(item);
      }
      rows.forEach(r=>{r.items.sort((a,b)=>a.x-b.x);r.text=r.items.map(i=>i.text).join(' ');});
      rows.sort((a,b)=>b.y-a.y);
      pages.push({page:p,items,rows,text:rows.map(r=>r.text).join('\n')});
    }
    return pages;
  }

  function parsePointPages(pages){
    const result={type:'point',store:null,periodStart:null,periodEnd:null,employees:new Map()};
    let current=null,inDaily=false;
    for(const page of pages){
      for(const row of page.rows){
        const line=row.text;
        const period=line.match(/Espelho\s+do\s+Ponto\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
        if(period){result.periodStart=isoFromBR(period[1]);result.periodEnd=isoFromBR(period[2]);}

        if(/Matr[ií]cula\s*:/i.test(line)&&/Nome\s*:/i.test(line)){
          const name=(line.match(/Nome\s*:\s*(.*?)(?=\s+(?:Chapa|Admiss[aã]o)\s*:|$)/i)||[])[1];
          const registration=(line.match(/Matr[ií]cula\s*:\s*(.*?)(?=\s+Nome\s*:|$)/i)||[])[1];
          if(name){
            const key=norm(name);
            if(!result.employees.has(key)) result.employees.set(key,{name:name.trim(),key,registration:(registration||'').trim(),cargo:'NÃO IDENTIFICADO',store:null,days:new Map()});
            current=result.employees.get(key); inDaily=false;
          }
          continue;
        }
        if(!current) continue;

        const cargo=(line.match(/^Fun[cç][aã]o\s*:\s*(?:\d+\s*-\s*)?(.*?)(?=\s+C\.C\.|\s+CPF\s*:|$)/i)||[])[1];
        if(cargo) current.cargo=norm(cargo).replace(/^\d+\s*/,'')||'NÃO IDENTIFICADO';

        const ml=(line.match(/\bML\s*0*(\d{1,3})\b/i)||[])[1];
        if(ml){ current.store=`ML${String(Number(ml)).padStart(2,'0')}`; if(!result.store) result.store=current.store; }

        if(/^Data\s+Dia\s+1a\s+E\./i.test(line)){inDaily=true;continue;}
        if(/^Hor[aá]rios\b/i.test(line)||/^(?:C[oó]digo\s+Descri[cç][aã]o|Assinatura)/i.test(line)){inDaily=false;continue;}
        if(!inDaily) continue;

        const dm=line.match(/^(\d{2}\/\d{2}\/\d{4})\b/); if(!dm) continue;
        const date=isoFromBR(dm[1]);
        const marks=[...line.matchAll(/\b([0-2]\d:[0-5]\d)\s*(?:O|I|P)\b/g)].map(m=>m[1]);
        current.days.set(date,{date,firstEntry:marks[0]||null,marks,raw:line});
      }
    }
    if(!result.employees.size) throw new Error('Não encontrei blocos de funcionários no espelho de ponto.');
    if(!result.periodStart||!result.periodEnd) throw new Error('Não consegui identificar o período do espelho de ponto.');
    return result;
  }

  function detectScheduleMonthYear(text){
    const n=norm(text);
    for(const [name,idx] of Object.entries(MONTHS)){
      const re=new RegExp(`\\b${norm(name)}\\s+(20\\d{2})\\b`);
      const m=n.match(re); if(m) return {month:idx,year:Number(m[1])};
    }
    const year=(n.match(/\b(20\d{2})\b/)||[])[1];
    return {month:null,year:year?Number(year):null};
  }

  function buildDates(days,month,year){
    if(month==null||!year||!days.length) return [];
    let m=month,y=year,prev=days[0];
    return days.map((d,i)=>{if(i>0&&d<prev){m++;if(m>11){m=0;y++;}} prev=d; return isoDate(y,m,d);});
  }

  function parseTurnLegend(text){
    const turns=new Map(), clean=String(text).replace(/\r/g,'');
    const patterns=[
      /\b(T\d{1,2})\s*(?:\||-|:)?\s*([0-2]\d:[0-5]\d)\s*(?:A|À|AS|ÀS|-)\s*([0-2]\d:[0-5]\d)/gi,
      /\b(T\d{1,2})\b[^\n]{0,40}?([0-2]\d:[0-5]\d)[^\n]{0,16}?([0-2]\d:[0-5]\d)/gi
    ];
    for(const re of patterns) for(const m of clean.matchAll(re)){const code=norm(m[1]);if(!turns.has(code))turns.set(code,{start:m[2],end:m[3]});}
    return turns;
  }
  function mergeTurns(target,source){for(const [k,v] of source)if(!target.has(k))target.set(k,v);return target;}
  function detectStore(text){
    const ml=(String(text).match(/\bML\s*0*(\d{1,3})\b/i)||[])[1]; if(ml)return `ML${String(Number(ml)).padStart(2,'0')}`;
    const loja=(String(text).match(/\bLOJA\s*0*(\d{1,3})\b/i)||[])[1]; return loja?`ML${String(Number(loja)).padStart(2,'0')}`:null;
  }

  function parseSchedulePdfPages(pages){
    const allText=pages.map(p=>p.text).join('\n');
    const result={type:'schedule',source:'pdf',store:detectStore(allText),periodStart:null,periodEnd:null,employees:new Map(),turns:parseTurnLegend(allText)};
    const {month,year}=detectScheduleMonthYear(allText);
    if(month==null||!year) throw new Error('Não consegui identificar mês e ano no cabeçalho do PDF da escala.');

    for(const page of pages){
      const nomeItem=page.items.find(i=>norm(i.text)==='NOME');
      const cargoItem=page.items.find(i=>norm(i.text)==='CARGO');
      if(!nomeItem||!cargoItem) continue;
      const headerY=nomeItem.y;
      let dayItems=page.items.filter(i=>Math.abs(i.y-headerY)<16&&/^\d{1,2}$/.test(i.text)&&Number(i.text)>=1&&Number(i.text)<=31&&i.x>cargoItem.x+20).sort((a,b)=>a.x-b.x);
      const uniq=[]; for(const item of dayItems) if(!uniq.some(d=>Math.abs(d.x-item.x)<3))uniq.push(item); dayItems=uniq;
      if(dayItems.length<20) continue;
      const dates=buildDates(dayItems.map(i=>Number(i.text)),month,year), firstX=dayItems[0].x,lastX=dayItems.at(-1).x;

      for(const row of page.rows){
        if(row.y>=headerY-3) continue;
        const codes=row.items.filter(i=>i.x>=firstX-10&&i.x<=lastX+20&&CODE_RE.test(i.text));
        if(codes.length<5) continue;
        const name=row.items.filter(i=>i.x<cargoItem.x-3).map(i=>i.text).join(' ').trim();
        if(!name||norm(name)==='NOME')continue;
        const cargo=row.items.filter(i=>i.x>=cargoItem.x-3&&i.x<firstX-8).map(i=>i.text).join(' ').trim();
        const key=norm(name),emp=result.employees.get(key)||{name,key,cargo:norm(cargo)||'NÃO IDENTIFICADO',days:new Map()};
        for(const ci of codes){
          let best=-1,dist=Infinity; dayItems.forEach((d,idx)=>{const x=Math.abs(d.x-ci.x);if(x<dist){dist=x;best=idx;}});
          if(best>=0&&dist<20&&dates[best]){const code=norm(ci.text),turn=result.turns.get(code);emp.days.set(dates[best],{date:dates[best],code,start:turn?.start||null});}
        }
        result.employees.set(key,emp);
      }
    }
    if(!result.employees.size) throw new Error('Não consegui localizar a matriz Nome × Dias no PDF da escala.');
    const dates=[...result.employees.values()].flatMap(e=>[...e.days.keys()]).sort();
    result.periodStart=dates[0]||null;result.periodEnd=dates.at(-1)||null;
    return result;
  }

  function cellText(v){if(v==null)return '';if(v instanceof Date)return v.toISOString();return String(v).trim();}
  function serialToIso(v){if(typeof v!=='number'||v<30000)return null;const o=XLSX.SSF.parse_date_code(v);return o?isoDate(o.y,o.m-1,o.d):null;}
  function dateFromCell(v){if(v instanceof Date&&!Number.isNaN(v.getTime()))return isoDate(v.getFullYear(),v.getMonth(),v.getDate());return serialToIso(v)||isoFromBR(v);}

  function locateGrid(rows){
    let best=null;const limit=Math.min(rows.length,220);
    for(let r=0;r<limit;r++)for(let c=0;c<(rows[r]||[]).length;c++){
      if(norm(cellText(rows[r][c]))!=='NOME')continue;
      let cargo=null;
      for(let rr=Math.max(0,r-2);rr<=Math.min(limit-1,r+2)&&!cargo;rr++)for(let cc=0;cc<(rows[rr]||[]).length;cc++)if(norm(cellText(rows[rr][cc]))==='CARGO'){cargo={r:rr,c:cc};break;}
      if(cargo){const score=100-Math.abs(cargo.r-r)*5;if(!best||score>best.score)best={nameRow:r,nameCol:c,cargoRow:cargo.r,cargoCol:cargo.c,score};}
    }
    return best;
  }

  function bestDateRow(rows,grid){
    let best=null;
    for(let r=Math.max(0,Math.min(grid.nameRow,grid.cargoRow)-5);r<=Math.min(rows.length-1,Math.max(grid.nameRow,grid.cargoRow)+5);r++){
      const candidates=[];let realDates=0;
      for(let c=Math.max(grid.nameCol,grid.cargoCol)+1;c<(rows[r]||[]).length;c++){
        const v=rows[r][c],iso=dateFromCell(v),n=Number(cellText(v));
        if(iso){candidates.push({c,date:iso});realDates++;}else if(Number.isInteger(n)&&n>=1&&n<=31)candidates.push({c,day:n});
      }
      const score=realDates*3+candidates.length;if(!best||score>best.score)best={r,candidates,realDates,score};
    }
    return best;
  }

  function workbookTurns(wb,preferredName){
    const turns=new Map(),names=[preferredName,'Escala Mensal','Escala Ponto',...wb.SheetNames].filter((x,i,a)=>x&&a.indexOf(x)===i);
    for(const name of names){
      const ws=wb.Sheets[name];if(!ws)continue;
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
      for(const row of rows)for(const v of row||[]){const s=String(v||'');if(/\bT\d{1,2}\b/i.test(s)&&/[0-2]\d:[0-5]\d/.test(s))mergeTurns(turns,parseTurnLegend(s));}
      if(turns.size>=30)break;
    }
    return turns;
  }

  function workbookStore(wb,chosen){
    for(const name of [...new Set([chosen?.sheetName,'Escala Mensal','Escala Ponto','Configuração'].filter(Boolean))]){
      const ws=wb.Sheets[name];if(!ws)continue;
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
      const text=rows.slice(0,15).map(r=>(r||[]).slice(0,50).join(' | ')).join('\n');const store=detectStore(text);if(store)return store;
    }
    if(chosen&&/ANDAR NO TEMPO/.test(norm(chosen.sheetName))){
      for(let r=0;r<Math.min(12,chosen.rows.length);r++)for(let c=0;c<Math.min(5,(chosen.rows[r]||[]).length);c++){const n=Number(chosen.rows[r][c]);if(Number.isInteger(n)&&n>=1&&n<=999)return `ML${String(n).padStart(2,'0')}`;}
    }
    return null;
  }

  function parseScheduleWorkbook(buffer){
    const wb=XLSX.read(buffer,{type:'array',cellDates:true,cellFormula:true});let chosen=null;
    const names=['Andar no Tempo','Escala Ponto','Escala Mensal',...wb.SheetNames].filter((x,i,a)=>a.indexOf(x)===i);
    for(const name of names){
      const ws=wb.Sheets[name];if(!ws)continue;
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});if(!rows.length)continue;
      const grid=locateGrid(rows);if(!grid)continue;const dr=bestDateRow(rows,grid);if(!dr||dr.candidates.length<20)continue;
      let codeCount=0,dataStart=Math.max(grid.nameRow,grid.cargoRow)+1;
      for(const row of rows.slice(dataStart,dataStart+120))for(const v of row||[])if(CODE_RE.test(cellText(v)))codeCount++;
      const score=(dr.realDates>=300?100000:0)+dr.realDates*30+dr.candidates.length*5+codeCount+grid.score;
      if(!chosen||score>chosen.score)chosen={sheetName:name,rows,grid,dateRow:dr,score};if(dr.realDates>=300&&codeCount>=100)break;
    }
    if(!chosen)throw new Error('Não encontrei uma aba com a estrutura da Escala Operacional.');

    const result={type:'schedule',source:'excel',sheet:chosen.sheetName,store:workbookStore(wb,chosen),periodStart:null,periodEnd:null,employees:new Map(),turns:workbookTurns(wb,chosen.sheetName)};
    const text=chosen.rows.map(r=>(r||[]).map(cellText).join(' | ')).join('\n');mergeTurns(result.turns,parseTurnLegend(text));
    let dateCols=chosen.dateRow.candidates;
    if(!dateCols.some(x=>x.date)){
      const my=detectScheduleMonthYear(text),built=buildDates(dateCols.map(x=>x.day),my.month,my.year);dateCols=dateCols.map((x,i)=>({c:x.c,date:built[i]}));
    }else dateCols=dateCols.filter(x=>x.date);
    if(dateCols.length<20)throw new Error('Não consegui identificar as datas da escala Excel.');

    const start=Math.max(chosen.grid.nameRow,chosen.grid.cargoRow)+1;
    for(let r=start;r<chosen.rows.length;r++){
      const row=chosen.rows[r]||[],name=cellText(row[chosen.grid.nameCol]);if(!name)continue;
      const key=norm(name);if(!key||/^(TOTAL|LEGENDA|GERENCIAL|MOTOR DE LANCAMENTOS|CONSOLIDADO)$/.test(key))continue;
      const recognized=[];for(const d of dateCols){const code=norm(cellText(row[d.c]));if(CODE_RE.test(code))recognized.push({date:d.date,code});}
      if(recognized.length<5)continue;
      const cargo=norm(cellText(row[chosen.grid.cargoCol]))||'NÃO IDENTIFICADO',emp={name:name.trim(),key,cargo,days:new Map()};
      for(const x of recognized){const turn=result.turns.get(x.code);emp.days.set(x.date,{date:x.date,code:x.code,start:turn?.start||null});}
      result.employees.set(key,emp);
    }
    if(!result.employees.size)throw new Error('Nenhum colaborador foi reconhecido na escala Excel.');
    const dates=[...result.employees.values()].flatMap(e=>[...e.days.keys()]).sort();result.periodStart=dates[0]||null;result.periodEnd=dates.at(-1)||null;return result;
  }

  function findPointEmployee(s,points,used){
    if(points.has(s.key)&&!used.has(s.key))return {emp:points.get(s.key),key:s.key,mode:'exato',confidence:1};
    const prefixes=[];
    for(const [key,p] of points){if(used.has(key))continue;const len=Math.min(s.key.length,key.length);if(len>=12&&(s.key.startsWith(key)||key.startsWith(s.key)))prefixes.push({emp:p,key,mode:'nome truncado',confidence:len/Math.max(s.key.length,key.length)});}
    if(prefixes.length===1)return prefixes[0];
    const cs=[];for(const [key,p] of points){if(used.has(key))continue;const score=similarity(s.key,key)*.65+tokenSimilarity(s.key,key)*.35;cs.push({emp:p,key,mode:'aproximado',confidence:score});}
    cs.sort((a,b)=>b.confidence-a.confidence);const best=cs[0],second=cs[1];return best&&best.confidence>=.94&&(!second||best.confidence-second.confidence>=.04)?best:null;
  }

  function countPointMarks(point,start,end){let total=0;for(const emp of point.employees.values())for(const [date,day] of emp.days)if(date>=start&&date<=end)total+=day.marks.length;return total;}
  function employeesWithMarks(point,start,end){let n=0;for(const emp of point.employees.values()){let x=0;for(const [date,day] of emp.days)if(date>=start&&date<=end)x+=day.marks.length;if(x)n++;}return n;}

  function preliminaryConfidence(){
    $('analysisArea').classList.remove('hidden');
    $('resultCard').classList.add('hidden');
    let score=0,max=100;
    if(pointData?.store)score+=15;
    if(pointData?.periodStart&&pointData?.periodEnd)score+=15;
    if(scheduleData?.store)score+=15;
    if(scheduleData?.periodStart&&scheduleData?.periodEnd)score+=15;
    if(scheduleData?.turns?.size)score+=Math.min(20,scheduleData.turns.size/30*20);
    if(pointData&&scheduleData&&pointData.store===scheduleData.store)score+=10;
    if(pointData&&scheduleData&&scheduleData.periodStart<=pointData.periodStart&&scheduleData.periodEnd>=pointData.periodEnd)score+=10;
    renderConfidence(Math.round(score/max*100),false);
    renderMeta(null);
  }

  function renderConfidence(value,final){
    const v=Math.max(0,Math.min(100,value));$('confidencePercent').textContent=`${v.toFixed(final?1:0).replace('.',',')}%`;$('confidenceBar').style.width=`${v}%`;
    const badge=$('confidenceBadge');badge.className='confidence-badge '+(v>=95?'high':v>=85?'medium':'low');badge.textContent=v>=95?'Alta':v>=85?'Moderada':'Baixa';
  }

  function renderMeta(stats){
    $('metaSource').textContent=scheduleData?(scheduleData.source==='excel'?'Excel/XLSM':'PDF'):'—';
    $('metaStore').textContent=(scheduleData?.store||pointData?.store||'—');
    $('metaPeriod').textContent=pointData?`${fmtDate(pointData.periodStart)} a ${fmtDate(pointData.periodEnd)}`:'—';
    $('metaTurns').textContent=scheduleData?String(scheduleData.turns.size):'—';
    $('metaPointMarks').textContent=pointData?String(countPointMarks(pointData,pointData.periodStart,pointData.periodEnd)):'—';
    $('metaCoverage').textContent=stats?fmtPct(stats.markCoverage,1):'—';
  }

  function renderCauses(stats){
    const items=[];
    items.push({title:`${stats.deviations} desvios acima de 90 min`,text:'Entrada real fora da tolerância em relação ao turno previsto.',cls:stats.deviations?'attention':''});
    items.push({title:`${stats.nonConformities} folgas/ausências com marcação`,text:'Marcação encontrada em F, FER, AF, AB, AL, FF, FC, NC ou AE.',cls:stats.nonConformities?'critical':''});
    if(stats.pointOnly.length)items.push({title:`${stats.pointOnly.length} pessoa(s) apenas no ponto`,text:`Marcações fora da escala reduziram a cobertura para ${fmtPct(stats.markCoverage,1)}.`,cls:'attention'});
    if(stats.unmatchedSchedule.length)items.push({title:`${stats.unmatchedSchedule.length} pessoa(s) apenas na escala`,text:'Sem marcações no espelho, não alteram o denominador.',cls:''});
    if(stats.truncatedMatches)items.push({title:`${stats.truncatedMatches} nome(s) truncado(s) conciliados`,text:'Correspondência segura por prefixo único do nome.',cls:''});
    $('causeSummary').innerHTML=items.map(x=>`<div class="cause-item ${x.cls}"><strong>${x.title}</strong><span>${x.text}</span></div>`).join('');
  }

  function renderCargos(stats){
    const rows=[...stats.cargoStats.entries()].map(([cargo,v])=>({cargo,...v,occ:v.deviations+v.nc,rate:v.days?v.deviations+v.nc:0})).filter(x=>x.occ>0).sort((a,b)=>b.occ-a.occ||b.rate-a.rate).slice(0,5);
    $('cargoSummary').innerHTML=rows.length?rows.map(x=>`<div class="cargo-item"><strong>${x.cargo}</strong><span>${x.occ} ocorrência(s) em ${x.days} dia(s) avaliados • ${x.deviations} desvio(s) • ${x.nc} folga/ausência</span></div>`).join(''):'<p>Nenhuma ocorrência encontrada por cargo.</p>';
  }

  function calculate(){
    if(!pointData||!scheduleData)return;
    $('analysisArea').classList.remove('hidden');
    const warnings=[];
    if(pointData.store&&scheduleData.store&&pointData.store!==scheduleData.store)throw new Error(`Arquivos de lojas diferentes: ponto ${pointData.store} e escala ${scheduleData.store}.`);
    if(!pointData.store||!scheduleData.store)throw new Error('Não foi possível validar a loja nos dois arquivos.');
    const start=pointData.periodStart,end=pointData.periodEnd;
    if(!scheduleData.periodStart||!scheduleData.periodEnd||scheduleData.periodStart>start||scheduleData.periodEnd<end)throw new Error(`A escala não cobre todo o período do espelho (${fmtDate(start)} a ${fmtDate(end)}). Use a escala correspondente ao mesmo período.`);

    const used=new Set(),usedTurns=new Set(),resolvedTurns=new Set(),unmatchedSchedule=[],cargoStats=new Map();
    let matched=0,truncatedMatches=0,approximateMatches=0,deviations=0,nonConformities=0,totalMarks=0,unresolvedTurns=0,unevaluableMarks=0;

    for(const sEmp of scheduleData.employees.values()){
      const match=findPointEmployee(sEmp,pointData.employees,used);if(!match){unmatchedSchedule.push(sEmp.name);continue;}
      used.add(match.key);matched++;if(match.mode==='nome truncado')truncatedMatches++;if(match.mode==='aproximado')approximateMatches++;
      const cargo=match.emp.cargo&&match.emp.cargo!=='NÃO IDENTIFICADO'?match.emp.cargo:(sEmp.cargo||'NÃO IDENTIFICADO');
      if(!cargoStats.has(cargo))cargoStats.set(cargo,{days:0,marks:0,deviations:0,nc:0});const cs=cargoStats.get(cargo);

      for(const [date,sday] of sEmp.days){
        if(date<start||date>end)continue;const pday=match.emp.days.get(date);if(!pday||!pday.marks.length)continue;
        cs.days++;cs.marks+=pday.marks.length;
        if(NON_WORK_CODES.has(sday.code)){totalMarks+=pday.marks.length;nonConformities++;cs.nc++;continue;}
        if(/^T\d{1,2}$/.test(sday.code)){
          usedTurns.add(sday.code);if(!sday.start){unresolvedTurns++;unevaluableMarks+=pday.marks.length;continue;}resolvedTurns.add(sday.code);
          totalMarks+=pday.marks.length;if(pday.firstEntry&&timeDiff(sday.start,pday.firstEntry)>90){deviations++;cs.deviations++;}continue;
        }
        if(FLEX_CODES.has(sday.code)){unevaluableMarks+=pday.marks.length;continue;}
        unevaluableMarks+=pday.marks.length;
      }
    }
    if(!matched)throw new Error('Nenhum colaborador pôde ser conciliado entre a escala e o espelho de ponto.');
    if(unresolvedTurns)throw new Error(`${unresolvedTurns} dia(s) com marcação possuem turno sem horário reconhecido. O cálculo foi bloqueado para evitar percentual incorreto.`);
    if(!totalMarks)throw new Error('Não encontrei marcações utilizáveis nas datas conciliadas.');

    const totalPointMarks=countPointMarks(pointData,start,end),markCoverage=totalPointMarks?totalMarks/totalPointMarks:0;
    const pointOnly=[...pointData.employees.entries()].filter(([k])=>!used.has(k)).map(([,e])=>({name:e.name,marks:[...e.days.entries()].reduce((s,[d,x])=>s+(d>=start&&d<=end?x.marks.length:0),0)})).filter(x=>x.marks>0);
    const pointPeople=employeesWithMarks(pointData,start,end),nameCoverage=pointPeople?Math.min(1,matched/pointPeople):0,turnCoverage=usedTurns.size?resolvedTurns.size/usedTurns.size:1;

    let confidence=15+15+25*turnCoverage+30*Math.min(1,markCoverage)+15*nameCoverage;
    confidence-=Math.min(5,approximateMatches*1.5);confidence=Math.max(0,Math.min(100,confidence));

    const stats={matched,truncatedMatches,approximateMatches,deviations,nonConformities,totalMarks,totalPointMarks,markCoverage,nameCoverage,turnCoverage,pointOnly,unmatchedSchedule,cargoStats,unevaluableMarks,confidence};
    renderConfidence(confidence,true);renderMeta(stats);renderCauses(stats);renderCargos(stats);

    if(markCoverage<.98)throw new Error(`Cobertura insuficiente para resultado confiável: ${fmtPct(markCoverage,1)} das marcações puderam ser cruzadas (${totalMarks}/${totalPointMarks}).`);
    if(confidence<90)throw new Error(`Confiabilidade insuficiente (${fmtPct(confidence/100,1)}). O cálculo foi bloqueado para revisão dos metadados.`);

    if(truncatedMatches)warnings.push(`${truncatedMatches} nome(s) truncado(s) no PDF foram conciliados com segurança.`);
    if(approximateMatches)warnings.push(`${approximateMatches} nome(s) conciliado(s) por similaridade controlada.`);
    if(pointOnly.length)warnings.push(`${pointOnly.length} colaborador(es) do ponto não aparecem na escala.`);
    if(unmatchedSchedule.length)warnings.push(`${unmatchedSchedule.length} colaborador(es) da escala não aparecem no espelho.`);
    if(unevaluableMarks)warnings.push(`${unevaluableMarks} marcação(ões) de códigos sem horário fixo foram excluídas.`);
    warnings.unshift(`Validação OK • confiabilidade ${fmtPct(confidence/100,1)} • loja ${pointData.store} • cobertura ${fmtPct(markCoverage,1)} • ${scheduleData.turns.size} turnos reconhecidos.`);

    const adherence=1-(deviations+10*nonConformities)/totalMarks;
    $('resultPercent').textContent=fmtPct(adherence);$('resultStore').textContent=scheduleData.store||pointData.store||'';$('matchedPeople').textContent=`${matched}/${pointData.employees.size}`;
    $('deviations').textContent=String(deviations);$('nonConformities').textContent=String(nonConformities);$('totalMarks').textContent=String(totalMarks);$('warnings').innerHTML=warnings.map(w=>`<div>${w}</div>`).join('');$('resultCard').classList.remove('hidden');
  }

  pointInput.addEventListener('change',async function(){
    const file=pointInput.files?.[0];pointData=null;$('resultCard').classList.add('hidden');$('pointFileName').textContent=file?file.name:'Nenhum arquivo selecionado';
    if(!file){setStatus('pointStatus','Aguardando arquivo',false);updateCalculateState();return;}
    try{setStatus('pointStatus','Lendo PDF...',false);pointData=parsePointPages(await pdfPages(file));const total=countPointMarks(pointData,pointData.periodStart,pointData.periodEnd);setStatus('pointStatus',`Reconhecido: ${pointData.employees.size} funcionário(s) • ${pointData.store||'loja não identificada'} • ${total} marcações`,true);}catch(e){setStatus('pointStatus',`Erro: ${e.message}`,false);alert(e.message);}updateCalculateState();if(pointData||scheduleData)preliminaryConfidence();
  });

  scheduleInput.addEventListener('change',async function(){
    const file=scheduleInput.files?.[0];scheduleData=null;$('resultCard').classList.add('hidden');$('scheduleFileName').textContent=file?file.name:'Nenhum arquivo selecionado';
    if(!file){setStatus('scheduleStatus','Aguardando arquivo',false);updateCalculateState();return;}
    try{
      setStatus('scheduleStatus','Lendo escala...',false);const lower=file.name.toLowerCase();
      if(lower.endsWith('.pdf'))scheduleData=parseSchedulePdfPages(await pdfPages(file));else if(/\.(xlsx|xlsm|xls)$/.test(lower))scheduleData=parseScheduleWorkbook(await file.arrayBuffer());else throw new Error('Formato não suportado. Use PDF, XLSX, XLSM ou XLS.');
      const period=scheduleData.periodStart&&scheduleData.periodEnd?` • ${fmtDate(scheduleData.periodStart)} a ${fmtDate(scheduleData.periodEnd)}`:'';
      setStatus('scheduleStatus',`Reconhecida: ${scheduleData.employees.size} funcionário(s) • ${scheduleData.store||'loja não identificada'} • ${scheduleData.turns.size} turnos${period}`,true);
    }catch(e){setStatus('scheduleStatus',`Erro: ${e.message}`,false);alert(e.message);}updateCalculateState();if(pointData||scheduleData)preliminaryConfidence();
  });

  calculateBtn.addEventListener('click',function(){try{calculate();}catch(e){$('resultCard').classList.add('hidden');alert(e.message);}});
  resetBtn.addEventListener('click',function(){
    pointInput.value='';scheduleInput.value='';pointData=null;scheduleData=null;$('pointFileName').textContent='Nenhum arquivo selecionado';$('scheduleFileName').textContent='Nenhum arquivo selecionado';
    $('pointStatus').textContent='Aguardando arquivo';$('scheduleStatus').textContent='Aguardando arquivo';$('pointStatus').className='status muted';$('scheduleStatus').className='status muted';$('resultCard').classList.add('hidden');$('analysisArea').classList.add('hidden');updateCalculateState();
  });
  updateCalculateState();
})();