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
  const wantParty=!!$('listParty')?.checked;
  const wantSupporter=!!$('listSupporter')?.checked;
  const wantRevisit=!!$('listRevisit')?.checked;
  const wantUnvisited=!!$('listUnvisited')?.checked;
  const wantRefused=!!$('listRefused')?.checked;
  const wantWarning=!!$('listWarning')?.checked;

  const memberFilters=[];
  if(wantParty)memberFilters.push('party_member');
  if(wantSupporter)memberFilters.push('supporter');

  const statusFilters=[];
  if(wantRevisit)statusFilters.push('revisit');
  if(wantUnvisited)statusFilters.push('unvisited');
  if(wantRefused)statusFilters.push('refused');

  const filteredRecords=records.filter(r=>{
    if(q && ![r.personName,r.fullAddress,r.address,r.area,r.memo,r.assigneeName,r.phone,r.email,r.referrer]
      .some(v=>String(v||'').toLowerCase().includes(q)))return false;

    const mt=recordMemberType(r), key=statusKey(r.status);
    if(memberFilters.length&&!memberFilters.includes(mt))return false;
    if(statusFilters.length&&!statusFilters.includes(key))return false;
    if(wantWarning&&!boolValue(r.warning))return false;
    return true;
  });

  // 名簿から取り込んだだけで訪問記録がまだない党員・サポーターも
  // 一覧では「未訪問」として検索・表示する。地図座標がなくても一覧には出す。
  const linkedContactIds=new Set(records.map(r=>String(r.contactId||'')).filter(Boolean));
  const filteredContacts=contacts.filter(c=>{
    if(!['party_member','supporter'].includes(c.memberType))return false;
    if(linkedContactIds.has(String(c.contactId||'')))return false;
    if(q && ![c.name,c.fullAddress,c.postalCode,c.phone,c.email,c.partyId,c.sourceBranch,c.referrer,c.memo]
      .some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(memberFilters.length&&!memberFilters.includes(c.memberType))return false;
    if(statusFilters.length&&!statusFilters.includes('unvisited'))return false;
    if(wantWarning)return false;
    return true;
  });

  const contactCard=c=>{
    const restricted=!!c.restricted;
    const click=restricted?'':`onclick='openContact(${JSON.stringify(c).replace(/'/g,"&#39;")})'`;
    return `<div class="card ${restricted?'restricted-contact':''}" style="border-color:${STATUS.unvisited.color}" ${click}>
      <div class="card-title">${priorityBadge(c.memberType)} ${esc(c.name||c.fullAddress||'名簿')} <span class="badge">未訪問</span></div>
      <div class="card-sub">${esc(c.fullAddress||'')}</div>
      ${c.phone?`<div class="card-sub">☎ ${esc(c.phone)}</div>`:''}
      ${c.email?`<div class="card-sub">✉ ${esc(c.email)}</div>`:''}
      <div class="badges"><span class="badge">${esc(memberTypeLabel(c.memberType))}</span>${c.partyId?`<span class="badge">ID ${esc(c.partyId)}</span>`:''}</div>
      ${restricted?'<div class="privacy-note">🔒 正確な住所・連絡先は管理者のみ表示</div>':''}
    </div>`;
  };

  const html=[...filteredRecords.map(card),...filteredContacts.map(contactCard)];
  $('listCards').innerHTML=html.length
    ? html.join('')
    : '<div class="panel notice">該当データはありません。</div>';
}
function renderAnalysis(){const byStatus={};Object.keys(STATUS).forEach(k=>byStatus[k]=0);records.forEach(r=>{const k=statusKey(r.status);byStatus[k]=(byStatus[k]||0)+1});const pm=contacts.filter(c=>c.memberType==='party_member').length,sp=contacts.filter(c=>c.memberType==='supporter').length;$('view-analysis').innerHTML=`<div class="panel stats"><div class="stat"><b>${records.length}</b>登録</div><div class="stat"><b>${records.filter(r=>statusKey(r.status)!=='unvisited').length}</b>訪問済</div><div class="stat"><b>${records.filter(isRevisit).length}</b>再訪</div></div><div class="panel"><div class="card-title">優先名簿</div><div class="row"><span>⭐ 党員</span><b>${pm}件</b></div><div class="row"><span>🟠 サポーター</span><b>${sp}件</b></div></div><div class="panel"><div class="card-title">状態別</div>${Object.entries(STATUS).map(([k,v])=>`<div class="row"><span>${v.label}</span><b>${byStatus[k]||0}件</b></div>`).join('')}</div><div class="panel"><div class="card-title">担当者別</div>${Object.entries(records.reduce((a,r)=>(a[r.assigneeName||'未設定']=(a[r.assigneeName||'未設定']||0)+1,a),{})).map(([n,c])=>`<div class="row"><span>${esc(n)}</span><b>${c}件</b></div>`).join('')}</div>`}
function showView(v){['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x).classList.toggle('hidden',x!==v));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='map')setTimeout(()=>{if(typeof map!=='undefined'&&map&&typeof map.invalidateSize==='function')map.invalidateSize()},100)}
