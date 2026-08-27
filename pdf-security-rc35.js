(function(){
'use strict';
/* RC50 — hardening defensivo do PDF.js. Mantém a API existente e força eval/scripting desabilitados. */
if(!window.pdfjsLib||typeof window.pdfjsLib.getDocument!=='function'||window.__ADERENCIA_PDF_HARDENED__)return;
window.__ADERENCIA_PDF_HARDENED__=true;
const original=window.pdfjsLib.getDocument.bind(window.pdfjsLib);
window.pdfjsLib.getDocument=function(src){
 const hardened={isEvalSupported:false,enableScripting:false};
 if(src&&typeof src==='object'&&!ArrayBuffer.isView(src)&&!(src instanceof ArrayBuffer))return original(Object.assign({},src,hardened));
 if(src instanceof ArrayBuffer||ArrayBuffer.isView(src))return original(Object.assign({data:src},hardened));
 return original(src);
};
window.ADERENCIA_PDF_SECURITY={version:'RC50',isEvalSupported:false,enableScripting:false,active:true};
})();