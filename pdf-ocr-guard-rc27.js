(function(){
'use strict';
/* RC27: PDFs de escala exportados pelo Excel possuem camada textual utilizável.
   OCR automático estava mascarando erros reais do parser e podia deixar o navegador
   preso por vários minutos em file://. Guardamos o Tesseract para uso futuro/manual,
   mas o parser estruturado deve falhar rápido e informar a causa real. */
if(window.Tesseract){
  window.ADERENCIA_TESSERACT_MANUAL = window.Tesseract;
  try{ Object.defineProperty(window,'Tesseract',{value:null,writable:true,configurable:true}); }
  catch{ window.Tesseract = null; }
}
window.ADERENCIA_AUTO_OCR_DISABLED = true;
})();
