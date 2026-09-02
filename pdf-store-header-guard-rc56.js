(function(){
'use strict';
if(window.__ADERENCIA_PDF_STORE_HEADER_GUARD_RC56__||!window.pdfjsLib)return;
window.__ADERENCIA_PDF_STORE_HEADER_GUARD_RC56__=true;
const input=document.getElementById('scheduleFile'),statusEl=document.getElementById('scheduleStatus');
if(!input)return;
const ml=v=>`ML${String(+v).padStart(2,'0')}`;
const stores=(text,re)=>[...new Set([...String(text||'').matchAll(re)].map(m=>ml(m[1])))];
function resolveHeaderStore(text){
 const byMl=stores(text,/\bML\s*0*(\d{1,3})\b/gi);
 if(byMl.length>1)throw new Error(`RC56: cabeçalho PDF ambíguo (${byMl.join(', ')}).`);
 if(byMl.length===1)return byMl[0];
 const byLoja=stores(text,/\bLOJA\s*(?:ML\s*)?0*(\d{1,3})\b/gi);
 if(byLoja.length>1)throw new Error(`RC56: cabeçalho PDF ambíguo (${byLoja.join(', ')}).`);
 return byLoja[0]||null;
}
function validateHeader(text,expectedStore){
 if(!expectedStore)throw new Error('RC56: loja validada do espelho indisponível.');
 const store=resolveHeaderStore(text);
 if(!store)throw new Error('RC56: loja não reconhecida no cabeçalho do PDF.');
 if(store!==expectedStore)throw new Error(`RC56: loja do cabeçalho (${store}) diverge do espelho (${expectedStore}).`);
 return store;
}
function topHeader(items,maxRows=14){
 const rs=[];
 for(const it of items.filter(i=>i.str&&String(i.str).trim()).map(i=>({text:String(i.str).trim(),x:i.transform?.[4]||0,y:i.transform?.[5]||0})).sort((a,b)=>b.y-a.y||a.x-b.x)){
  let r=rs.find(x=>Math.abs(x.y-it.y)<=3.2);if(!r){r={y:it.y,items:[]};rs.push(r)}r.items.push(it);
 }
 return rs.slice(0,maxRows).map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n');
}
async function inspect(file){
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false}).promise;
 if(!pdf.numPages)throw new Error('RC56: PDF sem páginas legíveis.');
 const tc=await (await pdf.getPage(1)).getTextContent(),header=topHeader(tc.items);
 return{store:resolveHeaderStore(header),header};
}
function pointStore(){
 const h=window.ADERENCIA_SCHEDULE_HARDENING,c=h?.pointContext?.();
 return c?.store||window.ADERENCIA_POINT_CONTEXT?.store||null;
}
function block(error,file){
 const detail=String(error?.message||error||'cabeçalho não confirmado');
 if(statusEl){statusEl.textContent=detail;statusEl.className='status error'}
 document.getElementById('calculateBtn')?.setAttribute('disabled','disabled');
 window.ADERENCIA_PDF_STORE_GUARD_RC56.lastBlock={file:file?.name||null,detail,at:new Date().toISOString()};
}
let busy=false,passing=false;
window.addEventListener('change',ev=>{
 if(ev.target!==input||passing||busy)return;
 const file=input.files?.[0];if(!file||!file.name.toLowerCase().endsWith('.pdf'))return;
 ev.preventDefault();ev.stopImmediatePropagation();busy=true;
 Promise.resolve().then(async()=>{
  const expected=pointStore(),result=await inspect(file),store=validateHeader(result.header,expected);
  window.ADERENCIA_PDF_STORE_GUARD_RC56.lastAudit={file:file.name,store,expectedStore:expected,at:new Date().toISOString()};
  passing=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{passing=false}
 }).catch(error=>{console.warn('RC56: PDF bloqueado por identidade de loja.',error);block(error,file)}).finally(()=>{busy=false});
},true);
window.ADERENCIA_PDF_STORE_GUARD_RC56={version:'RC56.1',resolveHeaderStore,validateHeader,topHeader,inspect,get busy(){return busy},lastAudit:null,lastBlock:null};
})();