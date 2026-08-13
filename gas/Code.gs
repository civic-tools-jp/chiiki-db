const SHEETS={USERS:'Users',BRANCHES:'Branches',AREAS:'Areas',CONTACTS:'Contacts',RECORDS:'Records',SESSIONS:'Sessions'};
const USER_HEADERS=['userId','loginId','name','passwordHash','salt','role','branchId','active','mustChangePassword','createdAt','updatedAt'];
const BRANCH_HEADERS=['branchId','name','prefecture','active'];
const AREA_HEADERS=['areaId','branchId','city','name','mapLat','mapLng','active'];
const CONTACT_HEADERS=['contactId','branchId','areaId','name','fullAddress','phone','referrer','supporter','assigneeId','assigneeName','memo','createdAt','updatedAt','updatedBy'];
const RECORD_HEADERS=['id','branchId','areaId','contactId','lat','lng','area','address','fullAddress','personName','status','type','household','contact','revisitPriority','referrer','supporter','warning','warningMemo','signboard','posterParty','posterMemo','memo','date','startTime','endTime','durationMinutes','googleMapsUrl','assigneeId','assigneeName','createdAt','updatedAt','updatedBy'];
const SESSION_HEADERS=['token','userId','expiresAt','createdAt'];

function doGet(){return json_({ok:true,name:'アイサポ Ver.2.1.2 API'});}
function doPost(e){try{const p=JSON.parse((e.postData&&e.postData.contents)||'{}');if(p.action==='setup')return json_(setup_(p));if(p.action==='login')return json_(login_(p));const user=auth_(p.token);switch(p.action){
case'bootstrap':return json_(bootstrap_(user));
case'listRecords':return json_(listRecords_(user,p));case'saveRecord':return json_(saveRecord_(user,p.record||{}));case'deleteRecord':return json_(deleteRecord_(user,p));
case'listContacts':return json_(listContacts_(user,p));case'saveContact':return json_(saveContact_(user,p.contact||{}));case'deleteContact':return json_(deleteContact_(user,p));
case'adminData':return json_(adminData_(user));case'createUser':return json_(createUser_(user,p.user||{}));case'createArea':return json_(createArea_(user,p.area||{}));case'changePassword':return json_(changePassword_(user,p));case'resetPassword':return json_(resetPassword_(user,p));
default:throw Error('不明な処理です');}}catch(err){return json_({ok:false,error:String(err.message||err)});}}

// 初回用。既にVer.2をセットアップ済みなら upgradeV21() を実行してください。
function setup_(p){const ss=SpreadsheetApp.getActive();ensureSheet_(ss,SHEETS.USERS,USER_HEADERS);ensureSheet_(ss,SHEETS.BRANCHES,BRANCH_HEADERS);ensureSheet_(ss,SHEETS.AREAS,AREA_HEADERS);ensureSheet_(ss,SHEETS.CONTACTS,CONTACT_HEADERS);ensureSheet_(ss,SHEETS.RECORDS,RECORD_HEADERS);ensureSheet_(ss,SHEETS.SESSIONS,SESSION_HEADERS);
const bs=ss.getSheetByName(SHEETS.BRANCHES);if(bs.getLastRow()===1)bs.appendRow(['branch_fukuoka_1','福岡第1支部','福岡県',true]);
const as=ss.getSheetByName(SHEETS.AREAS);if(as.getLastRow()===1)as.appendRow(['area_higashi','branch_fukuoka_1','福岡市','東区',33.6452,130.4319,true]);
const us=ss.getSheetByName(SHEETS.USERS);if(us.getLastRow()===1){const salt=uuid_(),pw=p.adminPassword||'ChangeMe123!';us.appendRow([uuid_(),p.adminLoginId||'admin',p.adminName||'管理者',hash_(pw,salt),salt,'system_admin','',true,false,now_(),now_()]);}return{ok:true,message:'初期設定が完了しました'};}

// Ver.2 → Ver.2.1 移行。現在のシートを残しつつ構造を更新します。1回だけ実行してください。
function upgradeV21(){const ss=SpreadsheetApp.getActive();
  migrateBranches_(ss); ensureSheet_(ss,SHEETS.AREAS,AREA_HEADERS); ensureSheet_(ss,SHEETS.CONTACTS,CONTACT_HEADERS); migrateRecords_(ss); ensureSheet_(ss,SHEETS.SESSIONS,SESSION_HEADERS);
  const areas=ss.getSheetByName(SHEETS.AREAS);if(areas.getLastRow()===1)areas.appendRow(['area_higashi','branch_fukuoka_1','福岡市','東区',33.6452,130.4319,true]);
  return 'アイサポ Ver.2.1 への移行が完了しました';
}

// Ver.2.1 認証拡張：Users に mustChangePassword を追加します。1回だけ実行してください。
function upgradeV211(){const ss=SpreadsheetApp.getActive();migrateUsers_(ss);return 'アイサポ Ver.2.1.1 認証拡張が完了しました';}
function migrateUsers_(ss){let sh=ss.getSheetByName(SHEETS.USERS);if(!sh){sh=ss.insertSheet(SHEETS.USERS);sh.appendRow(USER_HEADERS);return;}const vals=sh.getDataRange().getValues();if(!vals.length){sh.appendRow(USER_HEADERS);return;}const oldH=vals[0].map(String),rows=vals.slice(1);const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{const o={};oldH.forEach((h,i)=>o[h]=r[i]);if(o.mustChangePassword===''||o.mustChangePassword===undefined)o.mustChangePassword=false;return USER_HEADERS.map(h=>o[h]??'');});sh.clearContents();sh.getRange(1,1,1,USER_HEADERS.length).setValues([USER_HEADERS]);if(mapped.length)sh.getRange(2,1,mapped.length,USER_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);}
function migrateBranches_(ss){let sh=ss.getSheetByName(SHEETS.BRANCHES);if(!sh){sh=ss.insertSheet(SHEETS.BRANCHES);sh.appendRow(BRANCH_HEADERS);return;}const vals=sh.getDataRange().getValues();if(!vals.length){sh.appendRow(BRANCH_HEADERS);return;}const oldH=vals[0].map(String),rows=vals.slice(1);const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{const o={};oldH.forEach((h,i)=>o[h]=r[i]);return [o.branchId||'',o.name||'',o.prefecture||'',truth_(o.active)];});sh.clearContents();sh.getRange(1,1,1,BRANCH_HEADERS.length).setValues([BRANCH_HEADERS]);if(mapped.length)sh.getRange(2,1,mapped.length,BRANCH_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);}
function migrateRecords_(ss){let sh=ss.getSheetByName(SHEETS.RECORDS);if(!sh){sh=ss.insertSheet(SHEETS.RECORDS);sh.appendRow(RECORD_HEADERS);return;}const vals=sh.getDataRange().getValues();if(!vals.length){sh.appendRow(RECORD_HEADERS);return;}const oldH=vals[0].map(String),rows=vals.slice(1);const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{const o={};oldH.forEach((h,i)=>o[h]=r[i]);if(!o.areaId&&o.branchId==='branch_fukuoka_1')o.areaId='area_higashi';return RECORD_HEADERS.map(h=>o[h]??'');});sh.clearContents();sh.getRange(1,1,1,RECORD_HEADERS.length).setValues([RECORD_HEADERS]);if(mapped.length)sh.getRange(2,1,mapped.length,RECORD_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);}


// Ver.1 の「訪問記録」を Ver.2.1.2 の Records に移行します。1回だけ実行してください。
// 元シートは削除せず、さらにバックアップコピーも作成します。
function migrateLegacyVisits(){
  const ss=SpreadsheetApp.getActive();
  const legacy=ss.getSheetByName('訪問記録');
  if(!legacy)throw Error('「訪問記録」シートが見つかりません');
  if(legacy.getLastRow()<2)return '移行対象の訪問記録はありません';

  // バックアップは同名がなければ1回だけ作成
  const backupName='訪問記録_backup_before_v212';
  if(!ss.getSheetByName(backupName)) legacy.copyTo(ss).setName(backupName);

  // Records を最新ヘッダーへ揃える（既存データは保持）
  migrateRecordsToV212_(ss);
  const target=ss.getSheetByName(SHEETS.RECORDS);

  const values=legacy.getDataRange().getValues();
  const headers=values[0].map(String);
  const rows=values.slice(1).filter(r=>r.some(v=>v!==''));
  const existingIds=new Set(rows_(SHEETS.RECORDS).map(r=>String(r.id)));
  let added=0, skipped=0;

  const get=(o,...keys)=>{for(const k of keys){if(k in o && o[k]!=='' && o[k]!==null && o[k]!==undefined)return o[k];}return '';};
  const toIso=v=>{
    if(v instanceof Date && !isNaN(v)) return v.toISOString();
    if(!v)return '';
    const d=new Date(v); return isNaN(d)?String(v):d.toISOString();
  };
  const toDateOnly=v=>{
    if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v,Session.getScriptTimeZone()||'Asia/Tokyo','yyyy-MM-dd');
    return String(v||'');
  };
  const toTime=v=>{
    if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v,Session.getScriptTimeZone()||'Asia/Tokyo','HH:mm');
    return String(v||'');
  };

  for(const row of rows){
    const o={}; headers.forEach((h,i)=>o[h]=row[i]);
    const legacyId=String(get(o,'ID','id')||uuid_());
    if(existingIds.has(legacyId)){skipped++;continue;}

    const createdAt=toIso(get(o,'登録日時','createdAt'))||now_();
    const updatedAt=toIso(get(o,'更新日時','updatedAt'))||createdAt;
    const rec={
      id:legacyId,
      branchId:'branch_fukuoka_1',
      areaId:'area_higashi',
      contactId:'',
      lat:get(o,'緯度','lat'),
      lng:get(o,'経度','lng'),
      area:get(o,'エリア','area'),
      address:get(o,'住所表示','address'),
      fullAddress:get(o,'フル住所','fullAddress'),
      personName:get(o,'名前','personName'),
      status:get(o,'状態','status')||'unvisited',
      type:get(o,'対象種別','type')||'戸建て',
      household:get(o,'世帯属性','household'),
      contact:get(o,'接触相手','contact'),
      revisitPriority:get(o,'再訪優先度','revisitPriority'),
      referrer:get(o,'紹介者','referrer'),
      supporter:get(o,'支持者候補','supporter'),
      warning:truth_(get(o,'注意','warning')),
      warningMemo:get(o,'注意メモ','warningMemo'),
      signboard:truth_(get(o,'看板','signboard')),
      posterParty:get(o,'ポスター','posterParty'),
      posterMemo:get(o,'ポスターメモ','posterMemo'),
      memo:get(o,'メモ','memo'),
      date:toDateOnly(get(o,'訪問日','date')),
      startTime:toTime(get(o,'訪問開始','startTime')),
      endTime:toTime(get(o,'訪問終了','endTime')),
      durationMinutes:get(o,'滞在時間(分)','durationMinutes'),
      googleMapsUrl:get(o,'GoogleマップURL','googleMapsUrl'),
      assigneeId:'',
      assigneeName:get(o,'担当者','assigneeName'),
      createdAt,
      updatedAt,
      updatedBy:get(o,'更新者','updatedBy')||get(o,'担当者','assigneeName')||'legacy'
    };
    target.appendRow(RECORD_HEADERS.map(h=>rec[h]??''));
    existingIds.add(legacyId); added++;
  }
  return `旧訪問記録の移行完了：${added}件追加、${skipped}件スキップ。バックアップ：${backupName}`;
}

function migrateRecordsToV212_(ss){
  let sh=ss.getSheetByName(SHEETS.RECORDS);
  if(!sh){sh=ss.insertSheet(SHEETS.RECORDS);sh.appendRow(RECORD_HEADERS);return;}
  const vals=sh.getDataRange().getValues();
  if(!vals.length){sh.appendRow(RECORD_HEADERS);return;}
  const oldH=vals[0].map(String), rows=vals.slice(1);
  const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{
    const o={};oldH.forEach((h,i)=>o[h]=r[i]);
    if(!o.areaId&&o.branchId==='branch_fukuoka_1')o.areaId='area_higashi';
    return RECORD_HEADERS.map(h=>o[h]??'');
  });
  sh.clearContents();
  sh.getRange(1,1,1,RECORD_HEADERS.length).setValues([RECORD_HEADERS]);
  if(mapped.length)sh.getRange(2,1,mapped.length,RECORD_HEADERS.length).setValues(mapped);
  sh.setFrozenRows(1);
}

function login_(p){cleanupSessions_();const id=String(p.loginId||'').trim(),pw=String(p.password||'');if(!id||!pw)throw Error('ユーザーIDとパスワードを入力してください');const users=rows_(SHEETS.USERS);const u=users.find(x=>String(x.loginId)===id&&truth_(x.active));if(!u||hash_(pw,u.salt)!==u.passwordHash)throw Error('ユーザーIDまたはパスワードが違います');const branch=rows_(SHEETS.BRANCHES).find(b=>b.branchId===u.branchId)||{};const token=uuid_()+uuid_();const expires=new Date(Date.now()+1000*60*60*12).toISOString();SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS).appendRow([token,u.userId,expires,now_()]);return{ok:true,session:{token,userId:u.userId,loginId:u.loginId,name:u.name,role:u.role,branchId:u.branchId,branchName:branch.name||'全支部',mustChangePassword:truth_(u.mustChangePassword),expiresAt:expires}};}
function auth_(token){if(!token)throw Error('セッションがありません');cleanupSessions_();const s=rows_(SHEETS.SESSIONS).find(x=>x.token===token);if(!s||new Date(s.expiresAt)<=new Date())throw Error('セッションの有効期限が切れました');const u=rows_(SHEETS.USERS).find(x=>x.userId===s.userId&&truth_(x.active));if(!u)throw Error('利用者が無効です');return u;}
function bootstrap_(u){const branches=visibleBranches_(u),areas=visibleAreas_(u);return{ok:true,branches,areas};}
function visibleBranches_(u){const all=rows_(SHEETS.BRANCHES).filter(x=>truth_(x.active));return isGlobal_(u)?all:all.filter(x=>x.branchId===u.branchId);}
function visibleAreas_(u){const ids=new Set(visibleBranches_(u).map(x=>String(x.branchId)));return rows_(SHEETS.AREAS).filter(x=>truth_(x.active)&&ids.has(String(x.branchId)));}
function allowedArea_(u,areaId){if(!areaId)return null;const a=rows_(SHEETS.AREAS).find(x=>String(x.areaId)===String(areaId)&&truth_(x.active));if(!a||(!isGlobal_(u)&&String(a.branchId)!==String(u.branchId)))throw Error('この活動エリアにはアクセスできません');return a;}

function listRecords_(u,p){const areaId=String(p.areaId||'');if(areaId)allowedArea_(u,areaId);let all=rows_(SHEETS.RECORDS);if(!isGlobal_(u))all=all.filter(r=>String(r.branchId)===String(u.branchId));if(areaId)all=all.filter(r=>String(r.areaId)===areaId);return{ok:true,records:all};}
function saveRecord_(u,r){if(!r.fullAddress)throw Error('住所を入力してください');const area=allowedArea_(u,r.areaId);if(!area)throw Error('活動エリアを選択してください');const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS),all=rowsWithRow_(SHEETS.RECORDS);let old=all.find(x=>String(x.id)===String(r.id));if(old&&!canAccessRecord_(u,old))throw Error('この記録は編集できません');if(old&&r.updatedAt&&String(old.updatedAt)!==String(r.updatedAt))throw Error('他の利用者が先に更新しました。最新表示後に編集してください');const now=now_(),branchId=old?old.branchId:area.branchId;const item={id:old?old.id:uuid_(),branchId,areaId:old?old.areaId:area.areaId,contactId:r.contactId||old?.contactId||'',lat:r.lat,lng:r.lng,area:r.area||'',address:r.address||'',fullAddress:r.fullAddress,personName:r.personName||'',status:r.status||'unvisited',type:r.type||'戸建て',household:r.household||'',contact:r.contact||'',revisitPriority:r.revisitPriority||'',referrer:r.referrer||'',supporter:r.supporter||'',warning:truth_(r.warning),warningMemo:r.warningMemo||'',signboard:truth_(r.signboard),posterParty:r.posterParty||'',posterMemo:r.posterMemo||'',memo:r.memo||'',date:r.date||'',startTime:r.startTime||'',endTime:r.endTime||'',durationMinutes:r.durationMinutes||'',googleMapsUrl:r.googleMapsUrl||'',assigneeId:old?old.assigneeId:u.userId,assigneeName:old?old.assigneeName:u.name,createdAt:old?old.createdAt:now,updatedAt:now,updatedBy:u.name};const vals=RECORD_HEADERS.map(h=>item[h]??'');if(old)sh.getRange(old._row,1,1,vals.length).setValues([vals]);else sh.appendRow(vals);return{ok:true,record:item};}
function deleteRecord_(u,p){const all=rowsWithRow_(SHEETS.RECORDS),old=all.find(x=>String(x.id)===String(p.recordId));if(!old)return{ok:true};if(!canAccessRecord_(u,old))throw Error('削除できません');if(p.updatedAt&&String(old.updatedAt)!==String(p.updatedAt))throw Error('他の利用者が先に更新しました');SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS).deleteRow(old._row);return{ok:true};}

function listContacts_(u,p){const areaId=String(p.areaId||'');if(areaId)allowedArea_(u,areaId);let all=rows_(SHEETS.CONTACTS);if(!isGlobal_(u))all=all.filter(r=>String(r.branchId)===String(u.branchId));if(areaId)all=all.filter(r=>String(r.areaId)===areaId);return{ok:true,contacts:all};}
function saveContact_(u,c){if(!c.name)throw Error('氏名・呼び名を入力してください');const area=allowedArea_(u,c.areaId);if(!area)throw Error('活動エリアを選択してください');const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.CONTACTS),all=rowsWithRow_(SHEETS.CONTACTS);let old=all.find(x=>String(x.contactId)===String(c.contactId));if(old&&!canAccessBranch_(u,old.branchId))throw Error('この名簿は編集できません');if(old&&c.updatedAt&&String(old.updatedAt)!==String(c.updatedAt))throw Error('他の利用者が先に更新しました');const now=now_();const item={contactId:old?old.contactId:uuid_(),branchId:old?old.branchId:area.branchId,areaId:old?old.areaId:area.areaId,name:c.name,fullAddress:c.fullAddress||'',phone:c.phone||'',referrer:c.referrer||'',supporter:c.supporter||'',assigneeId:old?old.assigneeId:u.userId,assigneeName:old?old.assigneeName:u.name,memo:c.memo||'',createdAt:old?old.createdAt:now,updatedAt:now,updatedBy:u.name};const vals=CONTACT_HEADERS.map(h=>item[h]??'');if(old)sh.getRange(old._row,1,1,vals.length).setValues([vals]);else sh.appendRow(vals);return{ok:true,contact:item};}
function deleteContact_(u,p){const all=rowsWithRow_(SHEETS.CONTACTS),old=all.find(x=>String(x.contactId)===String(p.contactId));if(!old)return{ok:true};if(!canAccessBranch_(u,old.branchId))throw Error('削除できません');if(rows_(SHEETS.RECORDS).some(r=>String(r.contactId)===String(old.contactId)))throw Error('訪問記録に紐づいているため削除できません');SpreadsheetApp.getActive().getSheetByName(SHEETS.CONTACTS).deleteRow(old._row);return{ok:true};}

function adminData_(u){requireAdmin_(u);const branches=visibleBranches_(u),areas=visibleAreas_(u);let users=rows_(SHEETS.USERS);if(u.role==='leader')users=users.filter(x=>x.branchId===u.branchId);const bm=Object.fromEntries(rows_(SHEETS.BRANCHES).map(b=>[b.branchId,b.name]));return{ok:true,branches,areas,users:users.map(x=>({userId:x.userId,loginId:x.loginId,name:x.name,role:x.role,branchId:x.branchId,branchName:bm[x.branchId]||'全支部',active:truth_(x.active),mustChangePassword:truth_(x.mustChangePassword)}))};}
function createUser_(u,x){requireAdmin_(u);if(!x.loginId||!x.name||!x.password)throw Error('必須項目を入力してください');validateNewPassword_(x.password);if(rows_(SHEETS.USERS).some(v=>String(v.loginId)===String(x.loginId)))throw Error('同じユーザーIDが登録されています');let role=x.role||'member',branchId=x.branchId||'';if(u.role==='leader'){role=role==='member'?'member':'leader';branchId=u.branchId;}if(!isGlobal_(u)&&branchId!==u.branchId)throw Error('他支部には登録できません');const salt=uuid_();SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS).appendRow([uuid_(),x.loginId,x.name,hash_(x.password,salt),salt,role,branchId,true,true,now_(),now_()]);return{ok:true};}

function changePassword_(u,p){
  const current=String(p.currentPassword||'');
  const next=String(p.newPassword||'');
  if(!current)throw Error('現在のパスワードを入力してください');
  validateNewPassword_(next);
  const me=rowsWithRow_(SHEETS.USERS).find(x=>String(x.userId)===String(u.userId));
  if(!me)throw Error('利用者が見つかりません');
  if(!passwordMatches_(current,me))throw Error('現在のパスワードが違います');
  if(passwordMatches_(next,me))throw Error('現在と同じパスワードは使用できません');
  setUserPassword_(me,next,false);
  deleteSessionsForUser_(u.userId,p.token);
  return{ok:true,mustChangePassword:false};
}
function resetPassword_(u,p){
  requireAdmin_(u);
  const targetId=String(p.userId||''),temp=String(p.temporaryPassword||'');
  if(!targetId)throw Error('利用者を選択してください');
  validateNewPassword_(temp);
  const target=rowsWithRow_(SHEETS.USERS).find(x=>String(x.userId)===targetId);
  if(!target)throw Error('利用者が見つかりません');
  if(u.role==='leader'&&String(target.branchId)!==String(u.branchId))throw Error('他支部の利用者は変更できません');
  if(target.role==='system_admin'&&u.role!=='system_admin')throw Error('この利用者は変更できません');
  setUserPassword_(target,temp,true);
  deleteSessionsForUser_(target.userId,'');
  return{ok:true};
}
function validateNewPassword_(pw){
  pw=String(pw||'');
  if(pw.length<10)throw Error('パスワードは10文字以上にしてください');
  if(!/[A-Za-z]/.test(pw)||!\d/.test(pw))throw Error('パスワードには英字と数字を両方含めてください');
}
function passwordMatches_(password,user){
  return String(hash_(String(password||''),String(user.salt||''))).trim()===String(user.passwordHash||'').trim();
}
function setUserPassword_(user,newPassword,mustChange){
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS);
  if(!sh)throw Error('Usersシートが見つかりません');
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const col=name=>{const i=headers.indexOf(name);if(i<0)throw Error(name+'列が見つかりません');return i+1;};
  const salt=uuid_();
  const passwordHash=hash_(newPassword,salt);
  sh.getRange(user._row,col('passwordHash')).setNumberFormat('@').setValue(passwordHash);
  sh.getRange(user._row,col('salt')).setNumberFormat('@').setValue(salt);
  sh.getRange(user._row,col('mustChangePassword')).setValue(!!mustChange);
  sh.getRange(user._row,col('updatedAt')).setValue(now_());
  SpreadsheetApp.flush();
  const savedHash=String(sh.getRange(user._row,col('passwordHash')).getDisplayValue()).trim();
  const savedSalt=String(sh.getRange(user._row,col('salt')).getDisplayValue()).trim();
  if(String(hash_(newPassword,savedSalt)).trim()!==savedHash)throw Error('パスワードの保存確認に失敗しました');
  return true;
}
function deleteSessionsForUser_(userId,keepToken){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS);if(!sh||sh.getLastRow()<2)return;const vals=sh.getDataRange().getValues();for(let i=vals.length-1;i>=1;i--){if(String(vals[i][1])===String(userId)&&String(vals[i][0])!==String(keepToken||''))sh.deleteRow(i+1);}}
function createArea_(u,x){requireAdmin_(u);let branchId=x.branchId||u.branchId;if(u.role==='leader')branchId=u.branchId;if(!branchId)throw Error('支部を選択してください');if(!x.name)throw Error('エリア名を入力してください');const areaId=x.areaId||('area_'+uuid_().slice(0,12));SpreadsheetApp.getActive().getSheetByName(SHEETS.AREAS).appendRow([areaId,branchId,x.city||'',x.name,Number(x.mapLat)||'',Number(x.mapLng)||'',true]);return{ok:true,areaId};}
function requireAdmin_(u){if(!['leader','prefecture_admin','system_admin'].includes(u.role))throw Error('管理権限がありません');}
function isGlobal_(u){return['prefecture_admin','system_admin'].includes(u.role);}
function canAccessBranch_(u,branchId){return isGlobal_(u)||String(branchId)===String(u.branchId);}
function canAccessRecord_(u,r){return canAccessBranch_(u,r.branchId);}
function ensureSheet_(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);sh.setFrozenRows(1);}
function rows_(name){return rowsWithRow_(name).map(x=>{delete x._row;return x;});}
function rowsWithRow_(name){const sh=SpreadsheetApp.getActive().getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues(),h=v.shift().map(String);return v.map((row,i)=>{const o={_row:i+2};h.forEach((k,j)=>o[k]=row[j]);return o;});}
function cleanupSessions_(){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS);if(!sh||sh.getLastRow()<2)return;const vals=sh.getDataRange().getValues();for(let i=vals.length-1;i>=1;i--)if(new Date(vals[i][2])<=new Date())sh.deleteRow(i+1);}
function hash_(password,salt){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(password),Utilities.Charset.UTF_8);return bytes.map(b=>(b+256)%256).map(b=>('0'+b.toString(16)).slice(-2)).join('');}
function uuid_(){return Utilities.getUuid().replace(/-/g,'');}function now_(){return new Date().toISOString();}function truth_(v){return v===true||String(v).toLowerCase()==='true'||v===1;}function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
