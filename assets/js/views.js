"use strict";
function formatShortDate(v){const d=new Date(v);return isNaN(d)?String(v||""):`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`}
function renderAll(){renderMarkers();renderLists();renderAnalysis()}

function recordFollowBadges(r){
  const out=[];
  if(boolValue(r.followParty))out.push('<span class="badge">⭐ 党員希望</span>');
  if(boolValue(r.followSupporter))out.push('<span class="badge">🟠 サポーター希望</span>');
  if(boolValue(r.followDetails))out.push('<span class="badge">💬 詳細希望</span>');
  if(out.length)out.push(`<span class="badge">${boolValue(r.followDone)?'✓ 対応済':'未対応'}</span>`);
  if(boolValue(r.posterRequest))out.push(`<span class="badge warning-soft">🍊 ポスター依頼${boolValue(r.posterReported)?'・報告済':'・未報告'}</span>`);
  return out.join('');
}
function recordCard(r){
  const mt=recordMemberType(r),key=statusKey(r.status),st=STATUS[key]||STATUS.unvisited;
  const located=!!(Number(r.lat)&&Number(r.lng));
  const sourceLabel={import:'名簿取込',manual:'手入力',map:'地図登録'};
  return `<article class="card" style="border-left-color:${st.color}" onclick='openEdit(${JSON.stringify(r).replace(/'/g,"&#39;")},false)'>
    <div class="card-title">${priorityBadge(mt)} ${esc(r.personName||r.fullAddress||'名称未設定')} <span class="badge">${esc(st.label)}</span></div>
    <div class="muted">${esc(r.fullAddress||'住所未設定')}${r.date?' ｜ '+esc(formatShortDate(r.date)):''}</div>
    ${r.phone?`<div class="muted">☎ ${esc(r.phone)}</div>`:''}
    <div class="badges">
      <span class="badge">${esc(memberTypeLabel(mt))}</span>
      <span class="badge">${esc(sourceLabel[r.source]||'手入力')}</span>
      <span class="badge">${(session?.role==='member'&&['party_member','supporter'].includes(mt))?(r.locationConfirmed?'🔒 位置確認済':'⚠ 位置未確認'):(located?'📍 位置取得済':'⚠ 位置未取得')}</span>
      ${r.revisitPriority?`<span class="badge">再訪 ${esc(r.revisitPriority)}</span>`:''}
      ${boolValue(r.warning)?'<span class="badge warning-soft">⚠ 訪問注意</span>':''}
      ${recordFollowBadges(r)}
    </div>
    ${r.referrer?`<div class="card-sub">紹介：${esc(r.referrer)}</div>`:''}
    ${r.memo?`<div class="card-sub">${esc(r.memo)}</div>`:''}
    <div class="card-actions">
      ${located?`<button type="button" class="list-map-btn has-tip" data-tip="地図で見る" onclick="event.stopPropagation();showRecordOnMap('${esc(r.id)}')">📍 <span>地図で見る</span></button>`:`<span class="list-map-unavailable">位置未取得</span>`}
    </div>
  </article>`;
}
function toggleListFilters(force){
  const panel=$('listFilterPanel');
  const btn=$('listFilterToggle');
  if(!panel)return;
  const isMobile=window.matchMedia('(max-width:700px)').matches;
  if(!isMobile){
    panel.classList.remove('mobile-collapsed');
    if(btn)btn.setAttribute('aria-expanded','true');
    return;
  }
  const open=typeof force==='boolean'?force:panel.classList.contains('mobile-collapsed');
  panel.classList.toggle('mobile-collapsed',!open);
  if(btn){
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.textContent=open?'× 閉じる':'⚙ 絞り込み';
  }
}
function renderLists(){
  const q=($('listSearch')?.value||'').trim().toLowerCase();
  const source=$('listSource')?.value||'',memberType=$('listMemberType')?.value||'',location=$('listLocation')?.value||'';
  const revisit=!!$('listRevisit')?.checked,unvisited=!!$('listUnvisited')?.checked,refused=!!$('listRefused')?.checked,warning=!!$('listWarning')?.checked;
  const follow=!!$('listFollow')?.checked,followPending=!!$('listFollowPending')?.checked,poster=!!$('listPosterRequest')?.checked,posterPending=!!$('listPosterPending')?.checked;
  const statusFilters=[];if(revisit)statusFilters.push('revisit');if(unvisited)statusFilters.push('unvisited');if(refused)statusFilters.push('refused');
  const filtered=records.filter(r=>{
    if(currentAreaId&&String(r.areaId||'')!==String(currentAreaId))return false;
    if(q&&![r.personName,r.fullAddress,r.phone,r.email,r.partyId,r.sourceBranch,r.referrer,r.memo,r.followMemo,r.posterRequestMemo].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(source&&String(r.source||'manual')!==source)return false;
    if(memberType&&String(r.memberType||'general')!==memberType)return false;
    const located=!!(Number(r.lat)&&Number(r.lng));
    if(location==='located'&&!located)return false;
    if(location==='unlocated'&&located)return false;
    if(statusFilters.length&&!statusFilters.includes(statusKey(r.status)))return false;
    if(warning&&!boolValue(r.warning))return false;
    if(follow&&!hasFollow(r))return false;
    if(followPending&&(!hasFollow(r)||boolValue(r.followDone)))return false;
    if(poster&&!boolValue(r.posterRequest))return false;
    if(posterPending&&(!boolValue(r.posterRequest)||boolValue(r.posterReported)))return false;
    return true;
  });
  $('listCards').innerHTML=filtered.map(recordCard).join('')||'<div class="panel notice">該当データはありません。</div>';
}

function townKey(address){
  const s=String(address||'').replace(/\s+/g,'');if(!s)return'住所未設定';
  const m=s.match(/(?:東区|博多区|中央区|南区|城南区|早良区|西区)(.+?丁目)/);if(m)return m[1];
  const m2=s.match(/(?:東区|博多区|中央区|南区|城南区|早良区|西区)([^0-9\-－ー番地号]+?)(?=\d|$)/);if(m2&&m2[1])return m2[1];
  return s.replace(/^.*?(?:東区|博多区|中央区|南区|城南区|早良区|西区)/,'').slice(0,12)||'その他';
}
function clearListChecks(){
  ['listRevisit','listUnvisited','listRefused','listWarning','listFollow','listFollowPending','listPosterRequest','listPosterPending'].forEach(id=>{if($(id))$(id).checked=false});
}
function analysisGo(kind){
  if($('listSource'))$('listSource').value='';if($('listMemberType'))$('listMemberType').value='';if($('listLocation'))$('listLocation').value='';clearListChecks();
  if(kind==='unlocated')$('listLocation').value='unlocated';
  if(kind==='revisit')$('listRevisit').checked=true;
  if(kind==='unvisited')$('listUnvisited').checked=true;
  if(kind==='warning')$('listWarning').checked=true;
  if(kind==='party')$('listMemberType').value='party_member';
  if(kind==='supporter')$('listMemberType').value='supporter';
  if(kind==='follow')$('listFollow').checked=true;
  if(kind==='followPending')$('listFollowPending').checked=true;
  if(kind==='posterPending')$('listPosterPending').checked=true;
  showView('list');renderLists();
}
function renderAnalysis(){
  const total=records.length,countStatus=k=>records.filter(r=>statusKey(r.status)===k).length;
  const unvisited=countStatus('unvisited'),handshake=countStatus('handshake'),absent=countStatus('absent'),refused=countStatus('refused');
  const revisit=records.filter(isRevisit).length,warning=records.filter(r=>boolValue(r.warning)).length;
  const visited=Math.max(0,total-unvisited),unlocated=records.filter(r=>!(Number(r.lat)&&Number(r.lng))).length;
  const follow=records.filter(hasFollow),followPending=follow.filter(r=>!boolValue(r.followDone)).length;
  const poster=records.filter(r=>boolValue(r.posterRequest)),posterPending=poster.filter(r=>!boolValue(r.posterReported)).length;
  const party=records.filter(r=>r.memberType==='party_member').length,supporter=records.filter(r=>r.memberType==='supporter').length;
  const visitRate=total?Math.round(visited/total*100):0;
  const towns={};
  records.forEach(r=>{const k=townKey(r.fullAddress);if(!towns[k])towns[k]={total:0,visited:0,unvisited:0,revisit:0};const t=towns[k];t.total++;const st=statusKey(r.status);if(st==='unvisited')t.unvisited++;else t.visited++;if(isRevisit(r))t.revisit++});
  const townRows=Object.entries(towns).sort((a,b)=>b[1].unvisited-a[1].unvisited).slice(0,10).map(([name,t])=>{const rate=t.total?Math.round(t.visited/t.total*100):0;return `<div class="analysis-town-row"><div class="analysis-town-main"><b>${esc(name)}</b><span>${t.total}件</span></div><div class="analysis-town-stats"><span>未訪問 ${t.unvisited}</span><span>再訪 ${t.revisit}</span><span>進捗 ${rate}%</span></div><div class="analysis-bar"><div class="analysis-bar-fill" style="width:${rate}%"></div></div></div>`}).join('');
  const action=(kind,label,value,detail)=>`<button class="analysis-action" onclick="analysisGo('${kind}')"><span class="analysis-action-value">${value}</span><span class="analysis-action-label">${esc(label)}</span><span class="analysis-action-sub">${esc(detail)}</span></button>`;
  const metric=(label,value)=>`<div class="analysis-metric"><div class="analysis-value">${value}</div><div class="analysis-label">${esc(label)}</div></div>`;
  const el=$('analysisContent');if(!el)return;
  el.innerHTML=`
  <div class="panel activity-section priority-section">
    <div class="section-heading"><div class="heading-icon orange">✓</div><div><h2>今日やること</h2><p>次の対応が必要なもの</p></div></div>
    <div class="analysis-actions">
      ${action('revisit','要再訪',revisit,'もう一度訪問する')}
      ${action('followPending','フォロー未対応',followPending,'党員・サポーター希望など')}
      ${action('posterPending','ポスター依頼',posterPending,'党への報告待ち')}
    </div>
  </div>

  <div class="panel activity-section">
    <div class="section-heading"><div class="heading-icon green">📋</div><div><h2>訪問状況</h2><p>${visited} / ${total}件 訪問済み　進捗 ${visitRate}%</p></div></div>
    <div class="analysis-progress-head"><b>訪問進捗</b><span>${visitRate}%</span></div><div class="analysis-bar"><div class="analysis-bar-fill" style="width:${visitRate}%"></div></div>
    <div class="analysis-grid visit-status-grid">
      <button class="analysis-metric" onclick="analysisGo('unvisited')"><div class="analysis-value">${unvisited}</div><div class="analysis-label">未訪問</div></button>
      ${metric('訪問済',visited)}
      ${metric('手応え',handshake)}
      ${metric('不在',absent)}
      <button class="analysis-metric" onclick="analysisGo('revisit')"><div class="analysis-value">${revisit}</div><div class="analysis-label">要再訪</div></button>
      ${metric('断られた',refused)}
    </div>
  </div>

  <div class="panel activity-section attention-section">
    <div class="section-heading"><div class="heading-icon danger">⚠</div><div><h2>対応が必要</h2><p>注意事項・報告漏れを確認</p></div></div>
    <div class="analysis-actions">
      ${action('warning','訪問注意',warning,'訪問前に注意事項を確認')}
      ${action('posterPending','ポスター未報告',posterPending,'党への報告が必要')}
    </div>
  </div>

  <div class="panel"><div class="section-heading"><div class="heading-icon orange">👥</div><div><h2>つながり</h2><p>名簿とフォローの状況</p></div></div>
    <div class="analysis-grid"><button class="analysis-metric" onclick="analysisGo('party')"><div class="analysis-value">${party}</div><div class="analysis-label">党員</div></button><button class="analysis-metric" onclick="analysisGo('supporter')"><div class="analysis-value">${supporter}</div><div class="analysis-label">サポーター</div></button><button class="analysis-metric" onclick="analysisGo('follow')"><div class="analysis-value">${follow.length}</div><div class="analysis-label">フォロー対象</div></button>${metric('ポスター依頼',poster.length)}${metric('位置未取得',unlocated)}</div>
  </div>
  <div class="panel"><div class="section-heading"><div class="heading-icon green">📍</div><div><h2>町丁目別の進捗</h2><p>未訪問が多い地域から表示</p></div></div><div class="analysis-town-list">${townRows||'<div class="notice">住所データがありません。</div>'}</div></div>`;
}
function showView(v){
  ['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x)?.classList.toggle('hidden',x!==v));
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  if(v==='analysis')renderAnalysis();
  if(v==='list')setTimeout(()=>toggleListFilters(window.innerWidth>700),0);
  if(v==='map')setTimeout(()=>{if(map&&typeof map.invalidateSize==='function')map.invalidateSize();},100);
}
