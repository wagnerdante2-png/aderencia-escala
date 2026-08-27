(function(){
'use strict';
/*
 * RC50 — hardening defensivo do PDF.js sem alterar diretamente propriedades
 * do namespace exportado pelo bundle. Alguns builds expõem getDocument como
 * accessor não gravável; a atribuição direta encerrava silenciosamente os
 * módulos de segurança/cache durante o startup.
 */
if(!window.pdfjsLib||typeof window.pdfjsLib.getDocument!=='function'||window.__ADERENCIA_PDF_HARDENED__)return;
window.__ADERENCIA_PDF_HARDENED__=true;
const originalLib=window.pdfjsLib;
const originalGet=originalLib.getDocument.bind(originalLib);
let cache=new WeakMap();
function normalize(src){
 const hardened={isEvalSupported:false,enableScripting:false};
 if(src instanceof ArrayBuffer||ArrayBuffer.isView(src))return Object.assign({data:src},hardened);
 if(typeof src==='string'||src instanceof URL)return Object.assign({url:String(src)},hardened);
 if(src&&typeof src==='object')return Object.assign({},src,hardened);
 return src;
}
/*
 * A chave precisa preservar a identidade da entrada exata. Duas views podem
 * compartilhar o mesmo ArrayBuffer com byteOffset/byteLength diferentes; usar
 * apenas data.buffer faria documentos distintos colidirem no cache.
 *
 * Objetos com opções adicionais (por exemplo password/rangeChunkSize) não
 * podem compartilhar apenas a identidade de data, pois isso reaproveitaria uma
 * task criada com configuração diferente. Nesses casos o cache é ignorado.
 */
function getCacheKey(src){
 if(!src||typeof src!=='object')return null;
 const allowed=new Set(['data','isEvalSupported','enableScripting']);
 if(Object.keys(src).some(key=>!allowed.has(key)))return null;
 const data=src.data;
 return (data instanceof ArrayBuffer||ArrayBuffer.isView(data))?data:null;
}
function secureGetDocument(src){
 const safe=normalize(src),key=getCacheKey(safe);
 if(key){
   const found=cache.get(key);
   if(found){window.ADERENCIA_RUNTIME_CACHE?.notePdf?.(true);return found}
   window.ADERENCIA_RUNTIME_CACHE?.notePdf?.(false);
   const task=originalGet(safe);
   cache.set(key,task);
   task.promise?.catch?.(()=>cache.delete(key));
   return task;
 }
 return originalGet(safe);
}
let facade;
try{
 facade=Object.create(originalLib);
 Object.defineProperty(facade,'getDocument',{value:secureGetDocument,writable:false,configurable:false,enumerable:true});
 window.pdfjsLib=facade;
}catch(err){
 window.__ADERENCIA_PDF_HARDENED__=false;
 console.error('RC50: não foi possível instalar a fachada segura do PDF.js',err);
 return;
}
window.ADERENCIA_PDF_OPEN=secureGetDocument;
window.ADERENCIA_PDF_CACHE_CLEAR=function(){cache=new WeakMap();};
window.ADERENCIA_PDF_SECURITY={version:'RC50',isEvalSupported:false,enableScripting:false,active:true,mode:'namespace-facade'};
})();