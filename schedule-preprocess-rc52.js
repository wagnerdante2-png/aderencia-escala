(function(){
'use strict';
if(window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__)return;
window.__ADERENCIA_SCHEDULE_PREPROCESS_RC52__=true;
const input=document.getElementById('scheduleFile'),status=document.getElementById('scheduleStatus');
if(!input)return;
const VERSION='RC52.5',PROJECTION_VERSION='RC58.4',DYNAMIC_VERSION='RC58.6';
let busy=false,passing=false;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function excel(file){
 if(!file||!/\.(xlsx|xlsm|xls)$/i.test(file.name||''))return false;
 const n=file.name||'';
 if(/^RC57_/i.test(n)||/^RC52_/i.test(n)||/^RC58_PROJECTED_/i.test(n))return false;
 if(/^RC51_PDF_GRID_RC56_/i.test(n)||/^PDF_GRID_RC57_/i.test(n))return true;
 if(/^RC51_/i.test(n))return false;
 return true;
}
function setFiles(file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files}
function context(){const h=window.ADERENCIA_SCHEDULE_HARDENING,c=h?.pointContext?.();return h?.normalizeExcel&&c?.store&&c?.start&&c?.end?{h,c}:null}
function pass(file){setFiles(file);passing=true;try{input.dispatchEvent(new Event('change',{bubbles:true}))}finally{passing=false}}
function sheetSize(ws){
 try{const r=XLSX.utils.decode_range(ws?.['!ref']||'A1');return{rows:r.e.r-r.s.r+1,cols:r.e.c-r.s.c+1,cells:(r.e.r-r.s.r+1)*(r.e.c-r.s.c+1)}}catch{return{rows:0,cols:0,cells:0}}
}
function boundedRows(ws,maxRows=420,maxCols=520,raw=true){
 const s=sheetSize(ws);if(!s.rows||!s.cols)return[];
 const e={r:Math.max(0,Math.min(s.rows,maxRows)-1),c:Math.max(0,Math.min(s.cols,maxCols)-1)};
 return XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw,range:{s:{r:0,c:0},e}});
}
function looksRelevant(ws,name){
 const n=norm(name);
 if(/(?:ESCALA|ANDAR NO TEMPO|CONFIGUR|TURNO|FOLGA|GRADE)/.test(n))return true;
 const rows=boundedRows(ws,80,140,false);let hasName=false,hasCargo=false,hasCalendar=false,hasTurn=false,hasTimes=false;
 for(const row of rows){let dayLike=0;for(const v of row){const x=norm(v);if(/^(?:NOME|NOME DO COLABORADOR|COLABORADOR|FUNCIONARIO)$/.test(x))hasName=true;if(/^(?:CARGO|FUNCAO)$/.test(x))hasCargo=true;if(/^T\s*\d{1,2}$/.test(x))hasTurn=true;if(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/.test(String(v??'')))hasTimes=true;if(v instanceof Date||/^\d{1,2}[\/-]\d{1,2}[\/-]20\d{2}$/.test(String(v??'').trim())||(/^\d{1,2}$/.test(String(v??'').trim())&&+v>=1&&+v<=31))dayLike++}if(dayLike>=7)hasCalendar=true}
 return(hasName&&hasCargo&&hasCalendar)||(hasTurn&&hasTimes);
}
function projectionLimit(name){const n=norm(name);return /CONFIGUR|TURNO|LEGENDA/.test(n)?{rows:760,cols:280}:{rows:460,cols:540}}
function sheetByName(wb,name){const target=norm(name),actual=wb.SheetNames.find(n=>norm(n)===target);return actual?{name:actual,ws:wb.Sheets[actual]}:null}
function storeCode(v){
 if(typeof v==='number'&&Number.isFinite(v)&&v>=1&&v<=999)return`ML${String(Math.trunc(v)).padStart(2,'0')}`;
 const s=String(v??'').trim();let m=s.match(/\bML\s*0*(\d{1,3})\b/i);if(!m&&/^\s*\d{1,3}\s*$/.test(s))m=[s,s.trim()];
 return m?`ML${String(+m[1]).padStart(2,'0')}`:null;
}
function isoCellDate(v){
 if(v instanceof Date&&!isNaN(v))return`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
 if(typeof v==='number'&&v>30000){const x=XLSX.SSF.parse_date_code(v);if(x?.y&&x?.m&&x?.d)return`${x.y}-${String(x.m).padStart(2,'0')}-${String(x.d).padStart(2,'0')}`}
 const s=String(v??'').trim();let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})$/);if(m)return`${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
 m=s.match(/^(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})$/);return m?`${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`:null;
}
function dynamicWorkbookInfo(wb){
 const monthly=sheetByName(wb,'Escala Mensal'),consolidated=sheetByName(wb,'Consolidado'),timeline=sheetByName(wb,'Andar no Tempo');
 if(!monthly||!consolidated||!timeline)return null;
 const signals=[
   {source:`${consolidated.name}!B1`,store:storeCode(consolidated.ws?.B1?.v)},
   {source:`${monthly.name}!B1`,store:storeCode(monthly.ws?.B1?.v)},
   {source:`${timeline.name}!A6`,store:storeCode(timeline.ws?.A6?.v)}
 ].filter(x=>x.store);
 const stores=[...new Set(signals.map(x=>x.store))];
 const rows=boundedRows(monthly.ws,24,140,true);let best=[];
 for(const row of rows){const dates=[...new Set((row||[]).map(isoCellDate).filter(Boolean))].sort();if(dates.length>best.length)best=dates}
 const coverage=best.length>=7?{start:best[0],end:best.at(-1),dates:best.length}:null;
 return{dynamic:true,store:stores.length===1?stores[0]:null,stores,signals,coverage,monthlySheet:monthly.name,consolidatedSheet:consolidated.name,timelineSheet:timeline.name};
}
function dynamicFatal(code,message,info,ctx,source){
 const e=new Error(message);e.name='AderenciaDynamicWorkbookCompatibilityError';e.code=code;e.aderenciaFatal=true;e.dynamicWorkbook=true;e.details={version:DYNAMIC_VERSION,source:source||'',info,context:ctx};return e;
}
function assertDynamicWorkbookCompatible(wb,ctx,source=''){
 const info=dynamicWorkbookInfo(wb);if(!info||!ctx)return info;
 if(info.stores.length>1)throw dynamicFatal('ADERENCIA_DYNAMIC_WORKBOOK_CACHE_AMBIGUOUS',`RC58: o XLSM dinâmico possui cache de lojas divergentes (${info.stores.join(', ')}). O navegador não recalcula este modelo com segurança; salve/recalcule o arquivo no Excel para uma única loja antes da análise.`,info,ctx,source);
 if(!info.store)throw dynamicFatal('ADERENCIA_DYNAMIC_WORKBOOK_CACHE_UNVERIFIED','RC58: este XLSM é um modelo dinâmico, mas a loja materializada no cache não pôde ser confirmada. O cálculo foi bloqueado para não misturar lojas.',info,ctx,source);
 if(info.store!==ctx.store)throw dynamicFatal('ADERENCIA_DYNAMIC_WORKBOOK_STORE_MISMATCH',`RC58: este XLSM está salvo/calculado para ${info.store}, mas o espelho é ${ctx.store}. O navegador não recalcula as fórmulas do modelo para outra loja; use a escala materializada de ${ctx.store}.`,info,ctx,source);
 if(!info.coverage){info.compatibility={proportional:null,periodVerified:false,overlapStart:null,overlapEnd:null};return info}
 const overlapStart=ctx.start>info.coverage.start?ctx.start:info.coverage.start,overlapEnd=ctx.end<info.coverage.end?ctx.end:info.coverage.end;
 if(overlapStart>overlapEnd)throw dynamicFatal('ADERENCIA_DYNAMIC_WORKBOOK_NO_PERIOD_OVERLAP',`RC58: a escala de ${info.store} cobre ${info.coverage.start} a ${info.coverage.end}, mas o espelho cobre ${ctx.start} a ${ctx.end}; não existe nenhum dia em comum para cálculo proporcional.`,info,ctx,source);
 info.compatibility={periodVerified:true,proportional:ctx.start<info.coverage.start||ctx.end>info.coverage.end,overlapStart,overlapEnd,sourceStart:info.coverage.start,sourceEnd:info.coverage.end,pointStart:ctx.start,pointEnd:ctx.end};
 return info;
}
async function projectLargeWorkbook(file,ctx=null){
 const buffer=await file.arrayBuffer(),wb=XLSX.read(buffer,{type:'array',cellDates:true,cellFormula:true}),dynamic=assertDynamicWorkbookCompatible(wb,ctx,file.name),metrics=wb.SheetNames.map(name=>({name,ws:wb.Sheets[name],...sheetSize(wb.Sheets[name])}));
 const huge=metrics.some(x=>x.rows>5000||x.cols>900||x.cells>750000)||metrics.reduce((n,x)=>n+Math.min(x.cells,1000000),0)>1800000;
 if(!huge)return{file,projected:false,dynamic,sourceSheets:wb.SheetNames.slice(),metrics:metrics.map(({name,rows,cols})=>({name,rows,cols}))};
 const chosen=metrics.filter(x=>looksRelevant(x.ws,x.name));
 if(!chosen.length){const e=new Error('RC58: arquivo muito grande e nenhuma aba operacional de escala foi identificada com segurança.');e.code='ADERENCIA_LARGE_WORKBOOK_NO_SCHEDULE';throw e}
 const out=XLSX.utils.book_new(),kept=[];
 for(const x of chosen){const lim=projectionLimit(x.name),rows=boundedRows(x.ws,lim.rows,lim.cols,true);if(!rows.length)continue;XLSX.utils.book_append_sheet(out,XLSX.utils.aoa_to_sheet(rows),x.name.slice(0,31));kept.push({name:x.name,rows:Math.min(x.rows,lim.rows),cols:Math.min(x.cols,lim.cols)})}
 if(!kept.length)throw new Error('RC58: projeção operacional vazia após filtrar abas não relacionadas à escala.');
 const projected=new File([XLSX.write(out,{bookType:'xlsx',type:'array'})],`RC58_PROJECTED_${file.name.replace(/\.(?:xlsx|xlsm|xls)$/i,'.xlsx')}`,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 return{file:projected,projected:true,dynamic,sourceSheets:wb.SheetNames.slice(),selectedSheets:kept,excludedSheets:metrics.filter(x=>!kept.some(k=>k.name===x.name)).map(x=>x.name),metrics:metrics.map(({name,rows,cols})=>({name,rows,cols}))};
}
window.addEventListener('change',ev=>{
 if(ev.target!==input||passing||busy)return;
 const file=input.files?.[0];if(!file||!excel(file))return;
 const x=context();if(!x){window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'bypass',reason:'no-validated-point-context',source:file.name,at:new Date().toISOString()};return}
 ev.preventDefault();ev.stopImmediatePropagation();busy=true;
 const {h,c:ctx}=x;
 if(status){status.textContent='RC58: validando loja e preparando abas operacionais da escala...';status.className='status error'}
 let prepared=file,projection=null;
 Promise.resolve(projectLargeWorkbook(file,ctx)).then(p=>{
   projection=p;prepared=p.file;
   window.ADERENCIA_SCHEDULE_PREPROCESS.lastProjection={version:PROJECTION_VERSION,dynamicVersion:DYNAMIC_VERSION,source:file.name,projected:p.projected,target:prepared.name,dynamic:p.dynamic||null,selectedSheets:p.selectedSheets||null,excludedSheets:p.excludedSheets||null,metrics:p.metrics,at:new Date().toISOString()};
   if(status){const proportional=p.dynamic?.compatibility?.proportional===true;status.textContent=proportional?`RC58: escala parcial válida (${p.dynamic.compatibility.overlapStart} a ${p.dynamic.compatibility.overlapEnd}); aplicando proporcionalidade...`:(p.projected?'RC58: abas operacionais isoladas; conciliando escala...':'RC58: conciliando escala com colaboradores e dias reconhecidos no espelho...');status.className='status error'}
   return h.normalizeExcel(prepared,ctx);
 }).then(normalized=>{
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'normalized',source:file.name,prepared:prepared.name,target:normalized.name,projected:!!projection?.projected,dynamic:projection?.dynamic||null,store:ctx.store,start:ctx.start,end:ctx.end,at:new Date().toISOString()};
   pass(normalized);
 }).catch(error=>{
   if(error?.aderenciaFatal){
     console.error('RC58: pré-normalização bloqueada por incompatibilidade fatal.',error);
     window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'fatal-block',source:file.name,prepared:prepared?.name||file.name,store:ctx.store,start:ctx.start,end:ctx.end,code:error.code||'ADERENCIA_FATAL_SCHEDULE_ERROR',error:String(error?.message||error),details:error?.details||null,at:new Date().toISOString()};
     if(status){status.textContent=String(error?.message||error);status.className='status error'}try{input.value=''}catch{}return;
   }
   console.warn('RC52/RC58: pré-normalização não aplicada; usando parser principal com a fonte operacional reduzida.',error);
   window.ADERENCIA_SCHEDULE_PREPROCESS.last={mode:'core-fallback',source:file.name,prepared:prepared?.name||file.name,projected:!!projection?.projected,store:ctx.store,start:ctx.start,end:ctx.end,error:String(error?.message||error),at:new Date().toISOString()};
   pass(prepared||file);
 }).finally(()=>{busy=false});
},true);
window.ADERENCIA_SCHEDULE_PREPROCESS={version:VERSION,projectionVersion:PROJECTION_VERSION,dynamicVersion:DYNAMIC_VERSION,projectLargeWorkbook,dynamicWorkbookInfo,assertDynamicWorkbookCompatible,boundedRows,sheetSize,looksRelevant,get busy(){return busy},get passing(){return passing},last:null,lastProjection:null};
})();
