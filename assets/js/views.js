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
function renderAnalysis(){
  const byStatus={};
  Object.keys(STATUS).forEach(k=>byStatus[k]=0);
  records.forEach(r=>{
    const k=statusKey(r.status);
    byStatus[k]=(byStatus[k]||0)+1;
  });

  const total=records.length;
  const party=records.filter(r=>r.memberType==='party_member').length;
  const supporter=records.filter(r=>r.memberType==='supporter').length;
  const general=records.filter(r=>(r.memberType||'general')==='general').length;
  const unknown=records.filter(r=>r.memberType==='unknown').length;
  const unlocated=records.filter(r=>!(Number(r.lat)&&Number(r.lng))).length;

  const imported=records.filter(r=>r.source==='import').length;
  const manual=records.filter(r=>(r.source||'manual')==='manual').length;
  const mapped=records.filter(r=>r.source==='map').length;

  const metric=(label,value,sub='')=>`<div class="analysis-metric"><div class="analysis-value">${value}</div><div class="analysis-label">${esc(label)}</div>${sub?`<div class="analysis-sub">${esc(sub)}</div>`:''}</div>`;

  const statusRows=Object.entries(STATUS).map(([k,v])=>{
    const n=byStatus[k]||0;
    const pct=total?Math.round(n/total*100):0;
    return `<div class="analysis-row">
      <div class="analysis-row-head"><span>${esc(v.label)}</span><b>${n}件</b></div>
      <div class="analysis-bar"><div class="analysis-bar-fill" style="width:${pct}%"></div></div>
      <div class="analysis-sub">${pct}%</div>
    </div>`;
  }).join('');

  const el=$('analysisContent');
  if(!el)return;
  el.innerHTML=`
    <div class="panel">
      <div class="card-title">登録状況</div>
      <div class="analysis-grid">
        ${metric('全登録',total)}
        ${metric('党員',party)}
        ${metric('サポーター',supporter)}
        ${metric('一般',general)}
        ${unknown?metric('未設定',unknown):''}
        ${metric('位置未取得',unlocated)}
      </div>
    </div>

    <div class="panel">
      <div class="card-title">登録方法</div>
      <div class="analysis-grid">
        ${metric('名簿取込',imported)}
        ${metric('手入力',manual)}
        ${metric('地図登録',mapped)}
      </div>
    </div>

    <div class="panel">
      <div class="card-title">訪問状況</div>
      <div class="analysis-status-list">${statusRows}</div>
    </div>`;
}
function showView(v){['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x).classList.toggle('hidden',x!==v));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='map')setTimeout(()=>{if(typeof map!=='undefined'&&map&&typeof map.invalidateSize==='function')map.invalidateSize()},100)}
