(function(){
'use strict';
if(window.__ADERENCIA_OCR_GRID_NORMALIZER_RC58__)return;
window.__ADERENCIA_OCR_GRID_NORMALIZER_RC58__=true;
const VERSION='RC58.7';
const originalEnsure=window.ADERENCIA_ENSURE_OCR;
function normalizeToken(value){
 const raw=String(value??'').trim();if(!raw)return raw;
 let n=raw.toUpperCase().replace(/[|]/g,'I').replace(/[^A-Z0-9]/g,'');
 let m=n.match(/^1(\d{2})$/);if(m){const x=+m[1];if(x>=1&&x<=39)return`T${x}`}
 m=n.match(/^T([0-9AEBILO]{1,2})$/);if(m){const d=m[1].replace(/[AIL]/g,'1').replace(/[BE]/g,'8').replace(/O/g,'0');const x=+d;if(x>=1&&x<=39)return`T${x}`}
 return raw;
}
function patch(T){
 if(!T||T.__ADERENCIA_GRID_NORMALIZED__)return T;
 const recognize=T.recognize?.bind(T);if(typeof recognize!=='function')return T;
 T.recognize=async function(){const r=await recognize(...arguments);for(const w of r?.data?.words||[])w.text=normalizeToken(w.text);return r};
 T.__ADERENCIA_GRID_NORMALIZED__=true;return T;
}
if(typeof originalEnsure==='function')window.ADERENCIA_ENSURE_OCR=async function(){return patch(await originalEnsure())};
if(window.Tesseract)patch(window.Tesseract);
window.ADERENCIA_OCR_GRID_NORMALIZER_RC58={version:VERSION,normalizeToken,patch};
})();
