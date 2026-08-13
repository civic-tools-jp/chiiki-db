function boolValue(v){return v===true||v===1||String(v||"").toLowerCase()==="true"}
"use strict";
async function loadRecords(){try{setBusy(true);const d=await api('listRecords',{areaId:currentAreaId});records=d.records||[];renderAll();}catch(e){if(/セッション/.test(e.message)){logout();return}msg('appMsg',e.message)}finally{setBusy(false)}}
function setBusy(v){$('app').classList.toggle('spinner',v)}
function isRevisit(r){return statusKey(r.status)==='revisit'||['○中','◎高'].includes(r.revisitPriority)}
function renderStatus(){$('statusGrid').innerHTML=Object.entries(STATUS).map(([k,v])=>`<button class="status-btn ${editStatus===k?'active':''}" onclick="editStatus='${k}';renderStatus()">${v.label}</button>`).join('')}
function inputDateValue(v){
  if(!v)return today();
  if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
  const s=String(v).trim();
  let m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  const d=new Date(s);
  return isNaN(d)?today():d.toISOString().slice(0,10);
}
function isPartyOrSupporter(c){
  const mt=String(c.memberType||'').trim();
  if(mt==='party_member'||mt==='supporter')return true;
  const raw=String(c.memberTypeRaw||c.membershipType||c.memberCategory||c.partyMemberType||'').trim();
  return /党員|会員|サポーター/.test(raw);
}
function openEdit(r,isNew){editing={...r,isNew};$('recordId').value=r.id||'';$('recordMemberType').value=r.memberType||'general';$('recordSource').value=r.source||(isNew?'manual':'');$('lat').value=r.lat||'';$('lng').value=r.lng||'';$('fullAddress').value=r.fullAddress||'';$('personName').value=r.personName||'';$('recordPhone').value=r.phone||'';$('recordEmail').value=r.email||'';$('supporter').value=r.supporter||'';$('priority').value=r.revisitPriority||'';$('referrer').value=r.referrer||'';$('warning').checked=boolValue(r.warning);$('warningReason').value=r.warningReason||'';$('warningMemo').value=r.warningMemo||'';toggleWarningFields();$('type').value=r.type||'戸建て';$('date').value=inputDateValue(r.date);$('memo').value=r.memo||'';editStatus=statusKey(r.status);renderStatus();const imported=String(r.source||'')==='import';
  const canRemove=!!r.id&&(!imported||session?.role==='admin');
  $('deleteRecordRow')?.classList.toggle('hidden',!canRemove);
  const deleteBtn=document.querySelector('#deleteRecordRow button');
  if(deleteBtn){
    deleteBtn.textContent=imported?'この名簿データを無効化':'この訪問先を削除';
    deleteBtn.title=imported?'元データは削除せず、通常表示から外します':'';
  }
  const protectedMember=session?.role==='member'&&!isNew&&['party_member','supporter'].includes(String(r.memberType||''));
  const importedMember=protectedMember&&String(r.source||'')==='import';
  const locationConfirmed=protectedMember&&r.locationConfirmed===true;

  $('personName').readOnly=importedMember;
  $('recordPhone').readOnly=protectedMember;
  $('recordMemberType').disabled=protectedMember;
  $('fullAddress').readOnly=locationConfirmed;

  if(protectedMember){
    $('recordPhone').title='電話番号は閲覧のみです。修正は管理者に依頼してください';
    $('personName').title=importedMember?'名簿から取り込んだ氏名は閲覧のみです。修正は管理者に依頼してください':'';
    if(locationConfirmed){
      $('fullAddress').title='位置確認済みの住所です。修正は管理者に依頼してください';
    }else{
      $('fullAddress').title='位置未確認のため住所を修正できます';
    }
  }else{
    $('recordPhone').title='';$('personName').title='';$('fullAddress').title='';
  }

  const addrTools=document.querySelector('.address-tools');
  if(addrTools)addrTools.classList.toggle('hidden',locationConfirmed);

  const locationNote=document.getElementById('recordLocationNote');
  if(locationNote){
    locationNote.textContent=protectedMember
      ? (locationConfirmed?'🔒 位置確認済み：住所は閲覧のみです':'⚠️ 位置未確認：住所を修正して位置を再取得できます')
      : '';
    locationNote.classList.toggle('hidden',!protectedMember);
  }

  $('editModal').style.display='flex'}
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
    if(!isPartyOrSupporter(c))return false;
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
async function saveRecord(){const btn=document.getElementById('saveRecordBtn');try{if(btn){btn.disabled=true;btn.textContent='保存中…'}const rec={id:$('recordId').value,areaId:currentAreaId,source:$('recordSource').value||'manual',memberType:$('recordMemberType').value||'general',contactId:editing?.contactId||'',lat:Number($('lat').value),lng:Number($('lng').value),fullAddress:$('fullAddress').value.trim(),personName:$('personName').value.trim(),phone:$('recordPhone').value.trim(),email:$('recordEmail').value.trim(),status:editStatus,supporter:$('supporter').value,revisitPriority:$('priority').value,referrer:$('referrer').value.trim(),warning:$('warning').checked,warningReason:$('warningReason').value,warningMemo:$('warningMemo').value.trim(),type:$('type').value,date:$('date').value,memo:$('memo').value.trim(),updatedAt:editing?.updatedAt||''};await api('saveRecord',{record:rec});closeEdit();await loadRecords()}catch(e){console.error(e);alert(e.message||String(e))}finally{if(btn){btn.disabled=false;btn.textContent='保存'}}}
async function deleteRecord(){
  if(!editing?.id){closeEdit();return}
  const imported=String(editing.source||'')==='import';
  if(imported&&session?.role!=='admin'){alert('名簿から取り込んだデータは削除できません');return}
  const text=imported?'この名簿データを無効化しますか？\n\n元データは削除せず、一覧・地図・分析から非表示にします。':'この訪問先を削除しますか？';
  if(!confirm(text))return;
  try{
    const d=await api('deleteRecord',{recordId:editing.id,updatedAt:editing.updatedAt||''});
    closeEdit();await loadRecords();
    if(imported&&d?.deactivated)alert('名簿データを無効化しました');
  }catch(e){alert(e.message)}
}

function toggleWarningFields(){const on=!!$('warning')?.checked;$('warningFields')?.classList.toggle('hidden',!on)}

function newUnifiedRecord(){openEdit({id:'',lat:'',lng:'',fullAddress:'',personName:'',status:'unvisited',type:'戸建て',date:today(),source:'manual',memberType:'general'},true)}
