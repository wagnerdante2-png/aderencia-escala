(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_CONFLICT_GUARD_RC58__||!window.XLSX)return;
window.__ADERENCIA_SCHEDULE_CONFLICT_GUARD_RC58__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING,partial=window.ADERENCIA_SCHEDULE_PARTIAL;
if(!h?.normalizeExcel||!partial?.partial)return;
const previous=h.normalizeExcel.bind(h),VERSION='RC58.1';
const excel=file=>!!file&&/\.(xlsx|xlsm|xls)$/i.test(file.name||'');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const employeeKey=v=>norm(v).replace(/^\d+\s+/,'').split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join(' ');
const scheduleCode=v=>{const n=norm(v).replace(/^T\s+(\d{1,2})$/,'T$1');return /^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE|D)$/.test(n)?n:null};
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const br=s=>String(s||'').split('-').reverse().join('/');
function expected(ctx){const out=[],a=new Date(`${ctx.start}T12:00:00`),b=new Date(`${ctx.end}T12:00:00`);if(isNaN(a)||isNaN(b)||b<a)return out;for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1))out.push(dateKey(d));return out}
function cellDate(v){
 if(v instanceof Date&&!isNaN(v))return dateKey(v);
 if(typeof v==='number'&&v>30000){const x=XLSX.SSF.parse_date_code(v);if(x)return`${x.y}-${String(x.m).padStart(2,'0')}-${String(x.d).padStart(2,'0')}`}
 const s=String(v??'').trim();let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})$/);if(m)return`${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
 m=s.match(/^(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})$/);return m?`${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`:null;
}
function nameHeader(v){return /^(?:NOME|NOME DO COLABORADOR|NOME DO FUNCIONARIO|COLABORADOR|COLABORADORA|FUNCIONARIO|FUNCIONARIA|EMPREGADO|EMPREGADA)\b/.test(norm(v))}
function fatalFrom(error){
 const e=new Error(String(error?.message||'RC58: conflito fatal entre grades de escala.'));
 e.name='AderenciaScheduleConflictError';
 e.code='ADERENCIA_CONFLICTING_SCHEDULE_GRIDS';
 e.aderenciaFatal=true;
 e.cause=error;
 return e;
}
function conflictError(c){
 const whereA=c.firstSheet===c.secondSheet?`${c.firstSheet} col. ${c.firstColumn}`:c.firstSheet;
 const whereB=c.firstSheet===c.secondSheet?`${c.secondSheet} col. ${c.secondColumn}`:c.secondSheet;
 return new Error(`RC58: conflito entre grades para ${c.employee} em ${br(c.date)} (${c.existing} em ${whereA} × ${c.incoming} em ${whereB}).`);
}
function structuralCandidates(rows,ctx){
 const expSet=new Set(expected(ctx)),out=[];
 for(let r=0;r<Math.min(rows.length,240);r++){
   const dates=[];
   for(let c=0;c<Math.min((rows[r]||[]).length,520);c++){
     const d=cellDate(rows[r][c]);
     if(d&&expSet.has(d))dates.push({c,date:d});
   }
   if(dates.length<3)continue;
   const firstDateCol=Math.min(...dates.map(x=>x.c));
   let header=null;
   for(let rr=Math.max(0,r-8);rr<=Math.min(rows.length-1,r+8)&&!header;rr++){
     for(let c=0;c<Math.min(firstDateCol+1,140);c++)if(nameHeader(rows[rr]?.[c])){header={r:rr,c};break}
   }
   if(header)out.push({dateRow:r,nameRow:header.r,nameCol:header.c,dates});
 }
 return out;
}
function scanWorkbook(file,ctx){
 const wb=XLSX.read(file,{type:'array',cellDates:true,cellFormula:true}),ledger=new Map();
 for(const sheet of wb.SheetNames){
   const ws=wb.Sheets[sheet];if(!ws)continue;
   const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
   for(const candidate of structuralCandidates(rows,ctx)){
     const start=Math.max(candidate.dateRow,candidate.nameRow)+1;
     for(let r=start;r<Math.min(rows.length,start+320);r++){
       const row=rows[r]||[],name=String(row[candidate.nameCol]??'').trim(),key=employeeKey(name);
       if(!key||key.length<4||!/[A-Z]/.test(key)||/^(?:TOTAL|LEGENDA|GERENCIAL|CONSOLIDADO|SUBTOTAL|EMPREGADO|EMPREGADA|COLABORADOR|COLABORADORA|FUNCIONARIO|FUNCIONARIA)$/.test(key))continue;
       const values=candidate.dates.map(d=>({date:d.date,column:d.c,code:scheduleCode(row[d.c])})).filter(x=>x.code);
       if(values.length<Math.max(2,Math.floor(candidate.dates.length*.20)))continue;
       for(const v of values){
         const id=`${key}|${v.date}`,prior=ledger.get(id);
         if(prior&&prior.code!==v.code){
           return {employee:name,date:v.date,existing:prior.code,incoming:v.code,firstSheet:prior.sheet,secondSheet:sheet,firstColumn:prior.column+1,secondColumn:v.column+1};
         }
         if(!prior)ledger.set(id,{code:v.code,sheet,column:v.column});
       }
     }
   }
 }
 return null;
}
async function structuralPreflight(file,ctx){
 try{
   const buffer=await file.arrayBuffer(),conflict=scanWorkbook(buffer,ctx);
   window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.lastScan={source:file.name,store:ctx.store,conflict:conflict||null,at:new Date().toISOString()};
   return conflict?fatalFrom(conflictError(conflict)):null;
 }catch(error){
   window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.lastScan={source:file?.name||'',store:ctx?.store||null,scanError:String(error?.message||error),at:new Date().toISOString()};
   return null;
 }
}
async function legacyPreflight(file,ctx){
 const previousAudit=h.lastAudit,previousPartial=partial.last;
 try{
   await partial.partial(file,ctx);
   return null;
 }catch(error){
   if(/^RC55:\s*conflito entre grades\b/i.test(String(error?.message||'')))return fatalFrom(error);
   return null;
 }finally{
   h.lastAudit=previousAudit;
   partial.last=previousPartial;
 }
}
async function preflight(file,ctx){
 if(!excel(file)||!ctx?.store||!ctx?.start||!ctx?.end)return null;
 const structural=await structuralPreflight(file,ctx);if(structural)return structural;
 return legacyPreflight(file,ctx);
}
async function normalize(file,ctx){
 const fatal=await preflight(file,ctx);
 if(fatal){
   window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.last={blocked:true,code:fatal.code,source:file?.name||'',store:ctx?.store||null,start:ctx?.start||null,end:ctx?.end||null,error:fatal.message,at:new Date().toISOString()};
   throw fatal;
 }
 return previous(file,ctx);
}
h.normalizeExcel=normalize;
window.ADERENCIA_SCHEDULE_CONFLICT_GUARD={version:VERSION,normalize,preflight,scanWorkbook,last:null,lastScan:null};
})();
