"use strict";
window.addEventListener('load',()=>{if(session)startApp()});

(function initTouchTips(){
  let timer=null;
  document.addEventListener('click',e=>{
    const el=e.target.closest?.('.has-tip[data-tip]');
    if(!el)return;
    if(!window.matchMedia('(hover:none), (pointer:coarse)').matches)return;
    const tip=document.getElementById('mobileTip');
    if(!tip)return;
    tip.textContent=el.dataset.tip||'';
    tip.classList.add('show');
    clearTimeout(timer);
    timer=setTimeout(()=>tip.classList.remove('show'),1800);
  },true);
})();
