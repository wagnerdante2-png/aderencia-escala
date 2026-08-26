(function(){
'use strict';
/* RC34 — camada paralela de diagnóstico. Não altera parser, cálculo ou arquivo selecionado. */
const VERSION='RC34';
const CODE_RE=/^(?:T\s*\d{1,2}|F|FER|AF|AB|AL|FF|FC|NC|AE|D)$/i;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const isDate=v=>v instanceof Date&&!isNaN(v)||typeof v==='number'&&v>20000&&v<100000||/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(String(v||'').trim());
function inspectWorkbook(wb,fileName){
 const report={version:VERSION,file:fileName||'',ok:false,sheet:null,rows:0,dateColumns:0,employees:0,codeCells:0,coverage:0,warnings:[],checkedAt:new Date().toISOString()};
 const candidates=[];
 for(const name of wb.SheetNames||[]){
  const ws=wb.Sheets[name],data=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
  for(let r=0;r<Math.min(data.length,35);r++){
   const row=data[r]||[],dateCols=[];
   row.forEach((v,c)=>{if(isDate(v))dateCols.push(c)});
   if(dateCols.length>=20)candidates.push({name,data,header:r,dateCols});
  }
 }
 candidates.sort((a,b)=>b.dateCols.length-a.dateCols.length);
 const c=candidates[0];
 if(!c){report.warnings.push('Nenhuma grade com pelo menos 20 colunas de data foi encontrada.');return report}
 report.sheet=c.name;report.dateColumns=c.dateCols.length;report.rows=c.data.length;
 let expected=0,filled=0;
 for(let r=c.header+1;r<c.data.length;r++){
  const row=c.data[r]||[],vals=c.dateCols.map(i=>norm(row[i])).filter(v=>CODE_RE.test(v));
  if(vals.length<Math.max(8,Math.floor(c.dateCols.length*.35)))continue;
  report.employees++;report.codeCells+=vals.length;expected+=c.dateCols.length;filled+=vals.length;
 }
 report.coverage=expected?filled/expected:0;
 if(report.dateColumns<28)report.warnings.push(`Grade contém apenas ${report.dateColumns} colunas de data.`);
 if(report.employees<3)report.warnings.push(`Somente ${report.employees} colaboradores reconhecidos na matriz.`);
 if(report.coverage<.75)report.warnings.push(`Cobertura estrutural baixa (${Math.round(report.coverage*100)}%).`);
 report.ok=report.dateColumns>=20&&report.employees>=3&&report.coverage>=.65;
 return report;
}
async function inspectFile(file){
 if(!file||!/\.xlsx?$/i.test(file.name))return null;
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
 return inspectWorkbook(wb,file.name);
}
window.ADERENCIA_CANONICAL_VALIDATOR={version:VERSION,inspectWorkbook,inspectFile,getLast:()=>window.ADERENCIA_CANONICAL_LAST||null};
document.addEventListener('change',async e=>{
 const input=e.target;if(!input||input.id!=='scheduleFile')return;
 const file=input.files?.[0];if(!file||!/\.xlsx?$/i.test(file.name))return;
 try{
  const report=await inspectFile(file);window.ADERENCIA_CANONICAL_LAST=report;
  if(report&&!report.ok)console.warn('ADERENCIA RC34: validação estrutural em atenção',report);
  else if(report)console.info('ADERENCIA RC34: validação estrutural',report);
 }catch(err){window.ADERENCIA_CANONICAL_LAST={version:VERSION,file:file.name,ok:false,error:err.message,checkedAt:new Date().toISOString()};console.warn('ADERENCIA RC34: diagnóstico não concluído',err)}
},true);
})();