"use strict";
function initMap(){if(map)return;map=L.map('map').setView([33.5902,130.4017],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);map.on('click',async e=>{let address='';try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=ja`);address=(await r.json()).display_name||''}catch(_){}openEdit({id:'',lat:e.latlng.lat,lng:e.latlng.lng,fullAddress:address,status:'unvisited',type:'戸建て',date:today()},true)});setTimeout(()=>map.invalidateSize(),100)}
function priorityBadge(memberType){return memberType==='party_member'?'⭐':memberType==='supporter'?'🟠':''}
function recordMemberType(r){const c=contacts.find(x=>String(x.contactId)===String(r.contactId));return c?.memberType||''}
function icon(r){const c=STATUS[statusKey(r.status)].color,b=priorityBadge(recordMemberType(r));return L.divIcon({className:'',html:`<div class="pin-wrap"><div class="pin" style="background:${c}"></div>${b?`<div class="pin-priority">${b}</div>`:''}</div>`,iconSize:[30,30],iconAnchor:[11,22]})}
function contactIcon(c){const b=priorityBadge(c.memberType);return L.divIcon({className:'',html:`<div class="contact-pin ${c.memberType==='party_member'?'member':'support'}">${b||'○'}</div>`,iconSize:[30,30],iconAnchor:[15,15]})}
function renderMarkers(){
  if(!map)return;
  Object.values(markers).forEach(m=>map.removeLayer(m));
  markers={};

  const pts=[];
  const priorityOnly=!!$('priorityOnly')?.checked;
  const revisitOnly=!!$('revisitOnly')?.checked;
  const unvisitedOnly=!!$('unvisitedOnly')?.checked;

  // 複数チェック時は AND 条件。
  // 例：党員・サポーター + 未訪問 = 未訪問の党員・サポーターだけ。
  records.forEach(r=>{
    const mt=recordMemberType(r);
    if(priorityOnly&&!['party_member','supporter'].includes(mt))return;
    if(revisitOnly&&statusKey(r.status)!=='revisit')return;
    if(unvisitedOnly&&statusKey(r.status)!=='unvisited')return;
    if(!Number.isFinite(Number(r.lat))||!Number.isFinite(Number(r.lng)))return;

    const m=L.marker([+r.lat,+r.lng],{icon:icon(r)}).addTo(map).on('click',()=>openEdit(r,false));
    m.bindTooltip(`${priorityBadge(mt)} ${r.personName||r.fullAddress||'訪問先'}`.trim());
    markers['r_'+r.id]=m;
    pts.push([+r.lat,+r.lng]);
  });

  const linked=new Set(records.map(r=>String(r.contactId||'')).filter(Boolean));
  contacts.forEach(c=>{
    if(!['party_member','supporter'].includes(c.memberType))return;
    if(linked.has(String(c.contactId)))return;

    // 名簿だけに存在し、まだ訪問記録がない党員・サポーターは「未訪問」として扱う。
    if(revisitOnly)return;
    if(priorityOnly===false && unvisitedOnly===false){
      // 従来どおり、未紐付けの党員・サポーターは通常表示にも出す。
    }
    if(!Number.isFinite(Number(c.lat))||!Number.isFinite(Number(c.lng))||!c.lat||!c.lng)return;

    const m=L.marker([+c.lat,+c.lng],{icon:contactIcon(c)}).addTo(map).on('click',()=>openContact(c));
    m.bindTooltip(`${priorityBadge(c.memberType)} ${c.name||'名簿'}`);
    markers['c_'+c.contactId]=m;
    pts.push([+c.lat,+c.lng]);
  });

  if(pts.length>1)map.fitBounds(pts,{padding:[25,25],maxZoom:17});
  else if(pts.length===1)map.setView(pts[0],17);
}
async function searchMap(){const q=$('searchText').value.trim();if(!q)return;try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);const j=await r.json();if(j[0])map.setView([+j[0].lat,+j[0].lon],17);else alert('見つかりませんでした')}catch(_){alert('検索に失敗しました')}}
function addCurrentLocation(){navigator.geolocation.getCurrentPosition(async p=>{const lat=p.coords.latitude,lng=p.coords.longitude;map.setView([lat,lng],18);let address='';try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ja`);address=(await r.json()).display_name||''}catch(_){}openEdit({lat,lng,fullAddress:address,status:'visited',type:'戸建て',date:today()},true)},()=>alert('現在地を取得できませんでした'),{enableHighAccuracy:true,timeout:12000})}
