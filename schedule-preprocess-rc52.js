(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__)return;
window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__=true;
const input=document.getElementById('scheduleFile'),status=document.getElementById('scheduleStatus'),nameEl=document.getElementById('scheduleFileName'),calc=document.getElementById('calculateBtn'),result=document.getElementById('resultCard');
if(!input)return;
let busy=false,passing=false;
function excel(file){return !!file&&/\.(xlsx|xlsm|xls)$/i.test(file.name||'')&&!/^RC51_/i.test(file.name||'')&&!/^RC52_/i.test(file.name||'')}
function setFiles(file){const dt=new DataTransfer();if(file)dt.items.add(file);input.files=dt.files}
function context(){const h=window.ADERENCIA_SCHEDULE_HARDENING,c=h?.pointContext?.();return h?.normalizeExcel&&c?.store&&c?.start&&c?.end?{h,c}:null}
function dispatch(){passing=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{passing=false}}
function pass(file){setFiles(file);dispatch()}
function invalidate(file){
 setFiles(null);dispatch();setFiles(file);
 if(nameEl&&file)nameEl.textContent=file.name;
 if(result)result.classList.add('hidden');
 if(calc)calc.disabled=true;
}
function blocked(file,ctx,error){
 const detail=String(error?.message||error||'identidade da escala não confirmada');
 if(status){status.textContent=detail;status.className='status error'}
 if(nameEl&&file)nameEl.textContent=file.name;
 if(calc)calc.disabled=true;if(result)result.classList.add('hidden');
 window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'blocked',source:file?.name||null,store:ctx?.store||null,start:ctx?.start||null,end:ctx?.end||null,error:detail,errorCode:error?.code||null,fatal:true,at:new Date().toISOString()};
}
window.addEventListener('change',ev=>{
 if(ev.target!==input||passing||busy)return;
 const file=input.files?.[0];
 if(!file||!excel(file))return;
 const x=context();
 if(!x){window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'bypass',reason:'no-validated-point-context',source:file.name,at:new Date().toISOString()};return}
 ev.preventDefault();ev.stopImmediatePropagation();busy=true;
 const {h,c:ctx}=x;invalidate(file);
 if(status){status.textContent='RC58: validando transação, identidade e estrutura da escala...';status.className='status error'}
 Promise.resolve(h.normalizeExcel(file,ctx)).then(normalized=>{
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'normalized',source:file.name,target:normalized.name,store:ctx.store,start:ctx.start,end:ctx.end,at:new Date().toISOString()};
   pass(normalized);
 }).catch(error=>{
   if(error?.aderenciaFatal){console.warn('RC58: fallback bloqueado por identidade forte da escala.',error);blocked(file,ctx,error);return}
   console.warn('RC52: pré-normalização não aplicada; usando parser principal.',error);
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'core-fallback',source:file.name,store:ctx.store,start:ctx.start,end:ctx.end,error:String(error?.message||error),fatal:false,at:new Date().toISOString()};
   pass(file);
 }).finally(()=>{busy=false});
},true);
window.ADERENCIA_SCHEDULE_PREPROCESS={version:'RC52.3',transactionGuardVersion:'RC58.1',get busy(){return busy},get passing(){return passing},invalidate,last:null};
})();