(function(){
'use strict';
if(window.__ADERENCIA_OCR_LAZY_RC48__)return;
window.__ADERENCIA_OCR_LAZY_RC48__=true;
const SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
let loading=null;
function load(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(loading)return loading;
  const started=performance.now();
  window.ADERENCIA_OCR_LAZY.state='loading';
  loading=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-aderencia-ocr]');
    if(existing){
      existing.addEventListener('load',()=>resolve(window.Tesseract),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Falha ao carregar OCR. Verifique a conexão.')),{once:true});
      return;
    }
    const s=document.createElement('script');
    s.src=SRC;s.async=true;s.dataset.aderenciaOcr='1';
    s.onload=()=>{window.ADERENCIA_OCR_LAZY.state='ready';window.ADERENCIA_OCR_LAZY.loadedAt=new Date().toISOString();window.ADERENCIA_OCR_LAZY.loadMs=Math.round(performance.now()-started);resolve(window.Tesseract)};
    s.onerror=()=>{loading=null;window.ADERENCIA_OCR_LAZY.state='error';reject(new Error('Falha ao carregar OCR. Verifique a conexão.'))};
    document.head.appendChild(s);
  });
  return loading;
}
window.ADERENCIA_ENSURE_OCR=load;
window.ADERENCIA_OCR_LAZY={version:'RC49',state:window.Tesseract?'ready':'idle',loadedAt:null,loadMs:null,source:SRC,mode:'explicit-on-demand'};
})();