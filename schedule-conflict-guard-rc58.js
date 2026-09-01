(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_CONFLICT_GUARD_RC58__||!window.XLSX)return;
window.__ADERENCIA_SCHEDULE_CONFLICT_GUARD_RC58__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING,partial=window.ADERENCIA_SCHEDULE_PARTIAL;
if(!h?.normalizeExcel||!partial?.partial)return;
const previous=h.normalizeExcel.bind(h),VERSION='RC58.2';
const excel=file=>!!file&&/\.(xlsx|xlsm|xls)$/i.test(file.name||'');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const employeeKey=v=>norm(v).replace(/^\d+\s+/,'').split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join(' ');
const scheduleCode=v=>{const n=norm(v).replace(/^T\s+(\d{1,2})$/,'T$1');return /^(?:T\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE|D)$/.test(n)?n:null};
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const br=s=>String(s||'').split('-').reverse().join('/');
const TIME='(?:[01]\\d|2[0-3]):[0-5]\\d';
function expected(ctx){const out=[],a=new Date(`${ctx.start}T12:00:00`),b=new Date(`${ctx.end}T12:00:00`);if(isNaN(a)||isNaN(b)||b<a)return out;for(let d=new Date(a);d<=b;d.setDate(d.getDate()+1))out.push(dateKey(d));return out}
function cellDate(v){
 if(v instanceof Date&&!isNaN(v))return dateKey(v);
 if(typeof v==='number'&&v>30000){const x=XLSX.SSF.parse_date_code(v);if(x)return`${x.y}-${String(x.m).padStart(2,'0')}-${String(x.d).padStart(2,'0')}`}
 const s=String(v??'').trim();let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})$/);if(m)return`${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
 m=s.match(/^(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})$/);return m?`${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`:null;
}
function nameHeader(v){return /^(?:NOME|NOME DO COLABORADOR|NOME DO FUNCIONARIO|COLABORADOR|COLABORADORA|FUNCIONARIO|FUNCIONARIA|EMPREGADO|EMPREGADA)\b/.test(norm(v))}
function fatalFrom(error,code='ADERENCIA_CONFLICTING_SCHEDULE_GRIDS'){
 const e=new Error(String(error?.message||'RC58: conflito fatal na escala.'));
 e.name=code==='ADERENCIA_CONFLICTING_SHIFT_LEGEND'?'AderenciaShiftLegendConflictError':'AderenciaScheduleConflictError';
 e.code=code;e.aderenciaFatal=true;e.cause=error;return e;
}
function gridConflictError(c){
 const whereA=c.firstSheet===c.secondSheet?`${c.firstSheet} col. ${c.firstColumn}`:c.firstSheet;
 const whereB=c.firstSheet===c.secondSheet?`${c.secondSheet} col. ${c.secondColumn}`:c.secondSheet;
 return new Error(`RC58: conflito entre grades para ${c.employee} em ${br(c.date)} (${c.existing} em ${whereA} × ${c.incoming} em ${whereB}).`);
}
function legendConflictError(c){
 const a=`${c.existing.start}-${c.existing.end} em ${c.existing.sheet} linha ${c.existing.row}`;
 const b=`${c.incoming.start}-${c.incoming.end} em ${c.incoming.sheet} linha ${c.incoming.row}`;
 return new Error(`RC58: legenda de turno contraditória para ${c.turn} (${a} × ${b}).`);
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
function scanLegendConflict(wb){
 const ledger=new Map();
 const register=(turn,start,end,sheet,row)=>{
   if(!turn||!start||!end)return null;
   const prior=ledger.get(turn),incoming={start,end,sheet,row};
   if(prior&&(prior.start!==start||prior.end!==end))return{kind:'legend',turn,existing:prior,incoming};
   if(!prior)ledger.set(turn,incoming);
   return null;
 };
 const flex=new RegExp(`\\bT\\s*(\\d{1,2})\\b[^0-9\\n]{0,48}?(${TIME})[^0-9\\n]{0,28}?(${TIME})`,'gi');
 const exactTime=new RegExp(`\\b(${TIME})\\b`,'g');
 for(const sheet of wb.SheetNames){
   const ws=wb.Sheets[sheet];if(!ws)continue;
   const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
   for(let r=0;r<Math.min(rows.length,620);r++){
     const row=rows[r]||[];
     for(const value of row){
       for(const m of String(value||'').matchAll(flex)){
         const c=register(`T${+m[1]}`,m[2],m[3],sheet,r+1);if(c)return c;
       }
     }
     for(let c=0;c<Math.min(row.length,260);c++){
       const turn=norm(row[c]).replace(/^T\s+(\d{1,2})$/,'T$1');
       if(!/^T\d{1,2}$/.test(turn))continue;
       const times=[];
       for(let j=c+1;j<Math.min(row.length,c+8)&&times.length<2;j++)for(const m of String(row[j]||'').matchAll(exactTime)){times.push(m[1]);if(times.length>=2)break}
       if(times.length>=2){const conflict=register(turn,times[0],times[1],sheet,r+1);if(conflict)return conflict}
     }
   }
 }
 return null;
}
function scanGridConflict(wb,ctx){
 const ledger=new Map();
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
         if(prior&&prior.code!==v.code)return{kind:'grid',employee:name,date:v.date,existing:prior.code,incoming:v.code,firstSheet:prior.sheet,secondSheet:sheet,firstColumn:prior.column+1,secondColumn:v.column+1};
         if(!prior)ledger.set(id,{code:v.code,sheet,column:v.column});
       }
     }
   }
 }
 return null;
}
function scanWorkbook(file,ctx){
 const wb=XLSX.read(file,{type:'array',cellDates:true,cellFormula:true});
 return scanLegendConflict(wb)||scanGridConflict(wb,ctx);
}
async function structuralPreflight(file,ctx){
 try{
   const buffer=await file.arrayBuffer(),conflict=scanWorkbook(buffer,ctx);
   window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.lastScan={source:file.name,store:ctx.store,conflict:conflict||null,at:new Date().toISOString()};
   if(!conflict)return null;
   return conflict.kind==='legend'?fatalFrom(legendConflictError(conflict),'ADERENCIA_CONFLICTING_SHIFT_LEGEND'):fatalFrom(gridConflictError(conflict));
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
