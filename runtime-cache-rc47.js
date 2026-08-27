(function(){
'use strict';
if(window.__ADERENCIA_RUNTIME_CACHE_RC47__)return;
window.__ADERENCIA_RUNTIME_CACHE_RC47__=true;
const stats={fileHits:0,fileMisses:0,pdfHits:0,pdfMisses:0,xlsxHits:0,xlsxMisses:0,startedAt:new Date().toISOString()};
const fileBuffers=new WeakMap();
if(window.File?.prototype?.arrayBuffer){
  const original=File.prototype.arrayBuffer;
  File.prototype.arrayBuffer=function(){
    let p=fileBuffers.get(this);
    if(p){stats.fileHits++;return p}
    stats.fileMisses++;
    p=Promise.resolve(original.call(this)).catch(err=>{fileBuffers.delete(this);throw err});
    fileBuffers.set(this,p);
    return p;
  };
}
/*
 * RC50: o cache de documentos PDF foi movido para a camada de segurança
 * (pdf-security-rc35.js). pdfjsLib é um namespace exportado pelo bundle do
 * PDF.js e seu getDocument pode ser não-gravável; sobrescrevê-lo diretamente
 * interrompia a inicialização do módulo antes da publicação desta API.
 */
const xlsxCache=new WeakMap();
if(window.XLSX?.read){
  const original=XLSX.read.bind(XLSX);
  XLSX.read=function(data,opts){
    try{
      const buffer=data instanceof ArrayBuffer?data:(ArrayBuffer.isView(data)?data.buffer:null);
      if(buffer){
        let byOptions=xlsxCache.get(buffer);
        if(!byOptions){byOptions=new Map();xlsxCache.set(buffer,byOptions)}
        const key=JSON.stringify({type:opts?.type||'',cellDates:!!opts?.cellDates,cellFormula:opts?.cellFormula!==false,dense:!!opts?.dense,raw:opts?.raw});
        if(byOptions.has(key)){stats.xlsxHits++;return byOptions.get(key)}
        stats.xlsxMisses++;
        const wb=original(data,opts);
        byOptions.set(key,wb);
        return wb;
      }
    }catch(e){console.warn('RC47 XLSX cache bypass:',e)}
    return original(data,opts);
  };
}
function notePdf(hit){if(hit)stats.pdfHits++;else stats.pdfMisses++}
function clear(){stats.clearedAt=new Date().toISOString();}
window.ADERENCIA_RUNTIME_CACHE={version:'RC50',stats,clear,notePdf};
})();