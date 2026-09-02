(function(){
'use strict';
if(window.__ADERENCIA_RUNTIME_CACHE_RC47__)return;
window.__ADERENCIA_RUNTIME_CACHE_RC47__=true;
const stats={fileHits:0,fileMisses:0,pdfHits:0,pdfMisses:0,xlsxHits:0,xlsxMisses:0,startedAt:new Date().toISOString()};
let fileBuffers=new WeakMap();
if(window.File?.prototype?.arrayBuffer){
  const original=File.prototype.arrayBuffer;
  File.prototype.arrayBuffer=function(){
    let master=fileBuffers.get(this);
    if(master){stats.fileHits++}
    else{
      stats.fileMisses++;
      master=Promise.resolve(original.call(this)).then(buffer=>{
        if(!(buffer instanceof ArrayBuffer))throw new TypeError('RC60: File.arrayBuffer não retornou ArrayBuffer.');
        /*
         * PDF.js transfere o ArrayBuffer recebido para o worker e, por padrão,
         * destaca (detaches) o buffer no contexto chamador. Portanto o cache
         * nunca pode devolver a mesma instância de ArrayBuffer duas vezes.
         * Mantemos uma cópia-mestre privada que jamais é exposta e entregamos
         * uma nova cópia independente em cada leitura.
         */
        return new Uint8Array(buffer).slice();
      }).catch(err=>{fileBuffers.delete(this);throw err});
      fileBuffers.set(this,master);
    }
    return master.then(bytes=>bytes.slice().buffer);
  };
}
/*
 * RC50: o cache de documentos PDF foi movido para a camada de segurança
 * (pdf-security-rc35.js). pdfjsLib é um namespace exportado pelo bundle do
 * PDF.js e seu getDocument pode ser não-gravável; sobrescrevê-lo diretamente
 * interrompia a inicialização do módulo antes da publicação desta API.
 */
let xlsxCache=new WeakMap();
function xlsxOptionsKey(opts){
  if(opts==null)return '{}';
  if(typeof opts!=='object')return null;
  const normalized={};
  for(const key of Object.keys(opts).sort()){
    const value=opts[key];
    if(value===undefined){normalized[key]='__undefined__';continue}
    if(value===null||typeof value==='string'||typeof value==='boolean'){normalized[key]=value;continue}
    if(typeof value==='number'){
      if(!Number.isFinite(value))return null;
      normalized[key]=value;
      continue;
    }
    return null;
  }
  try{return JSON.stringify(normalized)}catch{return null}
}
if(window.XLSX?.read){
  const original=XLSX.read.bind(XLSX);
  XLSX.read=function(data,opts){
    try{
      /*
       * Preserve a identidade da entrada exata, não apenas do ArrayBuffer
       * subjacente. Duas TypedArray views distintas podem compartilhar o mesmo
       * buffer com byteOffset/byteLength diferentes e representar planilhas
       * diferentes; usar data.buffer faria essas entradas colidirem no cache.
       */
      const inputKey=(data instanceof ArrayBuffer||ArrayBuffer.isView(data))?data:null;
      const optionKey=xlsxOptionsKey(opts);
      if(inputKey&&optionKey!==null){
        let byOptions=xlsxCache.get(inputKey);
        if(!byOptions){byOptions=new Map();xlsxCache.set(inputKey,byOptions)}
        if(byOptions.has(optionKey)){stats.xlsxHits++;return byOptions.get(optionKey)}
        stats.xlsxMisses++;
        const wb=original(data,opts);
        byOptions.set(optionKey,wb);
        return wb;
      }
    }catch(e){console.warn('RC47 XLSX cache bypass:',e)}
    return original(data,opts);
  };
}
function notePdf(hit){if(hit)stats.pdfHits++;else stats.pdfMisses++}
function clear(){
  fileBuffers=new WeakMap();
  xlsxCache=new WeakMap();
  window.ADERENCIA_PDF_CACHE_CLEAR?.();
  stats.clearedAt=new Date().toISOString();
}
window.ADERENCIA_RUNTIME_CACHE={version:'RC50',bufferSafetyVersion:'RC60.1',bufferMode:'copy-on-read',stats,clear,notePdf};
})();