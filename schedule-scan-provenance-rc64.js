(function(){
'use strict';
if(window.__ADERENCIA_SCAN_PROVENANCE_RC64__)return;
window.__ADERENCIA_SCAN_PROVENANCE_RC64__=true;
const VERSION='RC64.1';
const input=document.getElementById('scheduleFile');
function expectedName(last){const original=String(last?.original||'');if(!last?.store||!original)return'';return`RC51_RC61_${last.store}_${original.replace(/\.[^.]+$/,'.xlsx')}`}
function safeProfile(last){const p=last?.coverageProfile||{};return !!p.distributionSafe&&+p.blankRows===0&&+p.blankCols===0&&+p.identityRatio>=.60&&+p.maxRowMissing<=.50&&+p.maxColMissing<=.50&&+p.maxRun<=7}
function mark(file){
 const scanner=window.ADERENCIA_SCAN_GRID_RC63,last=scanner?.last;
 if(scanner?.busy!==true)return false;
 if(!file||!last||last.source!=='pdf-scan-grid'||!/\.xlsx$/i.test(file.name))return false;
 if(file.name!==expectedName(last))return false;
 const coverage=Number(last.coverage),safe=safeProfile(last),controlled=last.coveragePolicy==='partial-controlled'&&safe&&coverage>=.92&&coverage<.95;
 const meta=Object.freeze({version:VERSION,source:'pdf-ocr-controlled',scannerVersion:last.version||scanner?.version||'RC63',original:String(last.original||''),store:String(last.store||''),coverage,controlled,structuralCoverageFloor:controlled ? .92 : .95,distributionSafe:safe,identityRatio:Number(last.coverageProfile?.identityRatio),blankRows:Number(last.coverageProfile?.blankRows),blankCols:Number(last.coverageProfile?.blankCols),maxRowMissing:Number(last.coverageProfile?.maxRowMissing),maxColMissing:Number(last.coverageProfile?.maxColMissing),maxRun:Number(last.coverageProfile?.maxRun)});
 try{Object.defineProperty(file,'__ADERENCIA_CONTROLLED_SCAN__',{value:meta,enumerable:false,configurable:false,writable:false});return true}catch{return false}
}
function metaFor(file){if(file?.__ADERENCIA_CONTROLLED_SCAN__)return file.__ADERENCIA_CONTROLLED_SCAN__;return mark(file)?file.__ADERENCIA_CONTROLLED_SCAN__:null}
input?.addEventListener('change',e=>{if(e.target===input)mark(input.files?.[0])},true);
window.ADERENCIA_SCAN_PROVENANCE_RC64={version:VERSION,mark,metaFor,expectedName,safeProfile};
})();
