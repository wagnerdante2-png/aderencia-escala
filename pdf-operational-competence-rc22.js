(function(){
'use strict';
if(window.__ADERENCIA_PDF_OPERATIONAL_COMPETENCE_RC22__)return;
window.__ADERENCIA_PDF_OPERATIONAL_COMPETENCE_RC22__=true;
const input=document.getElementById('scheduleFile');
if(!input||!window.XLSX)return;
let redispatch=false;
const pad=n=>String(n).padStart(2,'0');
const br=(y,m,d)=>`${pad(d)}/${pad(m+1)}/${y}`;
function validDate(y,m,d){const x=new Date(y,m,d,12);return x.getFullYear()===y&&x.getMonth()===m&&x.getDate()===d}
function findGrid(rows){for(let r=0;r<Math.min(rows.length,30);r++){const row=rows[r]||[];const n=row.findIndex(v=>String(v||'').trim().toUpperCase()==='NOME');const c=row.findIndex(v=>String(v||'').trim().toUpperCase()==='CARGO');if(n>=0&&c>n)return{r,nameCol:n,cargoCol:c,firstDateCol:c+1}}return null}
function isTarget(){const f=input.files?.[0],g=window.ADERENCIA_PDF_GRID_INFO,d=window.ADERENCIA_PDF_DEBUG;return !!(f&&g?.originalName&&d?.monthYear&&Array.isArray(d?.days)&&/PDF_ESTRUTURADO_/i.test(f.name));}
function setOkStatus(text){const st=document.getElementById('scheduleStatus');if(!st)return;st.textContent=text;st.classList.remove('muted','error');st.classList.add('ok')}
async function apply(){if(redispatch||!isTarget())return false;const f=input.files[0],dbg=window.ADERENCIA_PDF_DEBUG,days=dbg.days.map(Number),my=dbg.monthYear;if(days.length<20||my?.month==null||!my?.year)return false;const wrap=days.findIndex((d,i)=>i>0&&d<days[i-1]);if(wrap<0)return false;
const mapped=[];for(let i=0;i<days.length;i++){const d=days[i];let y=my.year,m=my.month;if(i<wrap){m--;if(m<0){m=11;y--}}if(!validDate(y,m,d)){mapped.push({i,day:d,date:null,invalid:true});continue}mapped.push({i,day:d,date:br(y,m,d),invalid:false})}
const keep=mapped.filter(x=>!x.invalid);if(keep.length<20)return false;const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true}),wsName=wb.SheetNames.includes('Escala Ponto')?'Escala Ponto':wb.SheetNames[0],ws=wb.Sheets[wsName],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true}),g=findGrid(rows);if(!g)return false;const out=[];for(let r=0;r<rows.length;r++){const row=rows[r]||[];if(r===g.r){out.push([row[g.nameCol]||'Nome',row[g.cargoCol]||'Cargo',...keep.map(x=>x.date)])}else if(r>g.r){out.push([row[g.nameCol]||'',row[g.cargoCol]||'',...keep.map(x=>row[g.firstDateCol+x.i]??'')])}else out.push(row.slice())}
wb.Sheets[wsName]=XLSX.utils.aoa_to_sheet(out);const arr=XLSX.write(wb,{bookType:'xlsx',type:'array'}),fixed=new File([arr],f.name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),dt=new DataTransfer();dt.items.add(fixed);input.files=dt.files;const info=window.ADERENCIA_PDF_GRID_INFO||{};info.periodStart=keep[0].date.split('/').reverse().join('-');info.periodEnd=keep.at(-1).date.split('/').reverse().join('-');info.operationalCompetence={version:'RC23',headerMonth:my.month+1,headerYear:my.year,originalColumns:days.length,validColumns:keep.length,dropped:mapped.filter(x=>x.invalid).map(x=>x.day),rule:'mes-cabecalho=fechamento; dias 11+ no mes anterior; dias 1-10 no mes do cabecalho'};window.ADERENCIA_PDF_GRID_INFO=info;
redispatch=true;input.dispatchEvent(new Event('change',{bubbles:true}));redispatch=false;
setTimeout(()=>setOkStatus(`Reconhecida: ${info.store||''} • PDF estruturado RC23 • ${keep[0].date} a ${keep.at(-1).date} • ${keep.length} dias válidos${info.operationalCompetence.dropped.length?` • coluna inválida descartada: ${info.operationalCompetence.dropped.join(', ')}`:''}`),120);
return true}
window.addEventListener('change',e=>{if(e.target!==input||redispatch||!isTarget())return;e.stopImmediatePropagation();e.preventDefault();apply().then(changed=>{if(!changed){redispatch=true;input.dispatchEvent(new Event('change',{bubbles:true}));redispatch=false}}).catch(err=>{console.error('Competência operacional PDF RC23',err);redispatch=true;input.dispatchEvent(new Event('change',{bubbles:true}));redispatch=false})},true);
window.ADERENCIA_PDF_OPERATIONAL_COMPETENCE={version:'RC23',apply};
})();