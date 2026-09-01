(function(){
'use strict';
if(window.__ADERENCIA_POINT_STORE_INTEGRITY_RC58__||!window.pdfjsLib)return;
window.__ADERENCIA_POINT_STORE_INTEGRITY_RC58__=true;
const input=document.getElementById('pointFile');
if(!input)return;
const VERSION='RC58.4';
let bypass=false;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function registrationKey(v){const n=norm(v).replace(/\s+/g,'');return /^\d+$/.test(n)?n.replace(/^0+(?=\d)/,''):n}
function status(text,ok=false){const e=document.getElementById('pointStatus');if(!e)return;e.textContent=text;e.classList.remove('muted','ok','error');e.classList.add(ok?'ok':'error')}
function storeCode(n){return `ML${String(+n).padStart(2,'0')}`}
function parseBrDate(value){
 const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return null;
 const d=+m[1],mo=+m[2],y=+m[3],dt=new Date(Date.UTC(y,mo-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;
 return {raw:m[0],iso:`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`};
}
function detectPointStore(line){
 if(!/(DEPARTAMENTO|LOTA[CÇ][AÃ]O)/i.test(line))return null;
 const m=String(line).match(/(?:DEPARTAMENTO|LOTA[CÇ][AÃ]O)\s*:?.*?\b(?:LOJA|LIDERANCA)?\s*ML\s*0*(\d{1,3})\b/i)||String(line).match(/(?:DEPARTAMENTO|LOTA[CÇ][AÃ]O)\s*:?.*?\bML\s*0*(\d{1,3})\b/i);
 return m?storeCode(m[1]):null;
}
function detectPointPeriodInfo(line){
 const m=String(line).match(/Espelho\s+do\s+Ponto\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);if(!m)return null;
 const period=`${m[1]} - ${m[2]}`,start=parseBrDate(m[1]),end=parseBrDate(m[2]);
 if(!start||!end)return {period,start:start?.iso||null,end:end?.iso||null,valid:false,reason:'invalid-date'};
 if(start.iso>end.iso)return {period,start:start.iso,end:end.iso,valid:false,reason:'reversed'};
 return {period,start:start.iso,end:end.iso,valid:true,reason:null};
}
function detectPointPeriod(line){return detectPointPeriodInfo(line)?.period||null}
function detectPointIdentity(line){
 if(!/Matr[ií]cula\s*:/i.test(line)||!/Nome\s*:/i.test(line))return null;
 const name=(String(line).match(/Nome\s*:\s*(.*?)(?=\s+(?:Chapa|Admiss[aã]o)\s*:|$)/i)||[])[1];
 const registration=(String(line).match(/Matr[ií]cula\s*:\s*(.*?)(?=\s+Nome\s*:|$)/i)||[])[1]||'';
 if(!name)return null;
 return {name:name.trim(),key:norm(name),registration:registrationKey(registration),registrationRaw:String(registration).trim()};
}
function pointMarks(line){return [...String(line).matchAll(/\b([0-2]\d:[0-5]\d)\s*(?:O|I|P)\b/g)].map(m=>m[1])}
function sameMarks(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}
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
 const observations=[],periodObservations=[],identityObservations=[],duplicateDays=[],dayConflicts=[],dayDateErrors=[];
 const registrationsByName=new Map(),namesByRegistration=new Map(),identityConflicts=[],registrationConflicts=[],dayLedger=new Map();
 let cur=null,daily=false;
 for(let p=1;p<=pdf.numPages;p++){
   const tc=await(await pdf.getPage(p)).getTextContent();
   const items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5]}));
   for(const row of makeRows(items)){
     const line=row.text,store=detectPointStore(line),periodInfo=detectPointPeriodInfo(line);
     if(store)observations.push({page:p,store,text:line});
     if(periodInfo)periodObservations.push({page:p,...periodInfo,text:line});
     const identity=detectPointIdentity(line);
     if(identity){
       cur=identity;daily=false;identityObservations.push({page:p,...identity,text:line});
       if(identity.registration){
         let regs=registrationsByName.get(identity.key);if(!regs){regs=new Map();registrationsByName.set(identity.key,regs)}
         if(!regs.has(identity.registration))regs.set(identity.registration,{page:p,name:identity.name,registration:identity.registration,registrationRaw:identity.registrationRaw});
         if(regs.size>1&&!identityConflicts.some(x=>x.key===identity.key))identityConflicts.push({kind:'name-to-registrations',key:identity.key,name:identity.name,registrations:[...regs.keys()],observations:[...regs.values()]});
         let names=namesByRegistration.get(identity.registration);if(!names){names=new Map();namesByRegistration.set(identity.registration,names)}
         if(!names.has(identity.key))names.set(identity.key,{page:p,name:identity.name,key:identity.key,registration:identity.registration});
         if(names.size>1&&!registrationConflicts.some(x=>x.registration===identity.registration))registrationConflicts.push({kind:'registration-to-names',registration:identity.registration,names:[...names.values()].map(x=>x.name),observations:[...names.values()]});
       }
       continue;
     }
     if(!cur)continue;
     if(/^Data\s+Dia\s+1a\s+E\./i.test(line)){daily=true;continue}
     if(/^Hor[aá]rios\b/i.test(line)||/^(?:C[oó]digo\s+Descri[cç][aã]o|Assinatura)/i.test(line)){daily=false;continue}
     if(!daily)continue;
     const dm=line.match(/^(\d{2}\/\d{2}\/\d{4})\b/);if(!dm)continue;
     const parsedDate=parseBrDate(dm[1]);
     if(!parsedDate){dayDateErrors.push({page:p,name:cur.name,registration:cur.registration,date:dm[1],text:line});continue}
     const date=parsedDate.raw,marks=pointMarks(line),id=`${cur.key}|${date}`,incoming={page:p,name:cur.name,registration:cur.registration,date,marks,text:line};
     const prior=dayLedger.get(id);
     if(!prior){dayLedger.set(id,incoming);continue}
     if(sameMarks(prior.marks,marks)){duplicateDays.push({kind:'identical',first:prior,incoming});continue}
     dayConflicts.push({kind:'marks',first:prior,incoming});
   }
 }
 const periodErrors=periodObservations.filter(x=>!x.valid);
 return {
   stores:[...new Set(observations.map(x=>x.store))],
   periods:[...new Set(periodObservations.map(x=>x.period))],
   observations,periodObservations,periodErrors,identityObservations,identityConflicts,registrationConflicts,duplicateDays,dayConflicts,dayDateErrors
 };
}
function clearStaleEngineState(){
 input.value='';
 window.ADERENCIA_POINT_CONTEXT={store:null,start:null,end:null};
 bypass=true;
 try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{bypass=false}
}
function marksText(marks){return marks.length?marks.join(', '):'sem batidas'}
async function inspect(file){
 try{
   const result=await scan(file);
   const mixedStores=result.stores.length>1,periodFormat=result.periodErrors.length>0,mixedPeriods=result.periods.length>1,ambiguousIdentity=result.identityConflicts.length>0||result.registrationConflicts.length>0,invalidDayDate=result.dayDateErrors.length>0,conflictingDay=result.dayConflicts.length>0;
   const blocked=mixedStores||periodFormat||mixedPeriods||ambiguousIdentity||invalidDayDate||conflictingDay;
   const reason=mixedStores?'stores':periodFormat?'period-format':mixedPeriods?'periods':ambiguousIdentity?'identities':invalidDayDate?'day-dates':conflictingDay?'days':null;
   const last={source:file.name,...result,blocked,reason,at:new Date().toISOString()};
   window.ADERENCIA_POINT_STORE_INTEGRITY.last=last;
   if(blocked){
     clearStaleEngineState();
     if(mixedStores)status(`Erro: espelho mistura lojas em Departamento/Lotação (${result.stores.join(' × ')}). Use um espelho de uma única loja.`,false);
     else if(periodFormat){const c=result.periodErrors[0];status(c.reason==='reversed'?`Erro: espelho contém intervalo de período invertido (${c.period}).`:`Erro: espelho contém data inválida no período (${c.period}).`,false)}
     else if(mixedPeriods)status(`Erro: espelho contém períodos diferentes (${result.periods.join(' × ')}). Use um espelho de um único período.`,false);
     else if(result.identityConflicts.length){const c=result.identityConflicts[0];status(`Erro: espelho contém o mesmo nome associado a matrículas diferentes (${c.name}: ${c.registrations.join(' × ')}).`,false)}
     else if(result.registrationConflicts.length){const c=result.registrationConflicts[0];status(`Erro: espelho contém a matrícula ${c.registration} associada a nomes diferentes (${c.names.join(' × ')}).`,false)}
     else if(invalidDayDate){const c=result.dayDateErrors[0];status(`Erro: espelho contém data diária inválida para ${c.name} (${c.date}).`,false)}
     else {const c=result.dayConflicts[0];status(`Erro: espelho contém marcações conflitantes para ${c.first.name} em ${c.first.date} (${marksText(c.first.marks)} × ${marksText(c.incoming.marks)}).`,false)}
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
window.ADERENCIA_POINT_STORE_INTEGRITY={version:VERSION,scan,detectPointStore,detectPointPeriod,detectPointPeriodInfo,detectPointIdentity,registrationKey,parseBrDate,last:null};
})();
