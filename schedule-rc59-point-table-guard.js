(function(){
'use strict';
if(window.__ADERENCIA_RC59_POINT_TABLE_GUARD__)return;
window.__ADERENCIA_RC59_POINT_TABLE_GUARD__=true;
const h=window.ADERENCIA_SCHEDULE_HARDENING,api=window.ADERENCIA_REAL_XLSM_RC59,compat=window.ADERENCIA_RC59_COMPAT_GUARD,legacy=window.ADERENCIA_PRE_RC59_NORMALIZE,pointInput=document.getElementById('pointFile');
if(!h?.normalizeExcel||!api?.hybrid||!compat?.isNewModel||!legacy||!window.pdfjsLib)return;
const regKey=api.regKey;
const hours=s=>[...String(s||'').matchAll(/\b([0-2]\d:[0-5]\d)\b/g)].map(m=>m[1]);
function plannedTimes(line){const s=String(line||''),mark=s.search(/\b\d+\s*-\s*ML\s*0*\d{1,3}\b/i);let q=[];if(mark>=0){const before=hours(s.slice(0,mark));if(before.length>=4)q=before.slice(-4);else{const after=hours(s.slice(mark));if(after.length>=8)q=after.slice(-4)}}if(q.length<4){const all=hours(s);if(all.length===4)q=all}return q.length===4?{start:q[0],end:q[3],times:q}:null}
function makeRows(items,tol=2.5){const rs=[];for(const it of items.slice().sort((a,b)=>b.y-a.y||a.x-b.x)){let r=rs.find(x=>Math.abs(x.y-it.y)<tol);if(!r){r={y:it.y,items:[]};rs.push(r)}r.items.push(it)}for(const r of rs){r.items.sort((a,b)=>a.x-b.x);r.text=r.items.map(x=>x.text).join(' ')}rs.sort((a,b)=>b.y-a.y);return rs}
function isoBr(s){const m=String(s||'').match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:null}
let cache=null;
async function pointSchedules(){const file=pointInput?.files?.[0];if(!file)throw new Error('RC59.4: espelho validado indisponível para recuperar o quadro Horários.');const key=`${file.name}|${file.size}|${file.lastModified}`;if(cache?.key===key)return cache.data;const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableScripting:false}).promise,data=new Map();for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),tc=await page.getTextContent(),items=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:i.transform[5]})),rs=makeRows(items);let reg='',name='';for(const r of rs){const line=r.text,hm=line.match(/Matr[ií]cula\s*:\s*(.*?)\s+Nome\s*:\s*(.*?)(?=\s+(?:Chapa|Admiss[aã]o)\s*:|$)/i);if(hm){reg=regKey(hm[1]);name=String(hm[2]||'').trim();if(reg&&!data.has(reg))data.set(reg,{registration:reg,name,changes:new Map()});continue}const dm=line.match(/^\s*(\d{2}\/\d{2}\/20\d{2})\b/);if(!dm||/\b[OIP]\b/.test(line)||!reg)continue;const pt=plannedTimes(line),date=isoBr(dm[1]);if(pt&&date)data.get(reg)?.changes.set(date,{start:pt.start,end:pt.end})}}
cache={key,data};return data}
const legacyNormalize=legacy;
h.normalizeExcel=async function(file,ctx){if(!(await compat.isNewModel(file)))return legacyNormalize(file,ctx);try{return await legacyNormalize(file,ctx)}catch(first){try{return await api.hybrid(file,ctx,await pointSchedules())}catch(e){e.aderenciaFatal=true;e.code=e.code||'ADERENCIA_RC59_REAL_XLSM';e.cause=e.cause||first;throw e}}};
window.ADERENCIA_RC59_POINT_TABLE_GUARD={version:'RC59.4',plannedTimes,pointSchedules};
})();