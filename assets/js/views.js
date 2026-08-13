"use strict";
function renderAll(){renderMarkers();renderLists();renderAnalysis()}
function card(r){const mt=recordMemberType(r);return `<div class="card" style="border-color:${STATUS[statusKey(r.status)].color}" onclick='openEdit(${JSON.stringify(r).replace(/'/g,"&#39;")},false)'><div class="card-title">${priorityBadge(mt)} ${esc(r.personName||r.fullAddress||'訪問先')}</div><div class="card-sub">${esc(r.fullAddress)}｜${esc(r.date)}｜${esc(r.assigneeName||'')}</div><div class="badges"><span class="badge">${esc(STATUS[statusKey(r.status)].label)}</span>${mt?`<span class="badge">${esc(memberTypeLabel(mt))}</span>`:''}${r.supporter?`<span class="badge">${esc(r.supporter)}</span>`:''}${r.revisitPriority?`<span class="badge">再訪 ${esc(r.revisitPriority)}</span>`:''}</div>${r.memo?`<div class="card-sub">${esc(r.memo)}</div>`:''}</div>`}
let listQuickFilter='all';
function setListFilter(filter,btn){
  listQuickFilter=filter||'all';
  document.querySelectorAll('#listQuickFilters .quick-filter').forEach(b=>b.classList.toggle('active',b===btn));
  renderLists();
}
function renderLists(){
  const q=($('listSearch')?.value||'').trim().toLowerCase();
  let filtered=records.filter(r=>{
    if(!q)return true;
    return [r.personName,r.fullAddress,r.address,r.area,r.memo,r.assigneeName]
      .some(v=>String(v||'').toLowerCase().includes(q));
  });

  if(listQuickFilter==='unvisited') filtered=filtered.filter(r=>statusKey(r.status)==='unvisited');
  if(listQuickFilter==='revisit') filtered=filtered.filter(isRevisit);
  if(listQuickFilter==='party_member') filtered=filtered.filter(r=>recordMemberType(r)==='party_member');
  if(listQuickFilter==='supporter') filtered=filtered.filter(r=>recordMemberType(r)==='supporter');

  $('listCards').innerHTML=filtered.length
    ? filtered.map(card).join('')
    : '<div class="panel notice">該当データはありません。</div>';
}
function renderAnalysis(){const byStatus={};Object.keys(STATUS).forEach(k=>byStatus[k]=0);records.forEach(r=>{const k=statusKey(r.status);byStatus[k]=(byStatus[k]||0)+1});const pm=contacts.filter(c=>c.memberType==='party_member').length,sp=contacts.filter(c=>c.memberType==='supporter').length;$('view-analysis').innerHTML=`<div class="panel stats"><div class="stat"><b>${records.length}</b>登録</div><div class="stat"><b>${records.filter(r=>statusKey(r.status)!=='unvisited').length}</b>訪問済</div><div class="stat"><b>${records.filter(isRevisit).length}</b>再訪</div></div><div class="panel"><div class="card-title">優先名簿</div><div class="row"><span>⭐ 党員</span><b>${pm}件</b></div><div class="row"><span>🟠 サポーター</span><b>${sp}件</b></div></div><div class="panel"><div class="card-title">状態別</div>${Object.entries(STATUS).map(([k,v])=>`<div class="row"><span>${v.label}</span><b>${byStatus[k]||0}件</b></div>`).join('')}</div><div class="panel"><div class="card-title">担当者別</div>${Object.entries(records.reduce((a,r)=>(a[r.assigneeName||'未設定']=(a[r.assigneeName||'未設定']||0)+1,a),{})).map(([n,c])=>`<div class="row"><span>${esc(n)}</span><b>${c}件</b></div>`).join('')}</div>`}
function showView(v){['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x).classList.toggle('hidden',x!==v));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='map')setTimeout(()=>map.invalidateSize(),100)}
