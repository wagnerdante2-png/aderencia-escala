(function(){
'use strict';
/* RC35 — hardening defensivo do PDF.js. Mantém a API existente e força isEvalSupported=false. */
if(!window.pdfjsLib||typeof window.pdfjsLib.getDocument!=='function'||window.__ADERENCIA_PDF_HARDENED__)return;
window.__ADERENCIA_PDF_HARDENED__=true;
const original=window.pdfjsLib.getDocument.bind(window.pdfjsLib);
window.pdfjsLib.getDocument=function(src){
 if(src&&typeof src==='object'&&!ArrayBuffer.isView(src)&&!(src instanceof ArrayBuffer))return original(Object.assign({},src,{isEvalSupported:false}));
 return original(src);
};
window.ADERENCIA_PDF_SECURITY={version:'RC35',isEvalSupported:false,active:true};
})();