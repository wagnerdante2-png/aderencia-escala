(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_STORE_INTEGRITY_RC58__||!window.XLSX)return;
window.__ADERENCIA_SCHEDULE_STORE_INTEGRITY_RC58__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING;
if(!h?.normalizeExcel)return;
const previous=h.normalizeExcel.bind(h),VERSION='RC58.2';
const excel=file=>!!file&&/\.(xlsx|xlsm|xls)$/i.test(file.name||'');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const nameHeader=v=>/^(?:NOME|NOME DO COLABORADOR|NOME DO FUNCIONARIO|COLABORADOR|COLABORADORA|FUNCIONARIO|FUNCIONARIA|EMPREGADO|EMPREGADA)\b/.test(norm(v));
function storesIn(text){const out=[];for(const m of String(text||'').matchAll(/\bML\s*0*(\d{1,3})\b/gi))out.push(`ML${String(+m[1]).padStart(2,'0')}`);for(const m of String(text||'').matchAll(/\bLOJA\s*0*(\d{1,3})\b/gi))out.push(`ML${String(+m[1]).padStart(2,'0')}`);return[...new Set(out)]}
function dateLike(v){if(v instanceof Date&&!isNaN(v))return true;if(typeof v==='number'&&v>30000)return true;const s=String(v??'').trim();return /^(?:\d{1,2}[\/-]\d{1,2}[\/-]20\d{2}|20\d{2}[\/-]\d{1,2}[\/-]\d{1,2})$/.test(s)}
function dayLike(v){if(v instanceof Date)return false;const s=String(v??'').trim();return /^\d{1,2}$/.test(s)&&+s>=1&&+s<=31}
function operational(rows){let header=false,calendar=false;for(let r=0;r<Math.min(rows.length,220);r++){const row=rows[r]||[];if(!header)header=row.slice(0,140).some(nameHeader);let count=0;for(let c=0;c<Math.min(row.length,520);c++)if(dateLike(row[c])||dayLike(row[c]))count++;if(count>=7)calendar=true;if(header&&calendar)return true}return false}
function declaredStores(rows){const out=[];for(let r=0;r<Math.min(rows.length,30);r++){const line=(rows[r]||[]).slice(0,180).join(' | ');if(!/(?:ESCALA\s+OPERACIONAL|ESCALA\s+PONTO|ESCALA\s+MENSAL)/i.test(line))continue;out.push(...storesIn(line))}return[...new Set(out)]}
function scanWorkbook(buffer,file,ctx){
 const wb=XLSX.read(buffer,{type:'array',cellDates:true,cellFormula:true}),refs=[],operationalSheets=[],sheetScans=[];
 for(const sheet of wb.SheetNames){
   const ws=wb.Sheets[sheet];if(!ws)continue;
   const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});if(!operational(rows))continue;
   operationalSheets.push(sheet);
   const head=rows.slice(0,80).map(r=>r.slice(0,180).join(' | ')).join('\n'),stores=storesIn(head),declared=declaredStores(rows);
   for(const store of stores)refs.push({store,source:sheet,kind:declared.includes(store)?'declared':'incidental'});
   sheetScans.push({sheet,stores,declaredStores:declared});
 }
 const filenameStores=operationalSheets.length?storesIn(file?.name||''):[],filenameForeign=filenameStores.filter(s=>s!==ctx.store);
 for(const store of filenameStores)refs.push({store,source:'nome do arquivo',kind:'filename'});
 const declaredOperationalStores=[...new Set(sheetScans.flatMap(x=>x.declaredStores))];
 const declaredSheets=sheetScans.filter(x=>x.declaredStores.length>0);
 const crossGridConflict=declaredSheets.length>=2&&declaredOperationalStores.length>1;
 const stores=[...new Set(refs.map(x=>x.store))],foreign=stores.filter(s=>s!==ctx.store);
 const blockingRefs=[];
 for(const store of filenameForeign)blockingRefs.push({store,source:'nome do arquivo'});
 if(crossGridConflict)for(const s of declaredSheets)for(const store of s.declaredStores)blockingRefs.push({store,source:s.sheet});
 return{expectedStore:ctx.store,stores,refs,operationalSheets,sheetScans,declaredOperationalStores,filenameStores,filenameForeign,foreign,crossGridConflict,blockingRefs,ambiguous:filenameForeign.length>0||crossGridConflict};
}
function fatal(scan){const refs=scan.blockingRefs.map(x=>`${x.store} em ${x.source}`).join(', '),e=new Error(`RC58: identidade de loja ambígua na escala para o espelho ${scan.expectedStore}${refs?`: ${refs}`:''}.`);e.name='AderenciaScheduleStoreIntegrityError';e.code='ADERENCIA_AMBIGUOUS_SCHEDULE_STORE';e.aderenciaFatal=true;e.storeScan=scan;return e}
async function preflight(file,ctx){if(!excel(file)||!ctx?.store)return null;try{const scan=scanWorkbook(await file.arrayBuffer(),file,ctx);window.ADERENCIA_SCHEDULE_STORE_INTEGRITY.lastScan={...scan,source:file.name,at:new Date().toISOString()};return scan.ambiguous?fatal(scan):null}catch(error){window.ADERENCIA_SCHEDULE_STORE_INTEGRITY.lastScan={source:file?.name||'',expectedStore:ctx?.store||null,scanError:String(error?.message||error),at:new Date().toISOString()};return null}}
async function normalize(file,ctx){const err=await preflight(file,ctx);if(err){window.ADERENCIA_SCHEDULE_STORE_INTEGRITY.last={blocked:true,code:err.code,source:file?.name||'',expectedStore:ctx?.store||null,error:err.message,at:new Date().toISOString()};throw err}return previous(file,ctx)}
h.normalizeExcel=normalize;
window.ADERENCIA_SCHEDULE_STORE_INTEGRITY={version:VERSION,normalize,preflight,scanWorkbook,last:null,lastScan:null};
})();
