function boolValue(v){return v===true||v===1||String(v||"").toLowerCase()==="true"}
"use strict";
async function loadRecords(){try{setBusy(true);const d=await api('listRecords',{areaId:currentAreaId});records=d.records||[];renderAll();}catch(e){if(/セッション/.test(e.message)){logout();return}msg('appMsg',e.message)}finally{setBusy(false)}}
function setBusy(v){$('app').classList.toggle('spinner',v)}
function isRevisit(r){return statusKey(r.status)==='revisit'||['○中','◎高'].includes(r.revisitPriority)}
function renderStatus(){$('statusGrid').innerHTML=Object.entries(STATUS).map(([k,v])=>`<button class="status-btn ${editStatus===k?'active':''}" onclick="editStatus='${k}';renderStatus()">${v.label}</button>`).join('')}
function openEdit(r,isNew){editing={...r,isNew};$('recordId').value=r.id||'';$('lat').value=r.lat||'';$('lng').value=r.lng||'';$('fullAddress').value=r.fullAddress||'';$('personName').value=r.personName||'';$('recordPhone').value=r.phone||'';$('recordEmail').value=r.email||'';$('supporter').value=r.supporter||'';$('priority').value=r.revisitPriority||'';$('referrer').value=r.referrer||'';$('warning').checked=boolValue(r.warning);$('warningReason').value=r.warningReason||'';$('warningMemo').value=r.warningMemo||'';toggleWarningFields();$('type').value=r.type||'戸建て';$('date').value=r.date||today();$('memo').value=r.memo||'';editStatus=statusKey(r.status);renderStatus();renderContactSelect(r.contactId||'');$('linkContactCheck').checked=!!r.contactId;toggleRecordContactLink();renderLinkedContactInfo(r.contactId||'');$('deleteRecordBtn')?.classList.toggle('hidden',!r.id);$('editModal').style.display='flex'}
function toggleRecordContactLink(){
  const checked=!!$('linkContactCheck')?.checked;
  $('recordContactWrap')?.classList.toggle('hidden',!checked);
  if(checked)renderContactSelect();
  if(!checked){
    if($('recordContactSearch'))$('recordContactSearch').value='';
    if($('recordContact'))$('recordContact').value='';
    renderLinkedContactInfo('');
  }
}
function renderLinkedContactInfo(contactId){
  const c=contacts.find(x=>String(x.contactId)===String(contactId||''));
  const box=$('linkedContactInfo');
  if(!box)return;
  if(!c){box.innerHTML='';box.classList.add('hidden');return;}
  const label=memberTypeLabel(c.memberType);
  const cls=c.memberType==='party_member'?'member-party':c.memberType==='supporter'?'member-supporter':'member-general';
  box.className='contact-link-info '+cls;
  box.innerHTML=`<div class="member-linked-title">${esc(label)}　${esc(c.name||'')}</div>
    ${c.partyId?`<div>参政党ID：${esc(c.partyId)}</div>`:''}
    ${c.sourceBranch?`<div>所属：${esc(c.sourceBranch)}</div>`:''}
    ${c.phone?`<div>☎ ${esc(c.phone)}</div>`:''}
    ${c.email?`<div>✉ ${esc(c.email)}</div>`:''}`;
}
function onRecordContactChange(){const id=$('recordContact').value;renderLinkedContactInfo(id);const c=contacts.find(x=>String(x.contactId)===String(id));if(!c)return;if(!$('personName').value.trim())$('personName').value=c.name||'';if(!$('fullAddress').value.trim())$('fullAddress').value=c.fullAddress||'';if(!$('recordPhone').value.trim())$('recordPhone').value=c.phone||'';if(!$('recordEmail').value.trim())$('recordEmail').value=c.email||'';}
function renderContactSelect(preferred){
  const el=$('recordContact');if(!el)return;
  const previous=preferred!==undefined?preferred:el.value;
  const q=String($('recordContactSearch')?.value||'').trim().toLowerCase();
  const allowed=contacts.filter(c=>{
    const mt=String(c.memberType||'');
    if(mt!=='party_member'&&mt!=='supporter')return false;
    if(c.areaId&&currentAreaId&&String(c.areaId)!==String(currentAreaId))return false;
    if(!q)return true;
    return [c.name,c.fullAddress,c.partyId,c.phone].some(v=>String(v||'').toLowerCase().includes(q));
  });
  el.innerHTML='<option value="">選択してください</option>'+allowed.map(c=>`<option value="${esc(c.contactId)}">${esc(memberTypeLabel(c.memberType))}｜${esc(c.name||'名称未設定')}${c.fullAddress?'｜'+esc(c.fullAddress):''}</option>`).join('');
  const exists=allowed.some(c=>String(c.contactId)===String(previous||''));
  el.value=exists?previous:'';
  el.classList.toggle('hidden',allowed.length===0);
  $('recordContactEmpty')?.classList.toggle('hidden',allowed.length!==0);
  el.onchange=onRecordContactChange;
}
function closeEdit(){$('editModal').style.display='none';editing=null}
async function saveRecord(){const btn=document.getElementById('saveRecordBtn');try{if($('linkContactCheck')?.checked&&!$('recordContact').value)throw Error('紐づける党員・サポーターを選択してください');if(btn){btn.disabled=true;btn.textContent='保存中…'}const rec={id:$('recordId').value,areaId:currentAreaId,contactId:$('linkContactCheck')?.checked?$('recordContact').value:'',lat:Number($('lat').value),lng:Number($('lng').value),fullAddress:$('fullAddress').value.trim(),personName:$('personName').value.trim(),phone:$('recordPhone').value.trim(),email:$('recordEmail').value.trim(),status:editStatus,supporter:$('supporter').value,revisitPriority:$('priority').value,referrer:$('referrer').value.trim(),warning:$('warning').checked,warningReason:$('warningReason').value,warningMemo:$('warningMemo').value.trim(),type:$('type').value,date:$('date').value,memo:$('memo').value.trim(),updatedAt:editing?.updatedAt||''};await api('saveRecord',{record:rec});closeEdit();await loadRecords()}catch(e){console.error(e);alert(e.message||String(e))}finally{if(btn){btn.disabled=false;btn.textContent='保存'}}}
async function deleteRecord(){if(!editing?.id){closeEdit();return}if(!confirm('削除しますか？'))return;try{await api('deleteRecord',{recordId:editing.id,updatedAt:editing.updatedAt||''});closeEdit();await loadRecords()}catch(e){alert(e.message)}}

function toggleWarningFields(){const on=!!$('warning')?.checked;$('warningFields')?.classList.toggle('hidden',!on)}
