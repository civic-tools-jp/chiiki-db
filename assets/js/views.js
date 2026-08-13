function formatShortDate(v){const d=new Date(v);return isNaN(d)?String(v||""):`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`}
"use strict";
function renderAll(){renderMarkers();renderLists();renderAnalysis()}
function card(r){
  const mt=recordMemberType(r),key=statusKey(r.status);
  const refused=key==='refused'?'<span class="refused-badge">×断られた</span>':'';
  const warning=boolValue(r.warning)?'<span class="warning-badge">⚠️訪問注意</span>':'';
  const d=r.date?formatShortDate(r.date):'';
  return `<div class="card" style="border-color:${STATUS[key].color}" onclick='openEdit(${JSON.stringify(r).replace(/'/g,"&#39;")},false)'>
    <div class="card-title">${priorityBadge(mt)} ${esc(r.personName||r.fullAddress||'訪問先')} ${refused} ${warning}</div>
    <div class="card-sub">${esc(r.fullAddress)}${d?' ｜ '+esc(d):''}${r.assigneeName?' ｜ '+esc(r.assigneeName):''}</div>
    ${r.phone?`<div class="card-sub">☎ ${esc(r.phone)}</div>`:''}
    ${r.email?`<div class="card-sub">✉ ${esc(r.email)}</div>`:''}
    ${r.referrer?`<div class="card-sub">紹介：${esc(r.referrer)}</div>`:''}
    <div class="badges">
      <span class="badge">${esc(STATUS[key].label)}</span>
      ${mt?`<span class="badge">${esc(memberTypeLabel(mt))}</span>`:''}
      ${r.supporter?`<span class="badge">${esc(r.supporter)}</span>`:''}
      ${r.revisitPriority?`<span class="badge">再訪 ${esc(r.revisitPriority)}</span>`:''}
      ${r.warningReason?`<span class="badge warning-soft">${esc(r.warningReason)}</span>`:''}
    </div>
    ${boolValue(r.warning)&&r.warningMemo?`<div class="card-sub warning-note">⚠ ${esc(r.warningMemo)}</div>`:''}
    ${r.memo?`<div class="card-sub">${esc(r.memo)}</div>`:''}
  </div>`
}
let listQuickFilter='all';
function setListFilter(){renderLists()}
function renderLists(){
  const q=($('listSearch')?.value||'').trim().toLowerCase();
  const source=$('listSource')?.value||'';
  const memberType=$('listMemberType')?.value||'';
  const location=$('listLocation')?.value||'';
  const revisit=$('listRevisit')?.checked,unvisited=$('listUnvisited')?.checked,refused=$('listRefused')?.checked,warning=$('listWarning')?.checked;
  const statusFilters=[];
  if(revisit)statusFilters.push('revisit');
  if(unvisited)statusFilters.push('unvisited');
  if(refused)statusFilters.push('refused');
  const filtered=records.filter(r=>{
    if(q && ![r.personName,r.fullAddress,r.phone,r.email,r.partyId,r.sourceBranch,r.referrer,r.memo].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(source && String(r.source||'manual')!==source)return false;
    if(memberType && String(r.memberType||'general')!==memberType)return false;
    const located=Number(r.lat)&&Number(r.lng);
    if(location==='located'&&!located)return false;
    if(location==='unlocated'&&located)return false;
    if(statusFilters.length&&!statusFilters.includes(statusKey(r.status)))return false;
    if(warning&&!boolValue(r.warning))return false;
    return true;
  });
  const sourceLabel={import:'名簿取込',manual:'手入力',map:'地図登録'};
  const html=filtered.map(r=>{
    const mt=r.memberType||'general',located=!!(Number(r.lat)&&Number(r.lng));
    return `<div class="card" style="border-color:${STATUS[statusKey(r.status)].color}" onclick='openEdit(${JSON.stringify(r).replace(/'/g,"&#39;")},false)'>
      <div class="card-title">${priorityBadge(mt)} ${esc(r.personName||r.fullAddress||'名称未設定')} <span class="badge">${esc(STATUS[statusKey(r.status)].label)}</span></div>
      <div class="muted">${esc(r.fullAddress||'住所未設定')}</div>
      <div class="badges"><span class="badge">${esc(memberTypeLabel(mt))}</span><span class="badge">${esc(sourceLabel[r.source]||'手入力')}</span><span class="badge">${located?'📍位置取得済':'⚠️位置未取得'}</span>${r.partyId?`<span class="badge">ID ${esc(r.partyId)}</span>`:''}</div>
      ${r.phone?`<div class="muted">☎ ${esc(r.phone)}</div>`:''}
    </div>`;
  });
  $('listCards').innerHTML=html.join('')||'<div class="panel notice">該当データはありません。</div>';
}
function renderAnalysis(){const byStatus={};Object.keys(STATUS).forEach(k=>byStatus[k]=0);records.forEach(r=>{const k=statusKey(r.status);byStatus[k]=(byStatus[k]||0)+1});const pm=records.filter(r=>r.memberType==='party_member').length,sp=records.filter(r=>r.memberType==='supporter').length;const el=$('analysisContent');if(el)el.innerHTML=`<div class="metric-grid"><div class="metric"><b>${records.length}</b><span>全登録</span></div><div class="metric"><b>${pm}</b><span>党員</span></div><div class="metric"><b>${sp}</b><span>サポーター</span></div></div>`}
function showView(v){['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x).classList.toggle('hidden',x!==v));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='map')setTimeout(()=>{if(typeof map!=='undefined'&&map&&typeof map.invalidateSize==='function')map.invalidateSize()},100)}
