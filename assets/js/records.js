"use strict";
async function loadRecords(){try{setBusy(true);const d=await api('listRecords',{areaId:currentAreaId});records=d.records||[];renderAll();}catch(e){if(/セッション/.test(e.message)){logout();return}msg('appMsg',e.message)}finally{setBusy(false)}}
function setBusy(v){$('app').classList.toggle('spinner',v)}
function isRevisit(r){return statusKey(r.status)==='revisit'||['○中','◎高'].includes(r.revisitPriority)}
function renderStatus(){$('statusGrid').innerHTML=Object.entries(STATUS).map(([k,v])=>`<button class="status-btn ${editStatus===k?'active':''}" onclick="editStatus='${k}';renderStatus()">${v.label}</button>`).join('')}
function openEdit(r,isNew){editing={...r,isNew};$('recordId').value=r.id||'';$('lat').value=r.lat||'';$('lng').value=r.lng||'';$('fullAddress').value=r.fullAddress||'';$('personName').value=r.personName||'';$('supporter').value=r.supporter||'';$('priority').value=r.revisitPriority||'';$('type').value=r.type||'戸建て';$('date').value=r.date||today();$('memo').value=r.memo||'';editStatus=statusKey(r.status);renderStatus();renderContactSelect(r.contactId||'');$('editModal').style.display='flex'}
function renderContactSelect(preferred){const el=$('recordContact');if(!el)return;const val=preferred!==undefined?preferred:el.value;el.innerHTML='<option value="">名簿と紐づけない</option>'+contacts.map(c=>`<option value="${esc(c.contactId)}">${esc(c.name)}${c.fullAddress?'｜'+esc(c.fullAddress):''}</option>`).join('');el.value=val;}
function closeEdit(){$('editModal').style.display='none';editing=null}
async function saveRecord(){try{const rec={id:$('recordId').value,areaId:currentAreaId,contactId:$('recordContact').value,lat:Number($('lat').value),lng:Number($('lng').value),fullAddress:$('fullAddress').value.trim(),personName:$('personName').value.trim(),status:editStatus,supporter:$('supporter').value,revisitPriority:$('priority').value,type:$('type').value,date:$('date').value,memo:$('memo').value.trim(),updatedAt:editing?.updatedAt||''};await api('saveRecord',{record:rec});closeEdit();await loadRecords()}catch(e){alert(e.message)}}
async function deleteRecord(){if(!editing?.id){closeEdit();return}if(!confirm('削除しますか？'))return;try{await api('deleteRecord',{recordId:editing.id,updatedAt:editing.updatedAt||''});closeEdit();await loadRecords()}catch(e){alert(e.message)}}

/* Ver.2.2.2: unified list quick filters */
let listQuickFilter='all';

function ensureListQuickFilters(){
  const search=$('listSearch');
  if(!search || document.getElementById('listQuickFilters')) return;
  const bar=document.createElement('div');
  bar.id='listQuickFilters';
  bar.className='list-quick-filters';
  [
    ['all','すべて'],
    ['unvisited','未訪問'],
    ['revisit','再訪'],
    ['party_member','党員'],
    ['supporter','サポーター']
  ].forEach(([key,label])=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='quick-filter'+(key==='all'?' active':'');
    b.textContent=label;
    b.onclick=()=>{
      listQuickFilter=key;
      bar.querySelectorAll('.quick-filter').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      renderList();
    };
    bar.appendChild(b);
  });
  search.parentNode.insertBefore(bar,search.nextSibling);
}

const _renderList_v222 = typeof renderList==='function' ? renderList : null;
if(_renderList_v222){
  renderList=function(){
    ensureListQuickFilters();
    const q=String($('listSearch')?.value||'').toLowerCase();
    const box=$('listBox');
    if(!box)return;
    let arr=records.filter(r=>[r.personName,r.fullAddress,r.memo,r.assigneeName].some(v=>String(v||'').toLowerCase().includes(q)));
    if(listQuickFilter==='unvisited') arr=arr.filter(r=>statusKey(r.status)==='unvisited');
    if(listQuickFilter==='revisit') arr=arr.filter(r=>statusKey(r.status)==='revisit');
    if(listQuickFilter==='party_member') arr=arr.filter(r=>recordMemberType(r)==='party_member');
    if(listQuickFilter==='supporter') arr=arr.filter(r=>recordMemberType(r)==='supporter');
    box.innerHTML='';
    if(!arr.length){box.innerHTML='<div class="empty">該当する訪問先はありません</div>';return;}
    arr.forEach(r=>{
      const card=document.createElement('div');
      card.className='record-card';
      const mt=recordMemberType(r), badge=priorityBadge(mt);
      const dateRaw=String(r.date||r.visitDate||r.updatedAt||'');
      let dateText=dateRaw;
      if(dateRaw){
        const d=new Date(dateRaw);
        if(!isNaN(d)) dateText=`${d.getMonth()+1}/${d.getDate()}`;
      }
      card.innerHTML=`<div class="record-title">${badge?badge+' ':''}${escapeHtml(r.personName||r.fullAddress||'訪問先')}</div>
        <div class="record-meta">${escapeHtml(r.fullAddress||'')}${dateText?' ｜ '+escapeHtml(dateText):''}${r.assigneeName?' ｜ '+escapeHtml(r.assigneeName):''}</div>
        <div class="record-tags"><span>${escapeHtml(STATUS[statusKey(r.status)]?.label||r.status||'未訪問')}</span>${r.reaction?`<span>${escapeHtml(r.reaction)}</span>`:''}</div>`;
      card.onclick=()=>openEdit(r,false);
      box.appendChild(card);
    });
  };
}
