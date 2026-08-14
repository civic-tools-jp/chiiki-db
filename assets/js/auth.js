"use strict";
async function login(){try{msg("loginMsg","");const data=await api("login",{loginId:$('loginId').value.trim(),password:$('loginPassword').value});session=data.session;localStorage.setItem("aisapo_session",JSON.stringify(session));startApp();}catch(e){msg("loginMsg",e.message)}}
function logout(){localStorage.removeItem("aisapo_session");localStorage.removeItem("gdbv2_session");session=null;location.reload()}
async function startApp(){
  if(!session)return;
  $('loginView').classList.add('hidden');$('app').classList.remove('hidden');
  $('userName').textContent=session.name;
  if($('mobileUserName'))$('mobileUserName').textContent=session.name;
  $('userRole').textContent=({member:'一般',leader:'支部管理者',prefecture_admin:'管理者',system_admin:'管理者'}[session.role]||session.role);
  const avatar=({system_admin:'👑',prefecture_admin:'👑',leader:'🧭',member:'👤'}[session.role]||'👤'); if($('userAvatar'))$('userAvatar').textContent=avatar; if($('mobileUserAvatar'))$('mobileUserAvatar').textContent=avatar;
  $('branchLabel').textContent=session.branchName||'全支部';
  const manager=['leader','prefecture_admin','system_admin'].includes(session.role);
  if(manager){$('adminTab')?.classList.remove('hidden');$('contactsTab')?.classList.remove('hidden')}
  if(manager){
    $('contactImportPanel')?.classList.remove('hidden');
  }
  if(session.role==='system_admin'){
    $('areaAddPanel')?.classList.remove('hidden');
  }
  await loadBootstrap();initMap();await changeArea(false);await loadBranchMessages();
  if(manager)await loadAdmin();
  if(session.mustChangePassword)openPasswordModal(true);
}
async function loadBootstrap(){const d=await api('bootstrap');branches=d.branches||[];areas=d.areas||[];const sel=$('areaSelect');sel.innerHTML=areas.map(a=>`<option value="${esc(a.areaId)}">${esc((a.city?a.city+' ':'')+a.name)}</option>`).join('');if(d.areaLocked){currentAreaId=d.defaultAreaId||session.areaId||areas[0]?.areaId||'';session.areaId=currentAreaId;localStorage.setItem('aisapo_session',JSON.stringify(session));$('areaControl').classList.add('locked');sel.disabled=true;}else{sel.disabled=false;$('areaControl').classList.remove('locked');const saved=localStorage.getItem('aisapo_area')||'';currentAreaId=areas.some(a=>String(a.areaId)===String(saved))?saved:(areas[0]?.areaId||'');}sel.value=currentAreaId;if(!currentAreaId)msg('appMsg','活動エリアが設定されていません。管理者に確認してください。');}
async function changeArea(save=true){const sel=$('areaSelect');if(session?.role==='member')currentAreaId=session.areaId||currentAreaId;else currentAreaId=sel?.value||currentAreaId;if(save&&session?.role!=='member')localStorage.setItem('aisapo_area',currentAreaId||'');if(sel)sel.value=currentAreaId;const a=areas.find(x=>String(x.areaId)===String(currentAreaId));$('areaLabel').textContent=a?((a.city?a.city+' ':'')+a.name):'未設定';if(map&&a&&Number(a.mapLat)&&Number(a.mapLng))map.setView([Number(a.mapLat),Number(a.mapLng)],13);await Promise.all([loadRecords(),loadContacts()]);}
let passwordChangeForced=false;
function openPasswordModal(forced=false){passwordChangeForced=!!forced;$('passwordModal').style.display='flex';$('passwordModalTitle').textContent=forced?'初回パスワード変更':'パスワード変更';$('passwordModalNote').textContent=forced?'仮パスワードのままでは利用できません。新しいパスワードへ変更してください。':'現在のパスワードを確認して変更します。';$('passwordClose').classList.toggle('hidden',forced);$('currentPassword').value=$('newPassword1').value=$('newPassword2').value='';msg('passwordMsg','');}
function closePasswordModal(){if(passwordChangeForced)return;$('passwordModal').style.display='none';}
async function changeOwnPassword(){try{const current=$('currentPassword').value,next=$('newPassword1').value,confirm=$('newPassword2').value;if(next!==confirm)throw Error('新しいパスワードが一致しません');await api('changePassword',{currentPassword:current,newPassword:next});session.mustChangePassword=false;localStorage.setItem('aisapo_session',JSON.stringify(session));passwordChangeForced=false;$('passwordModal').style.display='none';alert('パスワードを変更しました');}catch(e){msg('passwordMsg',e.message)}}
