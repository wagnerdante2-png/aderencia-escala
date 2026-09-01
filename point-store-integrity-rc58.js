(function(){
'use strict';
if(window.__ADERENCIA_POINT_STORE_INTEGRITY_RC58__||!window.pdfjsLib)return;
window.__ADERENCIA_POINT_STORE_INTEGRITY_RC58__=true;
const input=document.getElementById('pointFile');
if(!input)return;
const VERSION='RC58.2';
let bypass=false;
function status(text,ok=false){const e=document.getElementById('pointStatus');if(!e)return;e.textContent=text;e.classList.remove('muted','ok','error');e.classList.add(ok?'ok':'error')}
function storeCode(n){return `ML${String(+n).padStart(2,'0')}`}
function detectPointStore(line){
 if(!/(DEPARTAMENTO|LOTA[CÇ][AÃ]O)/i.test(line))return null;
 const m=String(line).match(/(?:DEPARTAMENTO|LOTA[CÇ][AÃ]O)\s*:?.*?\b(?:LOJA|LIDERANCA)?\s*ML\s*0*(\d{1,3})\b/i)||String(line).match(/(?:DEPARTAMENTO|LOTA[CÇ][AÃ]O)\s*:?.*?\bML\s*0*(\d{1,3})\b/i);
 return m?storeCode(m[1]):null;
}
function detectPointPeriod(line){
 const m=String(line).match(/Espelho\s+do\s+Ponto\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
 return m?`${m[1]} - ${m[2]}`:null;
}
function makeRows(items,tol=2.5){
 const rows=[];
 for(const it of items.slice().sort((a,b)=>b.y-a.y||a.x-b.x)){
   let r=rows.find(x=>Math.abs(x.y-it.y)<tol);
   if(!r){r={y:it.y,items:[]};rows.push(r)}
   r.items.push(it);
 }
 for(const r of rows){r.items.sort((a,b)=>a.x-b.x);r.text=r.items.map(x=>x.text).join(' ')}
 rows.sort((a,b)=>b.y-a.y);
 return rows;
}
async function scan(file){
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false}).promise;
 const observations=[],periodObservations=[];
 for(let p=1;p<=pdf.numPages;p++){
   const tc=await(await pdf.getPage(p)).getTextContent();
   const items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5]}));
   for(const row of makeRows(items)){
     const store=detectPointStore(row.text);
     if(store)observations.push({page:p,store,text:row.text});
     const period=detectPointPeriod(row.text);
     if(period)periodObservations.push({page:p,period,text:row.text});
   }
 }
 return {
   stores:[...new Set(observations.map(x=>x.store))],
   periods:[...new Set(periodObservations.map(x=>x.period))],
   observations,
   periodObservations
 };
}
function clearStaleEngineState(){
 input.value='';
 window.ADERENCIA_POINT_CONTEXT={store:null,start:null,end:null};
 bypass=true;
 try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{bypass=false}
}
async function inspect(file){
 try{
   const result=await scan(file);
   const mixedStores=result.stores.length>1,mixedPeriods=result.periods.length>1,blocked=mixedStores||mixedPeriods;
   const last={source:file.name,stores:result.stores,periods:result.periods,observations:result.observations,periodObservations:result.periodObservations,blocked,reason:mixedStores?'stores':mixedPeriods?'periods':null,at:new Date().toISOString()};
   window.ADERENCIA_POINT_STORE_INTEGRITY.last=last;
   if(blocked){
     clearStaleEngineState();
     if(mixedStores)status(`Erro: espelho mistura lojas em Departamento/Lotação (${result.stores.join(' × ')}). Use um espelho de uma única loja.`,false);
     else status(`Erro: espelho contém períodos diferentes (${result.periods.join(' × ')}). Use um espelho de um único período.`,false);
     return;
   }
   bypass=true;
   try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{bypass=false}
 }catch(error){
   window.ADERENCIA_POINT_STORE_INTEGRITY.last={source:file?.name||'',stores:[],periods:[],blocked:false,scanError:String(error?.message||error),at:new Date().toISOString()};
   bypass=true;
   try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{bypass=false}
 }
}
document.addEventListener('change',e=>{
 if(e.target!==input||bypass)return;
 const file=input.files?.[0];
 if(!file||!file.name.toLowerCase().endsWith('.pdf'))return;
 e.stopImmediatePropagation();e.preventDefault();
 status('Validando integridade do espelho...',false);
 inspect(file);
},true);
window.ADERENCIA_POINT_STORE_INTEGRITY={version:VERSION,scan,detectPointStore,detectPointPeriod,last:null};
})();
