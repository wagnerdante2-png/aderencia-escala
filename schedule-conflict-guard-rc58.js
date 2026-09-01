(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_CONFLICT_GUARD_RC58__||!window.XLSX)return;
window.__ADERENCIA_SCHEDULE_CONFLICT_GUARD_RC58__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING,partial=window.ADERENCIA_SCHEDULE_PARTIAL;
if(!h?.normalizeExcel||!partial?.partial)return;
const previous=h.normalizeExcel.bind(h),VERSION='RC58.1';
const excel=file=>!!file&&/\.(xlsx|xlsm|xls)$/i.test(file.name||'');
function fatalFrom(error){
 const e=new Error(String(error?.message||'RC58: conflito fatal entre grades de escala.'));
 e.name='AderenciaScheduleConflictError';
 e.code='ADERENCIA_CONFLICTING_SCHEDULE_GRIDS';
 e.aderenciaFatal=true;
 e.cause=error;
 return e;
}
async function preflight(file,ctx){
 if(!excel(file)||!ctx?.store||!ctx?.start||!ctx?.end)return null;
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
async function normalize(file,ctx){
 const fatal=await preflight(file,ctx);
 if(fatal){
   window.ADERENCIA_SCHEDULE_CONFLICT_GUARD.last={blocked:true,code:fatal.code,source:file?.name||'',store:ctx?.store||null,start:ctx?.start||null,end:ctx?.end||null,error:fatal.message,at:new Date().toISOString()};
   throw fatal;
 }
 return previous(file,ctx);
}
h.normalizeExcel=normalize;
window.ADERENCIA_SCHEDULE_CONFLICT_GUARD={version:VERSION,normalize,preflight,last:null};
})();
