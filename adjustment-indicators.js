(function(){
'use strict';
const $=id=>document.getElementById(id);
function H(){return window.ADERENCIA_HISTORY}
function hasBonus(store,month,year){if(!H())return false;return H().load().some(r=>r.store===store&&(month==='all'||r.month===Number(month))&&(year==='all'||r.year===Number(year))&&r.bonus)}
function markHistory(){const m=$('historyMonth')?.value||'all',y=$('historyYear')?.value||'all';document.querySelectorAll('#historyBars .history-store-label').forEach(el=>{const raw=el.textContent.replace(/\s*★\s*$/,'').trim(),store=(raw.match(/ML\d{2}/)||[])[0];el.textContent=raw+(store&&hasBonus(store,m,y)?' ★':'');if(store&&hasBonus(store,m,y))el.title=`${raw} • possui ajuste eletivo em ao menos um registro do filtro`})}
function markSemester(){const y=$('semesterYear')?.value;document.querySelectorAll('#semesterTable .semester-row:not(.header) > span:first-child').forEach(el=>{const raw=el.textContent.replace(/\s*★\s*$/,'').trim(),store=(raw.match(/ML\d{2}/)||[])[0];el.textContent=raw+(store&&y&&hasBonus(store,'all',y)?' ★':'');if(store&&y&&hasBonus(store,'all',y))el.title=`${raw} • possui ajuste eletivo em ${y}`})}
function mark(){setTimeout(()=>{markHistory();markSemester()},0)}
['historyTab','semesterTab','historyMonth','historyYear','historyStore','semesterYear','semesterStore'].forEach(id=>$(id)?.addEventListener('click',mark));['historyMonth','historyYear','historyStore','semesterYear','semesterStore'].forEach(id=>$(id)?.addEventListener('change',mark));window.addEventListener('aderencia:historychange',mark);mark();
})();