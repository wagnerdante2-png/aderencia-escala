(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__)return;
window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__=true;
const input=document.getElementById('scheduleFile'),status=document.getElementById('scheduleStatus');
if(!input)return;
let busy=false,passing=false;
function excel(file){
 if(!file||!/\.(xlsx|xlsm|xls)$/i.test(file.name||''))return false;
 const n=file.name||'';
 if(/^RC57_/i.test(n)||/^RC52_/i.test(n))return false;
 if(/^RC51_PDF_GRID_RC56_/i.test(n)||/^PDF_GRID_RC57_/i.test(n))return true;
 if(/^RC51_/i.test(n))return false;
 return true;
}
function setFiles(file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files}
function context(){const h=window.ADERENCIA_SCHEDULE_HARDENING,c=h?.pointContext?.();return h?.normalizeExcel&&c?.store&&c?.start&&c?.end?{h,c}:null}
function pass(file){setFiles(file);passing=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{passing=false}}
window.addEventListener('change',ev=>{
 if(ev.target!==input||passing||busy)return;
 const file=input.files?.[0];
 if(!file||!excel(file))return;
 const x=context();
 if(!x){window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'bypass',reason:'no-validated-point-context',source:file.name,at:new Date().toISOString()};return}
 ev.preventDefault();ev.stopImmediatePropagation();busy=true;
 const {h,c:ctx}=x;
 if(status){status.textContent='RC58: conciliando escala com colaboradores e dias reconhecidos no espelho...';status.className='status error'}
 Promise.resolve(h.normalizeExcel(file,ctx)).then(normalized=>{
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'normalized',source:file.name,target:normalized.name,store:ctx.store,start:ctx.start,end:ctx.end,at:new Date().toISOString()};
   pass(normalized);
 }).catch(error=>{
   if(error?.aderenciaFatal){
     console.error('RC58: pré-normalização bloqueada por conflito fatal.',error);
     window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'fatal-block',source:file.name,store:ctx.store,start:ctx.start,end:ctx.end,code:error.code||'ADERENCIA_FATAL_SCHEDULE_ERROR',error:String(error?.message||error),at:new Date().toISOString()};
     if(status){status.textContent=String(error?.message||error);status.className='status error'}
     try{input.value=''}catch{}
     return;
   }
   console.warn('RC52/RC58: pré-normalização não aplicada; usando parser principal.',error);
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'core-fallback',source:file.name,store:ctx.store,start:ctx.start,end:ctx.end,error:String(error?.message||error),at:new Date().toISOString()};
   pass(file);
 }).finally(()=>{busy=false});
},true);
window.ADERENCIA_SCHEDULE_PREPROCESS={version:'RC52.4',get busy(){return busy},get passing(){return passing},last:null};
})();
