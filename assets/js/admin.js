"use strict";
async function loadAdmin(){try{const d=await api('adminData');branches=d.branches||branches;areas=d.areas||areas;users=d.users||[];$('newBranch').innerHTML=branches.map(b=>`<option value="${esc(b.branchId)}">${esc(b.name)}</option>`).join('');$('areaBranch').innerHTML=$('newBranch').innerHTML;syncNewUserArea();renderUsers();renderAdminAreas()}catch(e){msg('appMsg',e.message)}}
function syncNewUserArea(){const role=$('newRole').value,branchId=$('newBranch').value;$('newAreaWrap').classList.toggle('hidden',role!=='member');$('newArea').innerHTML=areas.filter(a=>String(a.branchId)===String(branchId)).map(a=>`<option value="${esc(a.areaId)}">${esc((a.city?a.city+' ':'')+a.name)}</option>`).join('')}
function areaOptionsForUser(u){return areas.filter(a=>String(a.branchId)===String(u.branchId)).map(a=>`<option value="${esc(a.areaId)}" ${String(a.areaId)===String(u.areaId)?'selected':''}>${esc((a.city?a.city+' ':'')+a.name)}</option>`).join('')}
function roleLabel(role){return ({system_admin:'システム管理者',leader:'支部管理者',member:'一般利用者'})[role]||role}
function branchOptionsForUser(u){return branches.map(b=>`<option value="${esc(b.branchId)}" ${String(b.branchId)===String(u.branchId)?'selected':''}>${esc(b.name)}</option>`).join('')}
function renderUsers(){
  const q=String($('adminUserSearch')?.value||'').trim().toLowerCase(),role=$('adminUserRole')?.value||'',active=$('adminUserActive')?.value||'';
  const rows=users.filter(u=>{
    if(q&&!String(u.loginId||'').toLowerCase().includes(q)&&!String(u.name||'').toLowerCase().includes(q))return false;
    if(role&&u.role!==role)return false;
    if(active==='active'&&!u.active)return false;
    if(active==='inactive'&&u.active)return false;
    return true;
  });
  $('usersTable').innerHTML=`<table class="admin-table admin-users-table"><thead><tr><th>ID</th><th>氏名</th><th>支部</th><th>権限/エリア</th><th>状態</th><th>操作</th></tr></thead><tbody>${rows.map(u=>`<tr class="${u.active?'':'admin-user-inactive'}">
<td data-label="ID">${esc(u.loginId)}</td>
<td data-label="氏名"><b>${esc(u.name)}</b></td>
<td data-label="支部">${esc(u.branchName)}</td>
<td data-label="権限/エリア"><div class="admin-user-role">${esc(roleLabel(u.role))}</div>${u.role==='member'?`<span class="admin-area-note">${esc((areas.find(a=>String(a.areaId)===String(u.areaId))?.city||'')+' '+(areas.find(a=>String(a.areaId)===String(u.areaId))?.name||''))}</span>`:'<span class="admin-area-note">エリア選択可</span>'}</td>
<td data-label="状態"><span class="badge">${u.active?'有効':'無効'}</span></td>
<td data-label="操作"><div class="admin-user-actions">${u.role!=='system_admin'?`<button class="mini-btn" onclick="openUserEdit('${esc(u.userId)}')">編集</button>`:''}<button class="mini-btn" onclick="resetUserPassword('${esc(u.userId)}','${esc(u.loginId)}')">PWリセット</button>${u.role!=='system_admin'?`<button class="mini-btn" onclick="toggleUserActive('${esc(u.userId)}',${u.active?'false':'true'})">${u.active?'無効化':'有効化'}</button>`:''}${session?.role==='system_admin'&&u.role!=='system_admin'?`<button class="mini-btn danger" onclick="deleteUser('${esc(u.userId)}','${esc(u.loginId)}')">削除</button>`:''}</div></td>
</tr>`).join('')}</tbody></table>`;
}
function openUserEdit(userId){
  const u=users.find(x=>String(x.userId)===String(userId));if(!u)return;
  const name=prompt('表示名を変更してください',u.name||'');if(name===null)return;if(!name.trim()){alert('表示名を入力してください');return}
  let role=u.role,branchId=u.branchId,areaId=u.areaId||'';
  if(session?.role==='system_admin'){
    const r=prompt('権限を入力してください（member=一般利用者 / leader=支部管理者）',u.role);if(r===null)return;
    if(!['member','leader'].includes(r)){alert('権限は member または leader を入力してください');return}role=r;
    const b=prompt('所属支部IDを入力してください',u.branchId||'');if(b===null)return;if(!branches.some(x=>String(x.branchId)===String(b))){alert('所属支部が見つかりません');return}branchId=b;
  }
  if(role==='member'){
    const opts=areas.filter(a=>String(a.branchId)===String(branchId));
    if(!opts.length){alert('所属支部に活動エリアがありません');return}
    const guide=opts.map(a=>`${a.areaId}: ${(a.city?a.city+' ':'')+a.name}`).join('\n');
    const a=prompt(`活動エリアIDを入力してください\n\n${guide}`,areaId||opts[0].areaId);if(a===null)return;
    if(!opts.some(x=>String(x.areaId)===String(a))){alert('所属支部の活動エリアを選択してください');return}areaId=a;
  }else areaId='';
  saveUserEdit(userId,{name:name.trim(),role,branchId,areaId});
}
async function saveUserEdit(userId,user){try{await api('updateUser',{userId,user});await loadAdmin();alert('ユーザー情報を更新しました')}catch(e){alert(e.message)}}
function toggleAdminAreas(){const box=$('areasTable'),btn=$('areasToggleBtn');const opening=box.classList.contains('hidden');box.classList.toggle('hidden',!opening);btn.textContent=opening?'一覧を閉じる ▲':'一覧を表示 ▼'}
function renderAdminAreas(){$('areasTable').innerHTML=`<table class="admin-table"><tr><th>支部</th><th>市</th><th>エリア</th><th>操作</th></tr>${areas.map(a=>`<tr><td>${esc(branches.find(b=>b.branchId===a.branchId)?.name||a.branchId)}</td><td>${esc(a.city||'')}</td><td>${esc(a.name)}</td><td>${session?.role==='system_admin'?`<button class="mini-btn danger" onclick="deleteArea('${esc(a.areaId)}','${esc(a.name)}')">削除</button>`:''}</td></tr>`).join('')}</table>`}
async function createUser(){try{await api('createUser',{user:{loginId:$('newLoginId').value.trim(),name:$('newName').value.trim(),password:$('newPassword').value,role:$('newRole').value,branchId:$('newBranch').value,areaId:$('newRole').value==='member'?$('newArea').value:''}});$('newLoginId').value=$('newName').value=$('newPassword').value='';await loadAdmin();alert('ユーザーを発行しました。一般利用者は設定した活動エリアだけ閲覧できます。')}catch(e){alert(e.message)}}
async function saveUserArea(userId){try{const areaId=$('ua_'+userId).value;await api('setUserArea',{userId,areaId});await loadAdmin();alert('固定活動エリアを更新しました')}catch(e){alert(e.message)}}
async function resetUserPassword(userId,loginId){const temp=prompt(`${loginId} の新しい仮パスワードを入力してください。\n10文字以上・英字と数字を含めてください。`);if(temp===null)return;try{await api('resetPassword',{userId,temporaryPassword:temp});await loadAdmin();alert('仮パスワードへリセットしました。次回ログイン時に本人のパスワード変更が必須になります。')}catch(e){alert(e.message)}}

async function toggleUserActive(userId,active){if(!confirm(active?'このユーザーを有効化しますか？':'このユーザーを無効化しますか？'))return;try{await api('setUserActive',{userId,active});await loadAdmin()}catch(e){alert(e.message)}}
async function deleteUser(userId,loginId){if(!confirm(`${loginId} を削除しますか？\n過去の訪問データは削除されません。`))return;try{await api('deleteUser',{userId});await loadAdmin()}catch(e){alert(e.message)}}
async function deleteArea(areaId,name){if(!confirm(`${name} を削除しますか？\n使用中のエリアは削除できません。`))return;try{await api('deleteArea',{areaId});await loadBootstrap();await loadAdmin()}catch(e){alert(e.message)}}
async function lookupAreaCenter(city,name){
  const q=[city,name,'福岡県','日本'].filter(Boolean).join(' ');
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);
    const data=await res.json();
    if(!data?.[0])return null;
    const lat=Number(data[0].lat),lng=Number(data[0].lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
    return {lat,lng};
  }catch(_){return null}
}
async function createArea(){
  const branchId=$('areaBranch').value;
  const city=$('areaCity').value.trim();
  const name=$('areaName').value.trim();
  if(!city||!name){alert('市区町村とエリア名を入力してください');return}
  const btn=document.querySelector('.area-add-btn');
  const oldText=btn?.textContent;
  try{
    if(btn){btn.disabled=true;btn.textContent='中心位置を取得中…'}
    const center=await lookupAreaCenter(city,name);
    if(!center){alert('中心位置を自動取得できませんでした。市区町村とエリア名を確認してください。');return}
    $('areaLat').value=center.lat;$('areaLng').value=center.lng;
    await api('createArea',{area:{branchId,city,name,mapLat:center.lat,mapLng:center.lng}});
    $('areaName').value='';$('areaLat').value='';$('areaLng').value='';
    await loadBootstrap();await loadAdmin();
    alert('活動エリアを追加しました');
  }catch(e){
    alert(e.message)
  }finally{
    if(btn){btn.disabled=false;btn.textContent=oldText||'エリアを追加'}
  }
}
