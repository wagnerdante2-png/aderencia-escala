(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__)return;
window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__=true;
const input=document.getElementById('scheduleFile'),status=document.getElementById('scheduleStatus');
if(!input)return;
let busy=false,bypass=false;
function excel(file){return !!file&&/\.(xlsx|xlsm|xls)$/i.test(file.name||'')&&!/^RC51_/i.test(file.name||'')&&!/^RC52_/i.test(file.name||'')}
function setFiles(file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files}
input.addEventListener('change',ev=>{
 const file=input.files?.[0];
 if(!file||bypass||busy||!excel(file))return;
 const h=window.ADERENCIA_SCHEDULE_HARDENING,ctx=h?.pointContext?.();
 if(!h?.normalizeExcel||!ctx?.store||!ctx?.start||!ctx?.end)return;
 ev.preventDefault();ev.stopImmediatePropagation();busy=true;
 if(status){status.textContent='RC52: preparando escala para a competência reconhecida...';status.className='status error'}
 Promise.resolve(h.normalizeExcel(file,ctx)).then(normalized=>{
   setFiles(normalized);
   input.dispatchEvent(new Event('change',{bubbles:true}));
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'normalized',source:file.name,target:normalized.name,store:ctx.store,start:ctx.start,end:ctx.end,at:new Date().toISOString()};
 }).catch(error=>{
   console.warn('RC52: pré-normalização não aplicada; usando parser principal.',error);
   bypass=true;setFiles(file);input.dispatchEvent(new Event('change',{bubbles:true}));
   setTimeout(()=>{bypass=false},0);
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'core-fallback',source:file.name,store:ctx.store,start:ctx.start,end:ctx.end,error:String(error?.message||error),at:new Date().toISOString()};
 }).finally(()=>{busy=false});
},true);
window.ADERENCIA_SCHEDULE_PREPROCESS={version:'RC52',get busy(){return busy},get bypass(){return bypass},last:null};
})();