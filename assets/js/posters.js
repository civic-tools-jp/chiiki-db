"use strict";

const POSTER_STATUS={
  requested:{label:'依頼中',mark:'🟡'},
  posted:{label:'掲示済',mark:'🪧'},
  replace:{label:'貼替え必要',mark:'🔄'},
  removed:{label:'撤去',mark:'⚪'},
  refused:{label:'断られた',mark:'×'}
};

async function loadPosters(){
  try{
    const d=await api('listPosters',{areaId:currentAreaId});
    posters=d.posters||[];
    renderPosters();
    if(map)renderMarkers();
  }catch(e){
    msg('appMsg',e.message);
  }
}

function posterStatusInfo(v){return POSTER_STATUS[v]||POSTER_STATUS.requested}

function renderPosters(){
  const el=$('posterCards');if(!el)return;
  const list=posters.filter(p=>!currentAreaId||String(p.areaId||'')===String(currentAreaId));
  el.innerHTML=list.length?list.map(p=>{
    const st=posterStatusInfo(p.status);
    return `<div class="card poster-card" onclick='openPoster(${JSON.stringify(p).replace(/'/g,"&#39;")},false)'>
      <div class="card-title">${st.mark} ${esc(p.placeName||p.fullAddress||'ポスター')} <span class="badge">${esc(st.label)}</span></div>
      <div class="card-sub">${esc(p.fullAddress||'住所未設定')}</div>
      ${p.ownerName?`<div class="card-sub">協力者：${esc(p.ownerName)}</div>`:''}
      ${p.phone?`<div class="card-sub">☎ ${esc(p.phone)}</div>`:''}
      <div class="badges">
        ${boolValue(p.replaceNeeded)?'<span class="badge warning-soft">🔄 貼替え必要</span>':''}
        ${p.postedAt?`<span class="badge">掲示 ${esc(formatShortDate(p.postedAt))}</span>`:''}
        ${p.checkedAt?`<span class="badge">確認 ${esc(formatShortDate(p.checkedAt))}</span>`:''}
      </div>
      ${p.memo?`<div class="card-sub">${esc(p.memo)}</div>`:''}
    </div>`;
  }).join(''):'<div class="panel notice">この活動エリアのポスター情報はまだありません。</div>';
}

function newPoster(){
  openPoster({posterId:'',areaId:currentAreaId,status:'requested',placeName:'',fullAddress:'',lat:'',lng:'',ownerName:'',phone:'',postedAt:'',checkedAt:'',replaceNeeded:false,memo:''},true);
}

function openPoster(p,isNew=false){
  editingPoster={...p,isNew};
  $('posterId').value=p.posterId||'';
  $('posterStatus').value=p.status||'requested';
  $('posterPlaceName').value=p.placeName||'';
  $('posterAddress').value=p.fullAddress||'';
  $('posterLat').value=p.lat||'';
  $('posterLng').value=p.lng||'';
  $('posterOwnerName').value=p.ownerName||'';
  $('posterPhone').value=p.phone||'';
  $('posterPostedAt').value=dateInputValue(p.postedAt);
  $('posterCheckedAt').value=dateInputValue(p.checkedAt);
  $('posterReplaceNeeded').checked=boolValue(p.replaceNeeded)||p.status==='replace';
  $('posterMemo').value=p.memo||'';
  $('deletePosterRow').classList.toggle('hidden',!p.posterId);
  $('posterModal').style.display='flex';
}

function closePoster(){$('posterModal').style.display='none';editingPoster=null}

async function geocodePosterAddress(){
  const address=String($('posterAddress').value||'').trim();
  if(!address){alert('住所を入力してください');return}
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(address)}`);
    const data=await res.json();
    if(!data[0]){alert('住所から位置を取得できませんでした');return}
    const lat=Number(data[0].lat),lng=Number(data[0].lon);
    $('posterLat').value=lat;$('posterLng').value=lng;
    if(map)map.setView([lat,lng],17);
    alert('位置を取得しました。保存してください。');
  }catch(_){alert('位置取得に失敗しました')}
}

function posterFromCurrentLocation(){
  if(!navigator.geolocation){alert('この端末では現在地を取得できません');return}
  navigator.geolocation.getCurrentPosition(async p=>{
    const lat=p.coords.latitude,lng=p.coords.longitude;
    $('posterLat').value=lat;$('posterLng').value=lng;
    const address=await reverseAddress(lat,lng);
    if(address)$('posterAddress').value=address;
    if(map)map.setView([lat,lng],18);
  },()=>alert('現在地を取得できませんでした'),{enableHighAccuracy:true,timeout:12000});
}

function openPosterGoogleMaps(){
  const lat=Number($('posterLat')?.value),lng=Number($('posterLng')?.value);
  const address=String($('posterAddress')?.value||'').trim();
  let q='';
  if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat&&lng)q=`${lat},${lng}`;
  else if(address)q=address;
  else {alert('住所または位置を入力してください');return}
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,'_blank','noopener');
}

async function savePoster(){
  const btn=$('savePosterBtn');
  try{
    if(btn){btn.disabled=true;btn.textContent='保存中…'}
    const status=$('posterReplaceNeeded').checked?'replace':$('posterStatus').value;
    const poster={
      posterId:$('posterId').value,
      areaId:currentAreaId,
      status,
      placeName:$('posterPlaceName').value.trim(),
      fullAddress:$('posterAddress').value.trim(),
      lat:$('posterLat').value,
      lng:$('posterLng').value,
      ownerName:$('posterOwnerName').value.trim(),
      phone:$('posterPhone').value.trim(),
      postedAt:$('posterPostedAt').value,
      checkedAt:$('posterCheckedAt').value,
      replaceNeeded:$('posterReplaceNeeded').checked,
      memo:$('posterMemo').value.trim(),
      updatedAt:editingPoster?.updatedAt||''
    };
    await api('savePoster',{poster});
    closePoster();await loadPosters();
  }catch(e){alert(e.message||String(e))}
  finally{if(btn){btn.disabled=false;btn.textContent='保存'}}
}

async function deletePoster(){
  if(!editingPoster?.posterId){closePoster();return}
  if(!confirm('このポスター情報を削除しますか？'))return;
  try{
    await api('deletePoster',{posterId:editingPoster.posterId,updatedAt:editingPoster.updatedAt||''});
    closePoster();await loadPosters();
  }catch(e){alert(e.message)}
}

function posterMapIcon(p){
  const replace=boolValue(p.replaceNeeded)||p.status==='replace';
  return L.divIcon({
    className:'',
    html:`<div class="poster-map-pin">${replace?'🔄':'🪧'}</div>`,
    iconSize:[34,34],iconAnchor:[17,28]
  });
}
