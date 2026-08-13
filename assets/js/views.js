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
    if(currentAreaId&&String(r.areaId||'')!==String(currentAreaId))return false;
    if(q && ![r.personName,r.fullAddress,r.phone,r.email,r.partyId,r.sourceBranch,r.referrer,r.memo].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(source && String(r.source||'manual')!==source)return false;
    if(memberType && String(r.memberType||'general')!==memberType)return false;
    const located=r.lat!==''&&r.lat!=null&&r.lng!==''&&r.lng!=null&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lng))&&!!Number(r.lat)&&!!Number(r.lng);
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
      <div class="badges"><span class="badge">${esc(memberTypeLabel(mt))}</span><span class="badge">${esc(sourceLabel[r.source]||'手入力')}</span><span class="badge">${(session?.role==='member'&&['party_member','supporter'].includes(mt))
  ? (r.locationConfirmed?'🔒位置確認済':'⚠️位置未確認')
  : (located?'📍位置取得済':'⚠️位置未取得')}</span>${r.partyId?`<span class="badge">ID ${esc(r.partyId)}</span>`:''}</div>
      ${r.phone?`<div class="muted">☎ ${esc(r.phone)}</div>`:''}
    </div>`;
  });
  $('listCards').innerHTML=html.join('')||'<div class="panel notice">該当データはありません。</div>';
}
function townKey(address){
  const s=String(address||'').replace(/\s+/g,'');
  if(!s)return'住所未設定';
  const ward=s.match(/東区(.+?丁目)/);
  if(ward)return ward[1];
  const ward2=s.match(/東区([^0-9\-－ー番地号]+?)(?=\d|$)/);
  if(ward2&&ward2[1])return ward2[1];
  return s.replace(/^.*?東区/,'').slice(0,12)||'その他';
}
function analysisGo(kind){
  if($('listSource'))$('listSource').value='';
  if($('listMemberType'))$('listMemberType').value='';
  if($('listLocation'))$('listLocation').value='';
  ['listRevisit','listUnvisited','listRefused','listWarning'].forEach(id=>{if($(id))$(id).checked=false});
  if(kind==='unlocated')$('listLocation').value='unlocated';
  if(kind==='revisit')$('listRevisit').checked=true;
  if(kind==='unvisited')$('listUnvisited').checked=true;
  if(kind==='warning')$('listWarning').checked=true;
  if(kind==='party')$('listMemberType').value='party_member';
  if(kind==='supporter')$('listMemberType').value='supporter';
  if(kind==='import')$('listSource').value='import';
  showView('list');renderLists();
}
function renderAnalysis(){
  const total=records.length;
  const countStatus=k=>records.filter(r=>statusKey(r.status)===k).length;
  const unvisited=countStatus('unvisited');
  const visited=countStatus('visited')+countStatus('good')+countStatus('absent')+countStatus('revisit')+countStatus('refused');
  const revisit=records.filter(r=>isRevisit(r)).length;
  const refused=countStatus('refused');
  const warning=records.filter(r=>boolValue(r.warning)).length;
  const unlocated=records.filter(r=>!(Number(r.lat)&&Number(r.lng))).length;
  const party=records.filter(r=>r.memberType==='party_member').length;
  const supporter=records.filter(r=>r.memberType==='supporter').length;
  const general=records.filter(r=>(r.memberType||'general')==='general').length;
  const imported=records.filter(r=>r.source==='import').length;
  const manual=records.filter(r=>(r.source||'manual')==='manual').length;
  const mapped=records.filter(r=>r.source==='map').length;
  const visitRate=total?Math.round(visited/total*100):0;

  const towns={};
  records.forEach(r=>{
    const k=townKey(r.fullAddress);
    if(!towns[k])towns[k]={total:0,visited:0,unvisited:0,revisit:0,unlocated:0};
    const t=towns[k];t.total++;
    const st=statusKey(r.status);
    if(st==='unvisited')t.unvisited++;else t.visited++;
    if(isRevisit(r))t.revisit++;
    if(!(Number(r.lat)&&Number(r.lng)))t.unlocated++;
  });
  const townRows=Object.entries(towns).sort((a,b)=>b[1].unvisited-a[1].unvisited||b[1].total-a[1].total).slice(0,12).map(([name,t])=>{
    const rate=t.total?Math.round(t.visited/t.total*100):0;
    return `<div class="analysis-town-row">
      <div class="analysis-town-main"><b>${esc(name)}</b><span>${t.total}件</span></div>
      <div class="analysis-town-stats"><span>未訪問 ${t.unvisited}</span><span>再訪 ${t.revisit}</span><span>位置未取得 ${t.unlocated}</span><span>進捗 ${rate}%</span></div>
      <div class="analysis-bar"><div class="analysis-bar-fill" style="width:${rate}%"></div></div>
    </div>`;
  }).join('');

  const action=(kind,label,value,detail)=>`<button class="analysis-action" onclick="analysisGo('${kind}')"><span class="analysis-action-value">${value}</span><span class="analysis-action-label">${esc(label)}</span><span class="analysis-action-sub">${esc(detail)}</span></button>`;
  const metric=(label,value)=>`<div class="analysis-metric"><div class="analysis-value">${value}</div><div class="analysis-label">${esc(label)}</div></div>`;

  const el=$('analysisContent');if(!el)return;
  el.innerHTML=`
    <div class="panel">
      <div class="card-title">今日の優先対応</div>
      <div class="analysis-actions">
        ${action('revisit','要再訪',revisit,'先に回る候補')}
        ${action('unvisited','未訪問',unvisited,'まだ接触していない')}
        ${action('unlocated','位置未取得',unlocated,'住所確認・位置再取得')}
        ${action('warning','訪問注意',warning,'訪問前に確認')}
      </div>
    </div>

    <div class="panel">
      <div class="card-title">活動の進捗</div>
      <div class="analysis-progress-head"><b>${visited} / ${total}件</b><span>訪問進捗 ${visitRate}%</span></div>
      <div class="analysis-bar analysis-bar-large"><div class="analysis-bar-fill" style="width:${visitRate}%"></div></div>
      <div class="analysis-grid">
        ${metric('全登録',total)}${metric('訪問済等',visited)}${metric('断られた',refused)}
      </div>
    </div>

    <div class="panel">
      <div class="card-title">対象者</div>
      <div class="analysis-grid clickable">
        <button onclick="analysisGo('party')" class="analysis-metric">${metric('党員',party).replace(/^<div class="analysis-metric">|<\/div>$/g,'')}</button>
        <button onclick="analysisGo('supporter')" class="analysis-metric">${metric('サポーター',supporter).replace(/^<div class="analysis-metric">|<\/div>$/g,'')}</button>
        ${metric('一般',general)}
      </div>
    </div>

    <div class="panel">
      <div class="card-title">登録方法</div>
      <div class="analysis-grid">
        ${metric('名簿取込',imported)}${metric('手入力',manual)}${metric('地図登録',mapped)}
      </div>
    </div>

    <div class="panel">
      <div class="card-title">町丁目別の進捗</div>
      <div class="notice">未訪問が多い地域から表示しています。</div>
      <div class="analysis-town-list">${townRows||'<div class="notice">住所データがありません。</div>'}</div>
    </div>`;
}
function showView(v){['map','list','contacts','analysis','admin'].forEach(x=>$('view-'+x).classList.toggle('hidden',x!==v));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='analysis')renderAnalysis();if(v==='map')setTimeout(()=>{if(typeof map!=='undefined'&&map&&typeof map.invalidateSize==='function')map.invalidateSize()},100)}
