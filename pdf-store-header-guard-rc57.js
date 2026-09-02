(function(){
'use strict';
if(window.__ADERENCIA_PDF_STORE_HEADER_GUARD_RC57__||!window.pdfjsLib)return;
window.__ADERENCIA_PDF_STORE_HEADER_GUARD_RC57__=true;
const input=document.getElementById('scheduleFile'),statusEl=document.getElementById('scheduleStatus'),nameEl=document.getElementById('scheduleFileName');
if(!input)return;
const ml=v=>`ML${String(+v).padStart(2,'0')}`;
const stores=(text,re)=>[...new Set([...String(text||'').matchAll(re)].map(m=>ml(m[1])))];
const key=file=>file?`${file.name}|${file.size}|${file.lastModified}`:'';
function resolveHeaderStore(text){
 const byMl=stores(text,/\bML\s*0*(\d{1,3})\b/gi);
 if(byMl.length>1)throw new Error(`RC57: cabeçalho PDF ambíguo (${byMl.join(', ')}).`);
 if(byMl.length===1)return byMl[0];
 const byLoja=stores(text,/\bLOJA\s*(?:ML\s*)?0*(\d{1,3})\b/gi);
 if(byLoja.length>1)throw new Error(`RC57: cabeçalho PDF ambíguo (${byLoja.join(', ')}).`);
 return byLoja[0]||null;
}
function validateHeader(text,expectedStore){
 if(!expectedStore)throw new Error('RC57: loja validada do espelho indisponível.');
 const store=resolveHeaderStore(text);
 if(!store)throw new Error('RC57: loja não reconhecida no cabeçalho do PDF.');
 if(store!==expectedStore)throw new Error(`RC57: loja do cabeçalho (${store}) diverge do espelho (${expectedStore}).`);
 return store;
}
function topHeader(items,maxRows=14){
 const rs=[];
 for(const it of items.filter(i=>i.str&&String(i.str).trim()).map(i=>({text:String(i.str).trim(),x:i.transform?.[4]||0,y:i.transform?.[5]||0})).sort((a,b)=>b.y-a.y||a.x-b.x)){
  let r=rs.find(x=>Math.abs(x.y-it.y)<=3.2);if(!r){r={y:it.y,items:[]};rs.push(r)}r.items.push(it);
 }
 return rs.slice(0,maxRows).map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')).join('\n');
}
async function ocrHeader(page){
 if(!window.ADERENCIA_ENSURE_OCR)throw new Error('RC57: OCR sob demanda indisponível.');
 if(statusEl){statusEl.textContent='RC57: cabeçalho sem texto suficiente; validando loja por OCR...';statusEl.className='status error'}
 const T=await window.ADERENCIA_ENSURE_OCR();
 if(!T?.recognize)throw new Error('RC57: OCR não pôde ser inicializado.');
 const scale=2.25,vp=page.getViewport({scale}),full=document.createElement('canvas');
 full.width=Math.ceil(vp.width);full.height=Math.ceil(vp.height);
 await page.render({canvasContext:full.getContext('2d'),viewport:vp}).promise;
 const crop=document.createElement('canvas');crop.width=full.width;crop.height=Math.max(1,Math.floor(full.height*.38));
 crop.getContext('2d').drawImage(full,0,0,crop.width,crop.height,0,0,crop.width,crop.height);
 const r=await T.recognize(crop,'por+eng');
 return String(r?.data?.text||'').trim();
}
async function inspect(file){
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false}).promise;
 if(!pdf.numPages)throw new Error('RC57: PDF sem páginas legíveis.');
 const page=await pdf.getPage(1),tc=await page.getTextContent();
 let header=topHeader(tc.items),source='text',store=resolveHeaderStore(header);
 if(!store){header=await ocrHeader(page);source='ocr';store=resolveHeaderStore(header)}
 return{store,header,source,textItemCount:tc.items.filter(i=>i.str&&String(i.str).trim()).length};
}
function pointStore(){
 const h=window.ADERENCIA_SCHEDULE_HARDENING,c=h?.pointContext?.();
 return c?.store||window.ADERENCIA_POINT_CONTEXT?.store||null;
}
let busy=false,passing=false;
function invalidateCore(file){
 const empty=new DataTransfer();input.files=empty.files;
 passing=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{passing=false}
 const restore=new DataTransfer();if(file)restore.items.add(file);input.files=restore.files;
 if(nameEl)nameEl.textContent=file?.name||'Nenhum arquivo selecionado';
 document.getElementById('resultCard')?.classList.add('hidden');
 document.getElementById('calculateBtn')?.setAttribute('disabled','disabled');
}
function block(error,file){
 const detail=String(error?.message||error||'cabeçalho não confirmado');
 if(statusEl){statusEl.textContent=detail;statusEl.className='status error'}
 if(nameEl&&file)nameEl.textContent=file.name;
 document.getElementById('calculateBtn')?.setAttribute('disabled','disabled');
 api.lastBlock={file:file?.name||null,key:key(file),detail,at:new Date().toISOString()};
}
window.addEventListener('change',ev=>{
 if(ev.target!==input||passing||busy)return;
 const file=input.files?.[0];if(!file||!file.name.toLowerCase().endsWith('.pdf'))return;
 ev.preventDefault();ev.stopImmediatePropagation();busy=true;invalidateCore(file);
 Promise.resolve().then(async()=>{
  const expected=pointStore(),result=await inspect(file),store=validateHeader(result.header,expected);
  api.lastAudit={file:file.name,key:key(file),store,expectedStore:expected,source:result.source,textItemCount:result.textItemCount,at:new Date().toISOString()};
  passing=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{passing=false}
 }).catch(error=>{console.warn('RC57: PDF bloqueado por identidade de loja.',error);block(error,file)}).finally(()=>{busy=false});
},true);
const api={version:'RC57.1',legacyVersion:'RC56.1',resolveHeaderStore,validateHeader,topHeader,ocrHeader,inspect,key,headerSourceFor(file){return api.lastAudit?.key===key(file)?api.lastAudit.source:null},get busy(){return busy},lastAudit:null,lastBlock:null};
window.ADERENCIA_PDF_STORE_GUARD_RC57=api;
window.ADERENCIA_PDF_STORE_GUARD_RC56=api;
})();