(function(){
'use strict';
if(window.__ADERENCIA_PDF_XLSX_COMPAT_RC21__)return;
window.__ADERENCIA_PDF_XLSX_COMPAT_RC21__=true;
if(!window.XLSX?.utils?.aoa_to_sheet)return;
const original=XLSX.utils.aoa_to_sheet;
const iso=/^20\d{2}-\d{2}-\d{2}$/;
XLSX.utils.aoa_to_sheet=function(data,opts){
  try{
    const isStructuredPdf=Array.isArray(data)&&data.some(r=>Array.isArray(r)&&String(r[0]||'').toUpperCase().includes('PDF ESTRUTURADO'));
    if(isStructuredPdf){
      data=data.map(row=>{
        if(!Array.isArray(row))return row;
        const copy=row.slice();
        for(let i=0;i<copy.length;i++){
          const v=copy[i];
          if(typeof v==='string'&&iso.test(v)){
            const [y,m,d]=v.split('-');
            copy[i]=`${d}/${m}/${y}`;
          }
        }
        return copy;
      });
    }
  }catch(e){console.warn('Compatibilidade PDF/XLSX RC21:',e)}
  return original.call(this,data,opts);
};
window.ADERENCIA_PDF_XLSX_COMPAT_VERSION='RC21';
})();