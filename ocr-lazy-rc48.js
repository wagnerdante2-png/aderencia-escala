(function(){
'use strict';
if(window.__ADERENCIA_OCR_LAZY_RC48__)return;
window.__ADERENCIA_OCR_LAZY_RC48__=true;
const SRC='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
let loading=null,redispatching=false;
function load(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(loading)return loading;
  const started=performance.now();
  loading=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-aderencia-ocr]');
    if(existing){existing.addEventListener('load',()=>resolve(window.Tesseract),{once:true});existing.addEventListener('error',()=>reject(new Error('Falha ao carregar OCR. Verifique a conexão.')),{once:true});return;}
    const s=document.createElement('script');
    s.src=SRC;s.async=true;s.dataset.aderenciaOcr='1';
    s.onload=()=>{window.ADERENCIA_OCR_LAZY.state='ready';window.ADERENCIA_OCR_LAZY.loadedAt=new Date().toISOString();window.ADERENCIA_OCR_LAZY.loadMs=Math.round(performance.now()-started);resolve(window.Tesseract)};
    s.onerror=()=>{loading=null;window.ADERENCIA_OCR_LAZY.state='error';reject(new Error('Falha ao carregar OCR. Verifique a conexão.'))};
    document.head.appendChild(s);
  });
  window.ADERENCIA_OCR_LAZY.state='loading';
  return loading;
}
async function intercept(e){
  if(redispatching||e.target?.id!=='scheduleFile')return;
  const f=e.target.files?.[0];
  if(!f||!/\.pdf$/i.test(f.name)||window.Tesseract)return;
  e.preventDefault();e.stopImmediatePropagation();
  const status=document.getElementById('scheduleStatus');if(status){status.textContent='Preparando leitor PDF/OCR...';status.classList.remove('muted','ok','error')}
  try{await load();redispatching=true;e.target.dispatchEvent(new Event('change',{bubbles:true}));redispatching=false}
  catch(err){redispatching=false;if(status){status.textContent=`Erro: ${err.message}`;status.classList.add('error')}console.error('RC48 OCR lazy:',err)}
}
window.addEventListener('change',intercept,true);
window.ADERENCIA_ENSURE_OCR=load;
window.ADERENCIA_OCR_LAZY={version:'RC48',state:window.Tesseract?'ready':'idle',loadedAt:null,loadMs:null,source:SRC};
})();