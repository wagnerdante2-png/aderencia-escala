(function(){
'use strict';
const REQUIRED=[['pdfjsLib','leitor de PDF'],['XLSX','leitor de Excel']];
const OPTIONAL=[['jspdf','gerador de relatórios PDF'],['Tesseract','OCR de PDF imagem']];
function setStatus(id,text){const e=document.getElementById(id);if(!e)return;e.textContent=text;e.classList.remove('muted','ok');e.classList.add('error')}
function storageOK(){try{const k='__aderencia_health__';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch{return false}}
function check(){
  if(window.pdfjsLib?.GlobalWorkerOptions)window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const missing=REQUIRED.filter(([k])=>!window[k]),optional=OPTIONAL.filter(([k])=>!window[k]),storage=storageOK();
  window.ADERENCIA_HEALTH={ok:!missing.length&&storage,missing:missing.map(x=>x[1]),optionalMissing:optional.map(x=>x[1]),storage,checkedAt:new Date().toISOString()};
  if(missing.length){const msg=`Não foi possível carregar ${missing.map(x=>x[1]).join(' e ')}. Este pacote usa bibliotecas online; verifique a conexão e reabra o index.html.`;setStatus('pointStatus',msg);setStatus('scheduleStatus',msg);document.getElementById('calculateBtn')?.setAttribute('disabled','disabled');alert(msg)}
  else if(!storage)alert('O navegador bloqueou o armazenamento local. A análise funcionará, mas o histórico não poderá ser salvo.');
  else if(optional.length)console.warn('Recursos opcionais indisponíveis:',optional.map(x=>x[1]).join(', '));
}
function loadRc3Fixes(){window.addEventListener('load',()=>{if(document.querySelector('script[data-rc3]'))return;const s=document.createElement('script');s.src='engine-rc3-fixes.js';s.dataset.rc3='1';s.onerror=()=>console.warn('Ajustes RC3 não carregados.');document.body.appendChild(s)})}
window.addEventListener('error',e=>console.error('Erro global da aplicação:',e.error||e.message));
check();loadRc3Fixes();
})();