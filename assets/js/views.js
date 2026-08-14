"use strict";

function filterToggleMarkup(open){
  return `<svg class="filter-funnel-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16l-6.3 7.1v4.5l-3.4 1.8v-6.3L4 6Z"/></svg><span>${open?'絞り込みを閉じる':'絞り込み'}</span>`;
}
function formatShortDate(v){const d=new Date(v);return isNaN(d)?String(v||""):`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`}
function renderAll(){renderMarkers();renderLists();renderAnalysis()}

function cleanDisplayName(v){
  let s=String(v||'').trim();
  s=s.replace(/^(?:party_member|party|supporter|general|unknown)\s*[|｜:：\-–—]?\s*/i,'').trim();
  return s;
}
function recordDisplayName(r){
  if(!r)return '';
  // 名簿取込は氏名の正本(lastName/firstName)を優先。旧personNameに内部値が残っていても表示しない。
  if(String(r.source||'')==='import'){
    const canonical=[r.lastName,r.firstName].map(v=>cleanDisplayName(v)).filter(Boolean).join(' ');
    if(canonical)return canonical;
  }
  return cleanDisplayName(r.personName);
}


function supportRankValue(v){
  const raw=String(v||'').trim();
  if(['A','B','C'].includes(raw))return raw;
  if(raw==='◎有力')return 'A';
  if(raw==='○可能性あり')return 'B';
  if(raw==='△様子見')return 'C';
  return '';
}
function supportRankLabel(v){
  const rank=supportRankValue(v);
  return rank?`支持 ${rank}`:'';
}

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
    <div class="card-title-row"><div class="card-title">${esc(recordDisplayName(r)||'名前未登録')} <span class="badge status-badge"><span class="status-icon">${esc(st.icon||'')}</span>${esc(st.label)}</span></div>${located?`<button type="button" class="list-map-btn has-tip" data-tip="地図で見る" onclick="event.stopPropagation();showRecordOnMap('${esc(r.id)}')">📍 <span>地図で見る</span></button>`:''}</div>
    <div class="muted">${esc(r.fullAddress||'住所未設定')}${r.date?' ｜ '+esc(formatShortDate(r.date)):''}</div>
    <div class="badges">
      <span class="badge member-badge ${mt==='party_member'?'member-party':mt==='supporter'?'member-supporter':''}">${esc(memberTypeLabel(mt))}</span>
      <span class="badge">${esc(sourceLabel[r.source]||'手入力')}</span>
      <span class="badge">${(session?.role==='member'&&['party_member','supporter'].includes(mt))?(r.locationConfirmed?'🔒 位置確認済':'⚠ 位置未確認'):(located?'📍 位置取得済':'⚠ 位置未取得')}</span>
      ${supportRankLabel(r.supporter)?`<span class="badge support-rank-badge rank-${supportRankValue(r.supporter).toLowerCase()}">${esc(supportRankLabel(r.supporter))}</span>`:''}
      ${r.revisitPriority?`<span class="badge">優先度 ${esc(String(r.revisitPriority).replace(/^[△○◎]/,''))}</span>`:''}${Number(r.visitCount||0)>0?`<span class="badge">訪問 ${Number(r.visitCount||0)}回</span>`:''}
      ${boolValue(r.warning)?'<span class="badge warning-soft">⚠ 訪問注意</span>':''}
      ${recordFollowBadges(r)}
    </div>
    ${r.referrer?`<div class="card-sub">紹介：${esc(r.referrer)}</div>`:''}
    ${r.memo?`<div class="card-sub">${esc(r.memo)}</div>`:''}
  </article>`;
}
function toggleListFilters(force){
  const panel=$('listFilterPanel');
  const btn=$('listFilterToggle');
  if(!panel)return;
  const open=typeof force==='boolean'?force:panel.classList.contains('filters-collapsed');
  panel.classList.toggle('filters-collapsed',!open);
  if(btn){
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.innerHTML=filterToggleMarkup(open);
  }
}
function clearListFilters(){
  const values={listSearch:'',listSource:'',listMemberType:'',listSupportRank:'',listLocation:'',listPriority:'',listSort:'default',listDateFrom:'',listDateTo:''};
  Object.entries(values).forEach(([id,val])=>{const el=$(id);if(el)el.value=val;});
  ['listUnvisited','listVisited','listGood','listAbsent','listRevisit','listRefused','listWarning','listFollow','listFollowPending','listPosterRequest','listPosterPending'].forEach(id=>{const el=$(id);if(el)el.checked=false;});
  renderLists();
}
function renderLists(){
  const q=($('listSearch')?.value||'').trim().toLowerCase();
  const source=$('listSource')?.value||'',memberType=$('listMemberType')?.value||'',supportRank=$('listSupportRank')?.value||'',location=$('listLocation')?.value||'',priority=$('listPriority')?.value||'',sort=$('listSort')?.value||'default',dateFrom=$('listDateFrom')?.value||'',dateTo=$('listDateTo')?.value||'';
  const unvisited=!!$('listUnvisited')?.checked,visitedFilter=!!$('listVisited')?.checked,goodFilter=!!$('listGood')?.checked,absentFilter=!!$('listAbsent')?.checked,revisit=!!$('listRevisit')?.checked,refused=!!$('listRefused')?.checked,warning=!!$('listWarning')?.checked;
  const follow=!!$('listFollow')?.checked,followPending=!!$('listFollowPending')?.checked,poster=!!$('listPosterRequest')?.checked,posterPending=!!$('listPosterPending')?.checked;
  const statusFilters=[];if(unvisited)statusFilters.push('unvisited');if(visitedFilter)statusFilters.push('visited');if(goodFilter)statusFilters.push('good');if(absentFilter)statusFilters.push('absent');if(revisit)statusFilters.push('revisit');if(refused)statusFilters.push('refused');
  const filtered=records.filter(r=>{
    if(currentAreaId&&String(r.areaId||'')!==String(currentAreaId))return false;
    if(q&&![r.personName,r.fullAddress,r.phone,r.email,r.partyId,r.sourceBranch,r.referrer,r.memo,r.followMemo,r.posterRequestMemo].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(source&&String(r.source||'manual')!==source)return false;
    if(memberType&&String(r.memberType||'general')!==memberType)return false;
    const rank=supportRankValue(r.supporter);
    if(supportRank==='unranked'&&rank)return false;
    if(supportRank&&supportRank!=='unranked'&&rank!==supportRank)return false;
    const located=!!(Number(r.lat)&&Number(r.lng));
    if(location==='located'&&!located)return false;
    if(location==='unlocated'&&located)return false;
    if(priority&&String(r.revisitPriority||'')!==priority)return false;
    const d=String(r.date||'').slice(0,10); if(dateFrom&&(!d||d<dateFrom))return false; if(dateTo&&(!d||d>dateTo))return false;
    if(statusFilters.length&&!statusFilters.includes(statusKey(r.status)))return false;
    if(warning&&!boolValue(r.warning))return false;
    if(follow&&!hasFollow(r))return false;
    if(followPending&&(!hasFollow(r)||boolValue(r.followDone)))return false;
    if(poster&&!boolValue(r.posterRequest))return false;
    if(posterPending&&(!boolValue(r.posterRequest)||boolValue(r.posterReported)))return false;
    return true;
  });
  const priorityScore=v=>v==='◎高'?3:v==='○中'?2:v==='△低'?1:0;
  if(sort==='priority')filtered.sort((a,b)=>priorityScore(b.revisitPriority)-priorityScore(a.revisitPriority));
  if(sort==='date_desc')filtered.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  if(sort==='date_asc')filtered.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
  $('listCards').innerHTML=filtered.map(recordCard).join('')||'<div class="panel notice">該当データはありません。</div>';
}

function normalizeTownName(name){
  const digitMap={'０':'0','１':'1','２':'2','３':'3','４':'4','５':'5','６':'6','７':'7','８':'8','９':'9'};
  const kanjiMap={'〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
  let s=String(name||'').replace(/[０-９]/g,c=>digitMap[c]||c);
  s=s.replace(/([〇一二三四五六七八九十]+)丁目/g,(all,n)=>{
    let v=0;
    if(n.includes('十')){
      const parts=n.split('十');
      v=(parts[0]?kanjiMap[parts[0]]:1)*10+(parts[1]?kanjiMap[parts[1]]:0);
    }else{
      v=[...n].reduce((a,c)=>a*10+(kanjiMap[c]??0),0);
    }
    return `${v}丁目`;
  });
  return s;
}
function townKey(address){
  const s=String(address||'').replace(/\s+/g,'');if(!s)return'住所未設定';
  const m=s.match(/(?:東区|博多区|中央区|南区|城南区|早良区|西区)(.+?丁目)/);if(m)return normalizeTownName(m[1]);
  const m2=s.match(/(?:東区|博多区|中央区|南区|城南区|早良区|西区)([^0-9０-９\-－ー番地号]+?)(?=[0-9０-９]|$)/);if(m2&&m2[1])return normalizeTownName(m2[1]);
  return normalizeTownName(s.replace(/^.*?(?:東区|博多区|中央区|南区|城南区|早良区|西区)/,'').slice(0,12)||'その他');
}
function clearListChecks(){
  ['listUnvisited','listVisited','listGood','listAbsent','listRevisit','listRefused','listWarning','listFollow','listFollowPending','listPosterRequest','listPosterPending'].forEach(id=>{if($(id))$(id).checked=false});
}
function analysisGo(kind){
  if($('listSource'))$('listSource').value='';if($('listMemberType'))$('listMemberType').value='';if($('listSupportRank'))$('listSupportRank').value='';if($('listLocation'))$('listLocation').value='';if($('listPriority'))$('listPriority').value='';if($('listSort'))$('listSort').value='default';clearListChecks();
  if(kind==='unlocated')$('listLocation').value='unlocated';
  if(kind==='revisit')$('listRevisit').checked=true;
  if(kind==='unvisited')$('listUnvisited').checked=true;
  if(kind==='warning')$('listWarning').checked=true;
  if(kind==='party')$('listMemberType').value='party_member';
  if(kind==='supporter')$('listMemberType').value='supporter';
  if(kind==='rankA')$('listSupportRank').value='A';
  if(kind==='rankB')$('listSupportRank').value='B';
  if(kind==='rankC')$('listSupportRank').value='C';
  if(kind==='rankUnranked')$('listSupportRank').value='unranked';
  if(kind==='follow')$('listFollow').checked=true;
  if(kind==='followPending')$('listFollowPending').checked=true;
  if(kind==='posterRequest')$('listPosterRequest').checked=true;
  if(kind==='posterPending')$('listPosterPending').checked=true;
  if(kind==='priorityHigh')$('listPriority').value='◎高'; if(kind==='priorityMedium')$('listPriority').value='○中'; if(kind==='priorityLow')$('listPriority').value='△低';
  showView('list',{fromAnalysis:true});renderLists();
}
async function loadBranchMessages(){
  try{
    const d=await api('listBranchMessages',{limit:5});
    branchMessages=d.messages||[];
    if(!$('view-analysis')?.classList.contains('hidden'))renderAnalysis();
  }catch(e){
    console.warn('支部連絡の取得:',e.message);
    branchMessages=[];
  }
}
function branchName(id){
  if(String(id)==='all')return '全支部';
  return branches.find(b=>String(b.branchId)===String(id))?.name||'支部';
}
function formatMessageDate(v){
  if(!v)return'';
  const d=new Date(v);if(isNaN(d))return String(v);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function canManageBranchMessage(m){
  return !!session&&(session.role==='system_admin'||String(m.createdBy||'')===String(session.userId||''));
}
function renderBranchMessages(){
  if(!branchMessages.length)return '<div class="branch-message-empty">連絡はまだありません。</div>';
  return branchMessages.slice(0,5).map(m=>`<article class="branch-message-item">
    <div class="branch-message-top"><b>${esc(m.title||'連絡')}</b><time>${esc(formatMessageDate(m.createdAt))}</time></div>
    <div class="branch-message-route">${esc(branchName(m.fromBranchId))}</div>
    <div class="branch-message-body">${esc(m.body)}</div>
    <div class="branch-message-footer">
      <div class="branch-message-author">${esc(m.createdByName||'')}</div>
      ${canManageBranchMessage(m)?`<div class="branch-message-actions"><button type="button" onclick="openBranchMessageModal('${esc(m.messageId)}')">✏️ 編集</button><button type="button" class="danger" onclick="deleteBranchMessage('${esc(m.messageId)}')">🗑️ 削除</button></div>`:''}
    </div>
  </article>`).join('');
}
function openBranchMessageModal(messageId=''){
  const modal=$('branchMessageModal');if(!modal)return;
  const m=messageId?branchMessages.find(x=>String(x.messageId)===String(messageId)):null;
  $('branchMessageId').value=m?.messageId||'';
  $('branchMessageModalTitle').textContent=m?'📣 支部連絡を編集':'📣 支部連絡を追加';
  $('branchMessageTitle').value=m?.title||'';
  $('branchMessageBody').value=m?.body||'';
  $('branchMessageSaveBtn').textContent=m?'変更を保存':'連絡を追加';
  modal.style.display='flex';
}
function closeBranchMessageModal(){$('branchMessageModal').style.display='none'}
async function saveBranchMessage(){
  const btn=$('branchMessageSaveBtn'),messageId=$('branchMessageId')?.value||'';
  try{
    if(btn){btn.disabled=true;btn.textContent=messageId?'保存中…':'送信中…'}
    await api('saveBranchMessage',{message:{messageId,title:$('branchMessageTitle').value.trim(),body:$('branchMessageBody').value.trim()}});
    closeBranchMessageModal();await loadBranchMessages();renderAnalysis();
  }catch(e){alert(e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent=messageId?'変更を保存':'連絡を追加'}}
}
async function deleteBranchMessage(messageId){
  if(!confirm('この支部連絡を削除しますか？'))return;
  try{
    await api('deleteBranchMessage',{messageId});
    await loadBranchMessages();renderAnalysis();
  }catch(e){alert(e.message)}
}

function renderAnalysis(){
  const total=records.length,countStatus=k=>records.filter(r=>statusKey(r.status)===k).length;
  const unvisited=countStatus('unvisited'),visitedStatus=countStatus('visited'),handshake=countStatus('good'),absent=countStatus('absent'),refused=countStatus('refused');
  const revisit=countStatus('revisit'),warning=records.filter(r=>boolValue(r.warning)).length;
  const priorityHigh=records.filter(r=>String(r.revisitPriority||'')==='◎高').length,priorityMedium=records.filter(r=>String(r.revisitPriority||'')==='○中').length,priorityLow=records.filter(r=>String(r.revisitPriority||'')==='△低').length;
  // 進捗上の「訪問済み」は未訪問以外のユニーク件数。
  // ステータス別カードの「訪問済」は visited そのものだけを数え、二重計上しない。
  const visited=Math.max(0,total-unvisited),unlocated=records.filter(r=>!(Number(r.lat)&&Number(r.lng))).length;
  const follow=records.filter(hasFollow),followPending=follow.filter(r=>!boolValue(r.followDone)).length;
  const poster=records.filter(r=>boolValue(r.posterRequest)),posterPending=poster.filter(r=>!boolValue(r.posterReported)).length;
  const party=records.filter(r=>r.memberType==='party_member').length,supporter=records.filter(r=>r.memberType==='supporter').length;
  const rankA=records.filter(r=>supportRankValue(r.supporter)==='A').length,rankB=records.filter(r=>supportRankValue(r.supporter)==='B').length,rankC=records.filter(r=>supportRankValue(r.supporter)==='C').length,rankUnranked=records.filter(r=>!supportRankValue(r.supporter)).length;
  const visitRate=total?Math.round(visited/total*100):0;
  const towns={};
  records.forEach(r=>{const k=townKey(r.fullAddress);if(!towns[k])towns[k]={total:0,visited:0,unvisited:0,revisit:0};const t=towns[k];t.total++;const st=statusKey(r.status);if(st==='unvisited')t.unvisited++;else t.visited++;if(isRevisit(r))t.revisit++});
  const townRows=Object.entries(towns).sort((a,b)=>b[1].unvisited-a[1].unvisited).slice(0,10).map(([name,t])=>{const rate=t.total?Math.round(t.visited/t.total*100):0;return `<div class="analysis-town-row"><div class="analysis-town-main"><b>${esc(name)}</b><span>${t.total}件</span></div><div class="analysis-town-stats"><span>未訪問 ${t.unvisited}</span><span>再訪予定 ${t.revisit}</span><span>進捗 ${rate}%</span></div><div class="analysis-bar"><div class="analysis-bar-fill" style="width:${rate}%"></div></div></div>`}).join('');
  const action=(kind,label,value,detail)=>`<button class="analysis-action analysis-clickable" onclick="analysisGo('${kind}')"><span class="analysis-action-value">${value}</span><span class="analysis-action-label">${esc(label)}</span><span class="analysis-action-sub">${esc(detail)}</span><span class="analysis-link-hint">一覧を見る →</span></button>`;
  const metric=(label,value)=>`<div class="analysis-metric"><div class="analysis-value">${value}</div><div class="analysis-label">${esc(label)}</div></div>`;
  const el=$('analysisContent');if(!el)return;
  el.innerHTML=`
  <div class="panel activity-section branch-messages-section">
    <div class="section-heading branch-message-heading">
      <div class="heading-icon orange activity-icon">📣</div>
      <div><h2>支部連絡</h2><p>支部間の連絡・共有事項（最新5件）</p></div>
      <button type="button" class="btn branch-message-add" onclick="openBranchMessageModal()">＋ 連絡を追加</button>
    </div>
    <div class="branch-message-list">${renderBranchMessages()}</div>
  </div>

  <div class="panel activity-section priority-section">
    <div class="section-heading"><div class="heading-icon orange activity-icon">⚡</div><div><h2>対応が必要</h2><p>次に確認・対応する項目</p></div></div>
    <div class="analysis-action-group-label">訪問対応</div>
    <div class="analysis-actions">
      ${action('revisit','再訪予定',revisit,'もう一度訪問する')}
      ${action('priorityHigh','優先度 高',priorityHigh,'優先して確認する')}
      ${action('priorityMedium','優先度 中',priorityMedium,'次に確認する')}
      ${action('priorityLow','優先度 低',priorityLow,'余裕がある時に確認')}
      ${action('warning','訪問注意',warning,'訪問前に注意事項を確認')}
    </div>
    <div class="analysis-action-group-label">フォロー・報告</div>
    <div class="analysis-actions">
      ${action('followPending','フォロー未対応',followPending,'党員・サポーター希望など')}
      ${action('posterRequest','ポスター依頼',poster.length,'掲示依頼を確認')}
      ${action('posterPending','ポスター未報告',posterPending,'党への報告が必要')}
    </div>
  </div>

  <div class="panel activity-section">
    <div class="section-heading"><div class="heading-icon green activity-icon">🚶</div><div><h2>訪問状況</h2><p>${visited} / ${total}件 訪問済み　進捗 ${visitRate}%</p></div></div>
    <div class="analysis-progress-head"><b>訪問進捗</b><span>${visitRate}%</span></div><div class="analysis-bar"><div class="analysis-bar-fill" style="width:${visitRate}%"></div></div>
    <div class="analysis-grid visit-status-grid">
      <button class="analysis-metric analysis-clickable" onclick="analysisGo('unvisited')"><div class="analysis-value">${unvisited}</div><div class="analysis-label">未訪問</div><span class="analysis-link-hint">一覧を見る →</span></button>
      ${metric('訪問済',visitedStatus)}
      ${metric('手応え',handshake)}
      ${metric('不在',absent)}
      <button class="analysis-metric analysis-clickable" onclick="analysisGo('revisit')"><div class="analysis-value">${revisit}</div><div class="analysis-label">再訪予定</div><span class="analysis-link-hint">一覧を見る →</span></button>
      ${metric('断られた',refused)}
    </div>
  </div>

  <div class="panel activity-section support-rank-section"><div class="section-heading"><div class="heading-icon orange activity-icon">🎯</div><div><h2>支持ランク</h2><p>訪問結果とは別に、現在の支持状況を管理</p></div></div>
    <div class="analysis-grid support-rank-grid">
      <button class="analysis-metric analysis-clickable" onclick="analysisGo('rankA')"><div class="analysis-value">${rankA}</div><div class="analysis-label">A 強い支持</div><span class="analysis-link-hint">一覧を見る →</span></button>
      <button class="analysis-metric analysis-clickable" onclick="analysisGo('rankB')"><div class="analysis-value">${rankB}</div><div class="analysis-label">B 支持・好感</div><span class="analysis-link-hint">一覧を見る →</span></button>
      <button class="analysis-metric analysis-clickable" onclick="analysisGo('rankC')"><div class="analysis-value">${rankC}</div><div class="analysis-label">C 接触済・未確定</div><span class="analysis-link-hint">一覧を見る →</span></button>
      <button class="analysis-metric analysis-clickable" onclick="analysisGo('rankUnranked')"><div class="analysis-value">${rankUnranked}</div><div class="analysis-label">未判定</div><span class="analysis-link-hint">一覧を見る →</span></button>
    </div>
  </div>

  <div class="panel"><div class="section-heading"><div class="heading-icon orange activity-icon">🤝</div><div><h2>つながり</h2><p>党員・サポーター・フォロー状況</p></div></div>
    <div class="analysis-grid"><button class="analysis-metric analysis-clickable" onclick="analysisGo('party')"><div class="analysis-value">${party}</div><div class="analysis-label">党員</div><span class="analysis-link-hint">一覧を見る →</span></button><button class="analysis-metric analysis-clickable" onclick="analysisGo('supporter')"><div class="analysis-value">${supporter}</div><div class="analysis-label">サポーター</div><span class="analysis-link-hint">一覧を見る →</span></button><button class="analysis-metric analysis-clickable" onclick="analysisGo('follow')"><div class="analysis-value">${follow.length}</div><div class="analysis-label">フォロー対象</div><span class="analysis-link-hint">一覧を見る →</span></button>${metric('ポスター依頼',poster.length)}${metric('位置未取得',unlocated)}</div>
  </div>
  <div class="panel"><div class="section-heading"><div class="heading-icon green activity-icon">🗺️</div><div><h2>町丁目別の進捗</h2><p>未訪問が多い地域から表示</p></div></div><div class="analysis-town-list">${townRows||'<div class="notice">住所データがありません。</div>'}</div></div>`;
}
function updateScrollTopFloating(){
  const mobile=window.matchMedia('(max-width:700px)').matches;
  const show=mobile&&window.scrollY>420;
  const listVisible=!$('view-list')?.classList.contains('hidden');
  const analysisVisible=!$('view-analysis')?.classList.contains('hidden');
  $('listScrollTopFloating')?.classList.toggle('hidden',!(show&&listVisible));
  $('analysisScrollTopFloating')?.classList.toggle('hidden',!(show&&analysisVisible));
}
window.addEventListener('scroll',updateScrollTopFloating,{passive:true});
window.addEventListener('resize',updateScrollTopFloating);

function showView(v,opts={}){
  ['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x)?.classList.toggle('hidden',x!==v));
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  const backButtons=[$('listBackToAnalysis'),$('listBackToAnalysisFloating')].filter(Boolean);
  const fromAnalysis=v==='list'&&!!opts.fromAnalysis;
  backButtons.forEach(back=>back.classList.toggle('hidden',!fromAnalysis));
  if(v==='analysis')renderAnalysis();
  if(v==='list')setTimeout(()=>toggleListFilters(false),0);
  if(v==='map')setTimeout(()=>{if(map&&typeof map.invalidateSize==='function')map.invalidateSize();},100);
  setTimeout(updateScrollTopFloating,0);
}
