"use strict";
window.addEventListener('load',()=>{if(session)startApp()});


function toggleMapFilters(force){
  const panel=document.getElementById('mapQuickFilters');
  const btn=document.getElementById('mapFilterToggle');
  if(!panel)return;
  const open=typeof force==='boolean'?force:panel.classList.contains('filters-collapsed');
  panel.classList.toggle('filters-collapsed',!open);
  if(btn){
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.innerHTML=filterToggleMarkup(open);
  }
}

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


function toggleMobileLegend(){
  const box=document.getElementById('mobileMapLegend');
  if(box) box.classList.toggle('hidden');
}
function syncMobileMapMeta(){
  const src=document.querySelector('.map-legend-inline');
  const dst=document.getElementById('mobileMapLegend');
  if(src&&dst) dst.innerHTML=src.innerHTML;
  const countText=(document.querySelector('.map-result-count')?.textContent||'').match(/\d+/);
  const count=countText?countText[0]:'0';
  const val=document.getElementById('mobileMapCountValue');
  if(val) val.textContent=count;
}
function syncMobileUser(){
  const out=document.getElementById('mobileUserName');
  if(!out)return;
  const candidates=[
    document.querySelector('.user-meta b'),
    document.querySelector('.user-menu b'),
    document.querySelector('#userName')
  ];
  const src=candidates.find(Boolean);
  if(src && src.textContent.trim()) out.textContent=src.textContent.trim();
}
(function initV276Sync(){
  const boot=()=>{syncMobileMapMeta();syncMobileUser();};
  document.addEventListener('DOMContentLoaded',boot);
  window.addEventListener('load',boot);
})();