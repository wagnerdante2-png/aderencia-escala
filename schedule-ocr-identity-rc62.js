(function(){
'use strict';
if(window.__ADERENCIA_OCR_IDENTITY_RC62__)return;
const base=window.ADERENCIA_SCHEDULE_ADAPTIVE_RC61;
if(!base?.identity)return;
window.__ADERENCIA_OCR_IDENTITY_RC62__=true;

const original=base.identity.bind(base);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const compact=v=>norm(v).split(' ').filter(x=>x&&!['DE','DA','DO','DAS','DOS','E'].includes(x)).join('');
function lev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function score(a,b){const A=compact(a),B=compact(b);if(!A||!B)return 0;if(A===B)return 1;if(A.length>=10&&B.length>=10&&(A.startsWith(B)||B.startsWith(A)))return Math.min(A.length,B.length)/Math.max(A.length,B.length);return 1-lev(A,B)/Math.max(A.length,B.length)}
function alignedPeople(schedulePeople,point){
  const used=new Set(),out=[];let changed=0;
  for(const emp of schedulePeople||[]){
    const ranked=(point?.people||[]).filter(p=>!used.has(p.id)).map(p=>({p,s:score(emp?.name,p?.name)})).sort((a,b)=>b.s-a.s);
    const best=ranked[0],second=ranked[1]?.s||0;
    if(best&&best.s>=.80&&best.s-second>=.10){
      used.add(best.p.id);changed++;
      out.push({...emp,name:best.p.name,_ocrOriginalName:emp.name,_ocrNameScore:best.s});
    }else out.push(emp);
  }
  return{people:out,changed};
}
base.identity=function(schedulePeople,point){
  const first=original(schedulePeople,point),aligned=alignedPeople(schedulePeople,point);
  if(!aligned.changed)return first;
  const second=original(aligned.people,point);
  if(second.matched>first.matched){second.ocrIdentityBridge={version:'RC62.1',before:first.matched,after:second.matched,aligned:aligned.changed};return second}
  return first;
};
window.ADERENCIA_OCR_IDENTITY_RC62={version:'RC62.1',score,alignedPeople,originalIdentity:original};
})();
