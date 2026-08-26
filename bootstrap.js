(function(){
'use strict';
const REQUIRED=[['pdfjsLib','leitor de PDF'],['XLSX','leitor de Excel']];
const OPTIONAL=[['jspdf','gerador de relatórios PDF'],['Tesseract','OCR de PDF imagem']];
function setStatus(id,text){const e=document.getElementById(id);if(!e)return;e.textContent=text;e.classList.remove('muted','ok');e.classList.add('error')}
function storageOK(){try{const k='__aderencia_health__';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch{return false}}
function check(){const missing=REQUIRED.filter(([k])=>!window[k]);const optional=OPTIONAL.filter(([k])=>!window[k]);window.ADERENCIA_HEALTH={ok:!missing.length&&storageOK(),missing:missing.map(x=>x[1]),optionalMissing:optional.map(x=>x[1]),storage:storageOK(),checkedAt:new Date().toISOString()};if(missing.length){const msg=`Não foi possível carregar ${missing.map(x=>x[1]).join(' e ')}. Este pacote usa bibliotecas online; verifique a conexão e reabra o index.html.`;setStatus('pointStatus',msg);setStatus('scheduleStatus',msg);document.getElementById('calculateBtn')?.setAttribute('disabled','disabled');alert(msg)}else if(!window.ADERENCIA_HEALTH.storage){alert('O navegador bloqueou o armazenamento local. A análise funcionará, mas o histórico não poderá ser salvo.')}else if(optional.length){console.warn('Recursos opcionais indisponíveis:',optional.map(x=>x[1]).join(', '))}}
function loadBatch(){if(document.querySelector('script[data-aderencia-batch]'))return;const s=document.createElement('script');s.src='batch.js';s.dataset.aderenciaBatch='1';s.defer=true;document.head.appendChild(s)}
window.addEventListener('error',e=>console.error('Erro global da aplicação:',e.error||e.message));
check();
const badge=document.querySelector('.privacy');if(badge)badge.textContent='Processamento local no navegador • v1.0 RC35';
document.write('<script src="portable-storage.js"><\/script>');
document.write('<script src="point-semantics.js"><\/script>');
document.write('<script src="pdf-xlsx-compat-rc21.js"><\/script>');
document.write('<script src="pdf-ocr-guard-rc27.js"><\/script>');
document.write('<script src="pdf-calendar-integrity-rc29.js"><\/script>');
document.write('<script src="canonical-validation-rc35.js"><\/script>');
document.write('<script src="pdf-schedule-parser-rc28.js"><\/script>');
document.write('<script src="monitor-export.js"><\/script>');
document.write('<script src="divergence-dashboard.js"><\/script>');
document.write('<script src="divergence-capture-rc20.js"><\/script>');
document.write('<script src="layout-fixes-rc19.js"><\/script>');
document.write('<script src="store-management.js"><\/script>');
document.addEventListener('DOMContentLoaded',()=>{const r=window.ADERENCIA_STORE_REGISTRY;if(r)r.importRegistry(r.load())});
loadBatch();
})();