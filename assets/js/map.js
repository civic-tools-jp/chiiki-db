"use strict";

function normalizeJapaneseAddress(data){
  const a=data?.address||{};
  const prefecture=a.province||a.state||a.region||'';
  const city=a.city||a.town||a.village||a.municipality||'';
  const ward=a.city_district||a.suburb||a.borough||'';
  const neighbourhood=a.neighbourhood||a.quarter||'';
  const road=a.road||a.pedestrian||'';
  const house=a.house_number||'';

  // Nominatimのdisplay_nameをそのまま保存せず、日本向けに必要部分だけ組み立てる。
  let parts=[];
  [prefecture,city,ward,neighbourhood,road,house].forEach(v=>{
    v=String(v||'').trim();
    if(v&&!parts.includes(v))parts.push(v);
  });
  let s=parts.join('');
  s=s.replace(/福岡県福岡市東区福岡市東区/g,'福岡県福岡市東区');
  return s || String(data?.display_name||'')
    .split(',').map(x=>x.trim())
    .filter(x=>x&&!/^日本$/.test(x)&&!/^〒?\d{3}-?\d{4}$/.test(x))
    .reverse().join('');
}
async function reverseAddress(lat,lng){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}&accept-language=ja`);
    return normalizeJapaneseAddress(await r.json());
  }catch(_){return ''}
}
async function fillAddressFromCurrentLocation(){
  if(!navigator.geolocation){alert('この端末では現在地を取得できません');return}
  navigator.geolocation.getCurrentPosition(async p=>{
    const lat=p.coords.latitude,lng=p.coords.longitude;
    $('lat').value=lat;$('lng').value=lng;
    const address=await reverseAddress(lat,lng);
    if(address)$('fullAddress').value=address;
    if(map)map.setView([lat,lng],18);
  },()=>alert('現在地を取得できませんでした'),{enableHighAccuracy:true,timeout:12000});
}
function openRecordGoogleMaps(){
  const lat=Number($('lat')?.value),lng=Number($('lng')?.value);
  const address=String($('fullAddress')?.value||'').trim();
  let q='';
  if(Number.isFinite(lat)&&Number.isFinite(lng)&&lat&&lng)q=`${lat},${lng}`;
  else if(address)q=address;
  else {alert('住所または現在地を入力してください');return}
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,'_blank','noopener');
}

function initMap(){if(map)return;map=L.map('map').setView([33.5902,130.4017],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);map.on('click',async e=>{const address=await reverseAddress(e.latlng.lat,e.latlng.lng);openEdit({id:'',lat:e.latlng.lat,lng:e.latlng.lng,fullAddress:address,status:'unvisited',type:'戸建て',date:today(),source:'map',memberType:'general'},true)});setTimeout(()=>map.invalidateSize(),100)}
function priorityBadge(memberType){return memberType==='party_member'?'⭐':memberType==='supporter'?'🟠':''}
function recordMemberType(r){return r.memberType||'general'}
function icon(r){
  const key=statusKey(r.status),c=STATUS[key].color,b=priorityBadge(recordMemberType(r));
  const w=boolValue(r.warning)?'⚠️':'',x=key==='refused'?'×':'';
  return L.divIcon({className:'',html:`<div class="pin-wrap"><div class="pin" style="background:${c}"></div>${b?`<div class="pin-priority">${b}</div>`:''}${w?`<div class="pin-warning">${w}</div>`:''}${x?`<div class="pin-refused">${x}</div>`:''}</div>`,iconSize:[36,36],iconAnchor:[11,22]})
}
function contactIcon(c){const b=priorityBadge(c.memberType);return L.divIcon({className:'',html:`<div class="contact-pin ${c.memberType==='party_member'?'member':'support'}">${b||'○'}</div>`,iconSize:[30,30],iconAnchor:[15,15]})}
function renderMarkers(){
  if(!map)return;
  Object.values(markers).forEach(m=>map.removeLayer(m));
  markers={};
  const pts=[];

  // 同じグループ内は OR、グループ間は AND
  const memberFilters=[];
  if($('filterParty')?.checked)memberFilters.push('party_member');
  if($('filterSupporter')?.checked)memberFilters.push('supporter');

  const statusFilters=[];
  if($('filterUnvisited')?.checked)statusFilters.push('unvisited');
  if($('filterVisited')?.checked)statusFilters.push('visited');
  if($('filterGood')?.checked)statusFilters.push('good');
  if($('filterAbsent')?.checked)statusFilters.push('absent');
  if($('filterRevisit')?.checked)statusFilters.push('revisit');
  if($('filterRefused')?.checked)statusFilters.push('refused');

  const warningOnly=!!$('filterWarning')?.checked;

  records.forEach(r=>{
    const mt=recordMemberType(r),key=statusKey(r.status);
    if(memberFilters.length&&!memberFilters.includes(mt))return;
    if(statusFilters.length&&!statusFilters.includes(key))return;
    if(warningOnly&&!boolValue(r.warning))return;
    if(!Number.isFinite(Number(r.lat))||!Number.isFinite(Number(r.lng)))return;

    const marker=L.marker([+r.lat,+r.lng],{icon:icon(r)}).addTo(map).on('click',()=>openEdit(r,false));
    const extras=[
      priorityBadge(mt),
      r.personName||r.fullAddress||'訪問先',
      key==='refused'?'×断られた':'',
      boolValue(r.warning)?'⚠️訪問注意':''
    ].filter(Boolean).join(' ');
    marker.bindTooltip(extras);
    markers['r_'+r.id]=marker;pts.push([+r.lat,+r.lng]);
  });

  if(pts.length>1)map.fitBounds(pts,{padding:[25,25],maxZoom:17});
  else if(pts.length===1)map.setView(pts[0],17);
}
async function searchMap(){const q=$('searchText').value.trim();if(!q)return;try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);const j=await r.json();if(j[0])map.setView([+j[0].lat,+j[0].lon],17);else alert('見つかりませんでした')}catch(_){alert('検索に失敗しました')}}
function addCurrentLocation(){navigator.geolocation.getCurrentPosition(async p=>{const lat=p.coords.latitude,lng=p.coords.longitude;map.setView([lat,lng],18);const address=await reverseAddress(lat,lng);openEdit({lat,lng,fullAddress:address,status:'visited',type:'戸建て',date:today(),source:'map',memberType:'general'},true)},()=>alert('現在地を取得できませんでした'),{enableHighAccuracy:true,timeout:12000})}
