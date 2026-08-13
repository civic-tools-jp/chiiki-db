const SHEETS={USERS:'Users',BRANCHES:'Branches',AREAS:'Areas',CONTACTS:'Contacts',RECORDS:'Records',SESSIONS:'Sessions'};
const USER_HEADERS=['userId','loginId','name','passwordHash','salt','role','branchId','areaId','active','mustChangePassword','createdAt','updatedAt'];
const BRANCH_HEADERS=['branchId','name','prefecture','active'];
const AREA_HEADERS=['areaId','branchId','city','name','mapLat','mapLng','active'];
const CONTACT_HEADERS=['contactId','branchId','areaId','partyId','lastName','firstName','lastNameKana','firstNameKana','name','phone','email','postalCode','fullAddress','memberType','birthDate','gender','occupation','approvedAt','branchParticipation','joinReason','sourceBranch','lat','lng','referrer','supporter','assigneeId','assigneeName','memo','createdAt','updatedAt','updatedBy'];
const RECORD_HEADERS=['id','branchId','areaId','contactId','lat','lng','area','address','fullAddress','personName','phone','email','status','type','household','contact','revisitPriority','referrer','supporter','warning','warningReason','warningMemo','signboard','posterParty','posterMemo','memo','date','startTime','endTime','durationMinutes','googleMapsUrl','assigneeId','assigneeName','createdAt','updatedAt','updatedBy'];
const SESSION_HEADERS=['token','userId','expiresAt','createdAt'];

function doGet(){return json_({ok:true,name:'アイサポ Ver.2.4.3 API'});}
function doPost(e){try{const p=JSON.parse((e.postData&&e.postData.contents)||'{}');if(p.action==='setup')return json_(setup_(p));if(p.action==='login')return json_(login_(p));const user=auth_(p.token);switch(p.action){
case'bootstrap':return json_(bootstrap_(user));
case'listRecords':return json_(listRecords_(user,p));case'saveRecord':return json_(saveRecord_(user,p.record||{}));case'deleteRecord':return json_(deleteRecord_(user,p));
case'listContacts':return json_(listContacts_(user,p));case'saveContact':return json_(saveContact_(user,p.contact||{}));case'deleteContact':return json_(deleteContact_(user,p));
case'adminData':return json_(adminData_(user));case'createUser':return json_(createUser_(user,p.user||{}));case'setUserArea':return json_(setUserArea_(user,p));case'createArea':return json_(createArea_(user,p.area||{}));case'importContacts':return json_(importContacts_(user,p));case'changePassword':return json_(changePassword_(user,p));case'resetPassword':return json_(resetPassword_(user,p));
default:throw Error('不明な処理です');}}catch(err){return json_({ok:false,error:String(err.message||err)});}}

// 初回用。既にVer.2をセットアップ済みなら upgradeV21() を実行してください。
function setup_(p){const ss=SpreadsheetApp.getActive();ensureSheet_(ss,SHEETS.USERS,USER_HEADERS);ensureSheet_(ss,SHEETS.BRANCHES,BRANCH_HEADERS);ensureSheet_(ss,SHEETS.AREAS,AREA_HEADERS);ensureSheet_(ss,SHEETS.CONTACTS,CONTACT_HEADERS);ensureSheet_(ss,SHEETS.RECORDS,RECORD_HEADERS);ensureSheet_(ss,SHEETS.SESSIONS,SESSION_HEADERS);
const bs=ss.getSheetByName(SHEETS.BRANCHES);if(bs.getLastRow()===1)bs.appendRow(['branch_fukuoka_1','福岡第1支部','福岡県',true]);
const as=ss.getSheetByName(SHEETS.AREAS);if(as.getLastRow()===1)as.appendRow(['area_higashi','branch_fukuoka_1','福岡市','東区',33.6452,130.4319,true]);
const us=ss.getSheetByName(SHEETS.USERS);if(us.getLastRow()===1){const salt=uuid_(),pw=p.adminPassword||'ChangeMe123!';us.appendRow([uuid_(),p.adminLoginId||'admin',p.adminName||'管理者',hash_(pw,salt),salt,'system_admin','','',true,false,now_(),now_()]);}return{ok:true,message:'初期設定が完了しました'};}

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

function login_(p){cleanupSessions_();const id=String(p.loginId||'').trim(),pw=String(p.password||'');if(!id||!pw)throw Error('ユーザーIDとパスワードを入力してください');const users=rows_(SHEETS.USERS);const u=users.find(x=>String(x.loginId)===id&&truth_(x.active));if(!u||!passwordMatches_(pw,u))throw Error('ユーザーIDまたはパスワードが違います');const branch=rows_(SHEETS.BRANCHES).find(b=>String(b.branchId)===String(u.branchId))||{};const token=uuid_()+uuid_();const expires=new Date(Date.now()+1000*60*60*12).toISOString();SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS).appendRow([token,u.userId,expires,now_()]);return{ok:true,session:{token,userId:u.userId,loginId:u.loginId,name:u.name,role:u.role,branchId:u.branchId,areaId:u.areaId||'',branchName:branch.name||'全支部',mustChangePassword:truth_(u.mustChangePassword),expiresAt:expires}};}
function auth_(token){if(!token)throw Error('セッションがありません');cleanupSessions_();const s=rows_(SHEETS.SESSIONS).find(x=>x.token===token);if(!s||new Date(s.expiresAt)<=new Date())throw Error('セッションの有効期限が切れました');const u=rows_(SHEETS.USERS).find(x=>x.userId===s.userId&&truth_(x.active));if(!u)throw Error('利用者が無効です');return u;}
function bootstrap_(u){const branches=visibleBranches_(u),areas=visibleAreas_(u);return{ok:true,branches,areas,defaultAreaId:u.role==='member'?String(u.areaId||''):'',areaLocked:u.role==='member'};}
function visibleBranches_(u){const all=rows_(SHEETS.BRANCHES).filter(x=>truth_(x.active));return isGlobal_(u)?all:all.filter(x=>x.branchId===u.branchId);}
function visibleAreas_(u){let all=rows_(SHEETS.AREAS).filter(x=>truth_(x.active));if(isGlobal_(u))return all;if(u.role==='member')return all.filter(x=>String(x.areaId)===String(u.areaId)&&String(x.branchId)===String(u.branchId));return all.filter(x=>String(x.branchId)===String(u.branchId));}
function allowedArea_(u,areaId){let requested=String(areaId||'');if(u.role==='member'){if(!u.areaId)throw Error('この利用者に活動エリアが設定されていません');requested=String(u.areaId);}if(!requested)return null;const a=rows_(SHEETS.AREAS).find(x=>String(x.areaId)===requested&&truth_(x.active));if(!a)throw Error('活動エリアが見つかりません');if(isGlobal_(u))return a;if(String(a.branchId)!==String(u.branchId))throw Error('この活動エリアにはアクセスできません');if(u.role==='member'&&String(a.areaId)!==String(u.areaId))throw Error('この活動エリアにはアクセスできません');return a;}

function listRecords_(u,p){const area=allowedArea_(u,p.areaId||u.areaId||'');if(!area)return{ok:true,records:[]};let all=rows_(SHEETS.RECORDS).filter(r=>String(r.areaId)===String(area.areaId));if(u.role==='member')all=all.map(r=>['party_member','supporter'].includes(normalizeMemberType_(r.memberType))?{...r,fullAddress:maskContactAddress_(r.fullAddress),address:maskContactAddress_(r.address),phone:'',email:'',lat:'',lng:''}:r);return{ok:true,records:all};}
function saveRecord_(u,r){
  if(!r.fullAddress)throw Error('住所を入力してください');
  const area=allowedArea_(u,r.areaId);
  if(!area)throw Error('活動エリアを選択してください');

  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS);
  ensureHeadersByName_(sh,RECORD_HEADERS);
  const all=rowsWithRow_(SHEETS.RECORDS);
  const old=all.find(x=>String(x.id)===String(r.id));

  if(old&&!canAccessRecord_(u,old))throw Error('この記録は編集できません');
  if(old&&r.updatedAt&&String(old.updatedAt)!==String(r.updatedAt)){
    throw Error('他の利用者が先に更新しました。最新表示後に編集してください');
  }

  const now=now_();
  const item={
    id:old?old.id:uuid_(),
    branchId:old?old.branchId:area.branchId,
    areaId:old?old.areaId:area.areaId,
    contactId:r.contactId||old?.contactId||'',
    lat:r.lat,
    lng:r.lng,
    area:r.area||old?.area||'',
    address:r.address||old?.address||'',
    fullAddress:r.fullAddress,
    personName:r.personName||'',
    phone:r.phone||'',
    email:r.email||'',
    status:r.status||'unvisited',
    type:r.type||'戸建て',
    household:r.household||old?.household||'',
    contact:r.contact||old?.contact||'',
    revisitPriority:r.revisitPriority||'',
    referrer:r.referrer||'',
    supporter:r.supporter||'',
    warning:bool_(r.warning),
    warningReason:r.warningReason||'',
    warningMemo:r.warningMemo||'',
    signboard:bool_(r.signboard),
    posterParty:r.posterParty||old?.posterParty||'',
    posterMemo:r.posterMemo||old?.posterMemo||'',
    memo:r.memo||'',
    date:r.date||'',
    startTime:r.startTime||old?.startTime||'',
    endTime:r.endTime||old?.endTime||'',
    durationMinutes:r.durationMinutes||old?.durationMinutes||'',
    googleMapsUrl:r.googleMapsUrl||old?.googleMapsUrl||'',
    assigneeId:old?old.assigneeId:u.userId,
    assigneeName:old?old.assigneeName:u.name,
    createdAt:old?old.createdAt:now,
    updatedAt:now,
    updatedBy:u.name
  };

  const row=writeRecordByHeader_(sh,old?old._row:null,item);
  SpreadsheetApp.flush();

  const saved=rowsWithRow_(SHEETS.RECORDS).find(x=>x._row===row);
  if(!saved||String(saved.id)!==String(item.id))throw Error('保存確認に失敗しました');
  return{ok:true,record:item};
}
function deleteRecord_(u,p){const all=rowsWithRow_(SHEETS.RECORDS),old=all.find(x=>String(x.id)===String(p.recordId));if(!old)return{ok:true};if(!canAccessRecord_(u,old))throw Error('削除できません');if(p.updatedAt&&String(old.updatedAt)!==String(p.updatedAt))throw Error('他の利用者が先に更新しました');SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS).deleteRow(old._row);return{ok:true};}

function maskContactAddress_(v){
  const s=String(v||'').trim();
  if(!s)return'';
  const m=s.match(/^(.*?\d+丁目)/);
  if(m)return m[1];
  const n=s.search(/[0-9０-９]/);
  return n>0?s.slice(0,n):s;
}
function restrictedContactForMember_(c){
  const x=Object.assign({},c);
  x.fullAddress=maskContactAddress_(x.fullAddress);
  x.partyId='';x.phone='';x.email='';x.postalCode='';x.birthDate='';x.gender='';x.occupation='';x.approvedAt='';x.joinReason='';x.lat='';x.lng='';x.referrer='';x.memo='';
  x.restricted=true;
  return x;
}
function listContacts_(u,p){
  const area=allowedArea_(u,p.areaId||u.areaId||'');if(!area)return{ok:true,contacts:[]};
  let all=rows_(SHEETS.CONTACTS).filter(r=>String(r.areaId)===String(area.areaId));
  if(u.role==='member')all=all.map(c=>['party_member','supporter'].includes(normalizeMemberType_(c.memberType))?restrictedContactForMember_(c):c);
  return{ok:true,contacts:all};
}
function saveContact_(u,c){
  if(!c.name&&!c.lastName&&!c.firstName)throw Error('氏名・呼び名を入力してください');
  const area=allowedArea_(u,c.areaId||u.areaId||'');if(!area)throw Error('活動エリアを選択してください');
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.CONTACTS),all=rowsWithRow_(SHEETS.CONTACTS);
  let old=all.find(x=>String(x.contactId)===String(c.contactId));
  if(old&&!canAccessAreaId_(u,old.areaId))throw Error('この名簿は編集できません');
  if(old&&u.role==='member'&&['party_member','supporter'].includes(normalizeMemberType_(old.memberType)))throw Error('党員・サポーター名簿の編集は管理者のみ可能です');
  if(old&&c.updatedAt&&String(old.updatedAt)!==String(c.updatedAt))throw Error('他の利用者が先に更新しました');
  const now=now_();
  const lastName=String(c.lastName||'').trim(),firstName=String(c.firstName||'').trim();
  const displayName=String(c.name||[lastName,firstName].filter(Boolean).join(' ')).trim()||'名称未設定';
  const item={
    contactId:old?old.contactId:uuid_(),branchId:old?old.branchId:area.branchId,areaId:old?old.areaId:area.areaId,
    partyId:String(c.partyId||'').trim(),lastName,firstName,
    lastNameKana:String(c.lastNameKana||'').trim(),firstNameKana:String(c.firstNameKana||'').trim(),name:displayName,
    phone:String(c.phone||'').trim(),email:String(c.email||'').trim(),postalCode:String(c.postalCode||'').trim(),fullAddress:String(c.fullAddress||'').trim(),
    memberType:normalizeMemberType_(c.memberType),birthDate:c.birthDate||'',gender:String(c.gender||'').trim(),occupation:String(c.occupation||'').trim(),approvedAt:c.approvedAt||'',
    branchParticipation:String(c.branchParticipation||'').trim(),joinReason:String(c.joinReason||'').trim(),sourceBranch:String(c.sourceBranch||'').trim(),
    lat:c.lat||'',lng:c.lng||'',referrer:String(c.referrer||'').trim(),supporter:String(c.supporter||'').trim(),
    assigneeId:old?old.assigneeId:u.userId,assigneeName:old?old.assigneeName:u.name,memo:String(c.memo||'').trim(),
    createdAt:old?old.createdAt:now,updatedAt:now,updatedBy:u.name
  };
  const vals=CONTACT_HEADERS.map(h=>item[h]??'');if(old)sh.getRange(old._row,1,1,vals.length).setValues([vals]);else sh.appendRow(vals);
  return{ok:true,contact:item};
}
function deleteContact_(u,p){const all=rowsWithRow_(SHEETS.CONTACTS),old=all.find(x=>String(x.contactId)===String(p.contactId));if(!old)return{ok:true};if(!canAccessAreaId_(u,old.areaId))throw Error('削除できません');if(rows_(SHEETS.RECORDS).some(r=>String(r.contactId)===String(old.contactId)))throw Error('訪問記録に紐づいているため削除できません');SpreadsheetApp.getActive().getSheetByName(SHEETS.CONTACTS).deleteRow(old._row);return{ok:true};}

function adminData_(u){requireAdmin_(u);const branches=visibleBranches_(u),areas=visibleAreas_(u);let users=rows_(SHEETS.USERS);if(u.role==='leader')users=users.filter(x=>String(x.branchId)===String(u.branchId));const bm=Object.fromEntries(rows_(SHEETS.BRANCHES).map(b=>[b.branchId,b.name])),am=Object.fromEntries(rows_(SHEETS.AREAS).map(a=>[a.areaId,(a.city?a.city+' ':'')+a.name]));return{ok:true,branches,areas,users:users.map(x=>({userId:x.userId,loginId:x.loginId,name:x.name,role:x.role,branchId:x.branchId,areaId:x.areaId||'',branchName:bm[x.branchId]||'全支部',areaName:am[x.areaId]||(['prefecture_admin','system_admin','leader'].includes(x.role)?'選択可':'未設定'),active:truth_(x.active),mustChangePassword:truth_(x.mustChangePassword)}))};}
function createUser_(u,x){requireAdmin_(u);if(!x.loginId||!x.name||!x.password)throw Error('必須項目を入力してください');validateNewPassword_(x.password);if(rows_(SHEETS.USERS).some(v=>String(v.loginId)===String(x.loginId)))throw Error('同じユーザーIDが登録されています');let role=x.role||'member',branchId=x.branchId||'',areaId=x.areaId||'';if(u.role==='leader'){role=role==='member'?'member':'leader';branchId=u.branchId;}if(!isGlobal_(u)&&String(branchId)!==String(u.branchId))throw Error('他支部には登録できません');if(role==='member'){const a=rows_(SHEETS.AREAS).find(a=>String(a.areaId)===String(areaId)&&truth_(a.active));if(!a||String(a.branchId)!==String(branchId))throw Error('一般利用者には活動エリアを設定してください');}else areaId='';const salt=uuid_();SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS).appendRow([uuid_(),x.loginId,x.name,hash_(x.password,salt),salt,role,branchId,areaId,true,true,now_(),now_()]);return{ok:true};}

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
  if(!/[A-Za-z]/.test(pw)||!/\d/.test(pw))throw Error('パスワードには英字と数字を両方含めてください');
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
function canAccessAreaId_(u,areaId){try{return !!allowedArea_(u,areaId);}catch(_){return false;}}
function setUserArea_(u,p){requireAdmin_(u);const targetId=String(p.userId||''),areaId=String(p.areaId||'');const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS),all=rowsWithRow_(SHEETS.USERS),target=all.find(x=>String(x.userId)===targetId);if(!target)throw Error('利用者が見つかりません');if(target.role!=='member')throw Error('活動エリア固定は一般利用者に設定します');if(u.role==='leader'&&String(target.branchId)!==String(u.branchId))throw Error('他支部の利用者は変更できません');const a=rows_(SHEETS.AREAS).find(x=>String(x.areaId)===areaId&&truth_(x.active));if(!a||String(a.branchId)!==String(target.branchId))throw Error('所属支部の活動エリアを選択してください');if(!isGlobal_(u)&&String(a.branchId)!==String(u.branchId))throw Error('この活動エリアは設定できません');const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),c=headers.indexOf('areaId')+1;if(!c)throw Error('areaId列がありません。upgradeV22を実行してください');sh.getRange(target._row,c).setValue(areaId);return{ok:true};}
function normalizeMemberType_(v){const s=String(v||'').trim();if(['party_member','supporter','general','unknown'].includes(s))return s;if(/党員/.test(s))return'party_member';if(/サポ|support/i.test(s))return'supporter';if(/一般/.test(s))return'general';return'unknown';}
function importContacts_(u,p){
  requireAdmin_(u);
  const defaultArea=allowedArea_(u,p.areaId||'');
  if(!defaultArea)throw Error('取込時の基準エリアを選択してください');

  const input=Array.isArray(p.contacts)?p.contacts:[];
  if(!input.length)throw Error('取り込む名簿がありません');
  if(input.length>200)throw Error('1回の取込は200件までです');

  const allAreas=visibleAreas_(u).filter(a=>truth_(a.active));
  const branches=rows_(SHEETS.BRANCHES);
  const branchNameById=Object.fromEntries(branches.map(b=>[String(b.branchId),String(b.name||'')]));
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS);
  ensureHeadersByName_(sh,RECORD_HEADERS);
  const existing=rows_(SHEETS.RECORDS);

  const key=x=>String(x.partyId||'').trim()||
    [x.name,x.fullAddress,x.phone].map(v=>String(v||'').trim().toLowerCase()).join('|');
  const seen=new Set(existing.map(key));

  const geocoder=Maps.newGeocoder().setLanguage('ja').setRegion('jp');
  const rows=[];
  let skipped=0,unmatched=0,geocoded=0,geocodeFailed=0;

  function detectArea_(address,sourceBranch){
    const a=String(address||'').replace(/\s+/g,'');
    const sb=String(sourceBranch||'').trim();

    let candidates=allAreas.filter(area=>{
      const city=String(area.city||'').replace(/\s+/g,'');
      const name=String(area.name||'').replace(/\s+/g,'');
      if(!name||!a.includes(name))return false;
      if(city&&!a.includes(city))return false;
      if(sb){
        const branchName=branchNameById[String(area.branchId)]||'';
        if(branchName&&branchName!==sb)return false;
      }
      return true;
    });

    if(candidates.length===1)return candidates[0];

    // 支部名が一致しない表記でも、住所の市区が一意なら住所を優先。
    if(!candidates.length){
      candidates=allAreas.filter(area=>{
        const city=String(area.city||'').replace(/\s+/g,'');
        const name=String(area.name||'').replace(/\s+/g,'');
        return !!name&&a.includes(name)&&(!city||a.includes(city));
      });
      if(candidates.length===1)return candidates[0];
    }

    // 住所が空、または明確な区名が含まれない場合だけ現在選択中エリアを使用。
    const defaultName=String(defaultArea.name||'').replace(/\s+/g,'');
    if(!a || (defaultName&&a.includes(defaultName)))return defaultArea;
    return null;
  }

  for(const raw of input){
    const lastName=String(raw.lastName||'').trim();
    const firstName=String(raw.firstName||'').trim();
    const name=String(raw.name||[lastName,firstName].filter(Boolean).join(' ')).trim();
    const address=String(raw.fullAddress||'').trim();
    if(!name&&!address){skipped++;continue;}

    const targetArea=detectArea_(address,raw.sourceBranch)||defaultArea;
    if(!detectArea_(address,raw.sourceBranch))unmatched++;

    let lat=Number(raw.lat)||'',lng=Number(raw.lng)||'';
    if(address && (!lat||!lng)){
      try{
        const geo=geocoder.geocode(address);
        const result=geo&&geo.results&&geo.results[0];
        if(result&&result.geometry&&result.geometry.location){
          lat=Number(result.geometry.location.lat)||'';
          lng=Number(result.geometry.location.lng)||'';
          if(lat&&lng)geocoded++;else geocodeFailed++;
        }else{
          geocodeFailed++;
        }
      }catch(e){
        geocodeFailed++;
      }
    }

    const item={
      id:uuid_(),branchId:targetArea.branchId,areaId:targetArea.areaId,source:'import',
      memberType:normalizeMemberType_(raw.memberType),partyId:String(raw.partyId||'').trim(),
      lastName,firstName,lastNameKana:String(raw.lastNameKana||'').trim(),firstNameKana:String(raw.firstNameKana||'').trim(),
      postalCode:String(raw.postalCode||'').trim(),birthDate:raw.birthDate||'',gender:String(raw.gender||'').trim(),
      occupation:String(raw.occupation||'').trim(),approvedAt:raw.approvedAt||'',branchParticipation:String(raw.branchParticipation||'').trim(),
      joinReason:String(raw.joinReason||'').trim(),sourceBranch:String(raw.sourceBranch||'').trim(),contactId:'',
      lat,lng,area:'',address:'',fullAddress:address,personName:name||'名称未設定',
      phone:String(raw.phone||'').trim(),email:String(raw.email||'').trim(),status:'unvisited',type:'戸建て',
      household:'',contact:'',revisitPriority:'',referrer:String(raw.referrer||'').trim(),supporter:String(raw.supporter||'').trim(),
      warning:false,warningReason:'',warningMemo:'',signboard:'',posterParty:'',posterMemo:'',
      memo:String(raw.memo||'').trim(),date:'',startTime:'',endTime:'',durationMinutes:'',googleMapsUrl:'',
      assigneeId:u.userId,assigneeName:u.name,createdAt:now_(),updatedAt:now_(),updatedBy:u.name
    };

    const k=key(item);
    if(seen.has(k)){skipped++;continue;}
    seen.add(k);
    rows.push(RECORD_HEADERS.map(h=>item[h]??''));
  }

  if(rows.length){
    sh.getRange(sh.getLastRow()+1,1,rows.length,RECORD_HEADERS.length).setValues(rows);
  }
  return{ok:true,added:rows.length,skipped,unmatched,geocoded,geocodeFailed};
}
function createArea_(u,x){requireAdmin_(u);let branchId=x.branchId||u.branchId;if(u.role==='leader')branchId=u.branchId;if(!branchId)throw Error('支部を選択してください');if(!x.name)throw Error('エリア名を入力してください');const areaId=x.areaId||('area_'+uuid_().slice(0,12));SpreadsheetApp.getActive().getSheetByName(SHEETS.AREAS).appendRow([areaId,branchId,x.city||'',x.name,Number(x.mapLat)||'',Number(x.mapLng)||'',true]);return{ok:true,areaId};}
function requireAdmin_(u){if(!['leader','prefecture_admin','system_admin'].includes(u.role))throw Error('管理権限がありません');}
function isGlobal_(u){return['prefecture_admin','system_admin'].includes(u.role);}
function canAccessBranch_(u,branchId){return isGlobal_(u)||String(branchId)===String(u.branchId);}
function canAccessRecord_(u,r){return canAccessAreaId_(u,r.areaId);}

function bool_(v){return v===true||v===1||String(v||'').toLowerCase()==='true';}
function dateKey_(v){
  if(v===null||v===undefined||v==='')return '';
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v)){
    return Utilities.formatDate(v,Session.getScriptTimeZone()||'Asia/Tokyo','yyyy-MM-dd');
  }
  const s=String(v).trim();
  const m=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
  const d=new Date(s);
  if(!isNaN(d))return Utilities.formatDate(d,Session.getScriptTimeZone()||'Asia/Tokyo','yyyy-MM-dd');
  return s;
}


function ensureHeadersByName_(sh,requiredHeaders){
  if(sh.getLastRow()===0){
    sh.getRange(1,1,1,requiredHeaders.length).setValues([requiredHeaders]);
    sh.setFrozenRows(1);
    return requiredHeaders.slice();
  }
  let headers=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
  requiredHeaders.forEach(h=>{
    if(!headers.includes(h)){
      headers.push(h);
      sh.getRange(1,headers.length).setValue(h);
    }
  });
  sh.setFrozenRows(1);
  return headers;
}

function writeRecordByHeader_(sh,rowNumber,item){
  const headers=ensureHeadersByName_(sh,RECORD_HEADERS);
  const width=headers.length;
  let values=new Array(width).fill('');
  if(rowNumber && rowNumber<=sh.getLastRow()){
    values=sh.getRange(rowNumber,1,1,width).getValues()[0];
  }else{
    rowNumber=sh.getLastRow()+1;
  }
  RECORD_HEADERS.forEach(h=>{
    const c=headers.indexOf(h);
    if(c>=0)values[c]=item[h]??'';
  });
  // 電話番号・メール・ID等がGoogle Sheetsに自動変換されないよう文字列列を明示
  ['id','branchId','areaId','contactId','personName','phone','email','status','type',
   'household','contact','revisitPriority','referrer','supporter','warningReason',
   'warningMemo','posterParty','posterMemo','memo','googleMapsUrl','assigneeId',
   'assigneeName','updatedBy'].forEach(h=>{
      const c=headers.indexOf(h);
      if(c>=0)sh.getRange(rowNumber,c+1).setNumberFormat('@');
  });
  sh.getRange(rowNumber,1,1,width).setValues([values]);
  return rowNumber;
}

function backupRecordsV235_(){
  const ss=SpreadsheetApp.getActive();
  const src=ss.getSheetByName(SHEETS.RECORDS);
  if(!src)return '';
  let name='Records_backup_before_v235',n=2;
  while(ss.getSheetByName(name))name='Records_backup_before_v235_'+(n++);
  src.copyTo(ss).setName(name);
  return name;
}

function ensureSheet_(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);sh.setFrozenRows(1);}
function rows_(name){return rowsWithRow_(name).map(x=>{delete x._row;return x;});}
function rowsWithRow_(name){const sh=SpreadsheetApp.getActive().getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues(),h=v.shift().map(String);return v.map((row,i)=>{const o={_row:i+2};h.forEach((k,j)=>o[k]=row[j]);return o;});}
function cleanupSessions_(){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS);if(!sh||sh.getLastRow()<2)return;const vals=sh.getDataRange().getValues();for(let i=vals.length-1;i>=1;i--)if(new Date(vals[i][2])<=new Date())sh.deleteRow(i+1);}
function hash_(password,salt){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(password),Utilities.Charset.UTF_8);return bytes.map(b=>(b+256)%256).map(b=>('0'+b.toString(16)).slice(-2)).join('');}
function uuid_(){return Utilities.getUuid().replace(/-/g,'');}function now_(){return new Date().toISOString();}function truth_(v){return v===true||String(v).toLowerCase()==='true'||v===1;}function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}

// Ver.2.2: ユーザー固定エリア・名簿拡張。1回だけ実行してください。
function upgradeV22(){
  const ss=SpreadsheetApp.getActive();
  migrateUsersV22_(ss);
  migrateContactsV22_(ss);
  return 'アイサポ Ver.2.2 への移行が完了しました';
}
function migrateUsersV22_(ss){
  let sh=ss.getSheetByName(SHEETS.USERS);
  if(!sh){sh=ss.insertSheet(SHEETS.USERS);sh.appendRow(USER_HEADERS);return;}
  const vals=sh.getDataRange().getValues();
  if(!vals.length){sh.appendRow(USER_HEADERS);return;}
  const oldH=vals[0].map(String), rows=vals.slice(1), allAreas=rowsFromSheet_(ss,SHEETS.AREAS);
  const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{
    const o={};oldH.forEach((h,i)=>o[h]=r[i]);
    if((o.role==='member')&&!o.areaId&&o.branchId){
      const aa=allAreas.filter(a=>String(a.branchId)===String(o.branchId)&&truth_(a.active));
      if(aa.length===1)o.areaId=aa[0].areaId;
    }
    return USER_HEADERS.map(h=>o[h]??'');
  });
  sh.clearContents();sh.getRange(1,1,1,USER_HEADERS.length).setValues([USER_HEADERS]);
  if(mapped.length)sh.getRange(2,1,mapped.length,USER_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);
}
function migrateContactsV22_(ss){
  let sh=ss.getSheetByName(SHEETS.CONTACTS);
  if(!sh){sh=ss.insertSheet(SHEETS.CONTACTS);sh.appendRow(CONTACT_HEADERS);return;}
  const vals=sh.getDataRange().getValues();
  if(!vals.length){sh.appendRow(CONTACT_HEADERS);return;}
  const oldH=vals[0].map(String),rows=vals.slice(1);
  const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{const o={};oldH.forEach((h,i)=>o[h]=r[i]);return CONTACT_HEADERS.map(h=>o[h]??'');});
  sh.clearContents();sh.getRange(1,1,1,CONTACT_HEADERS.length).setValues([CONTACT_HEADERS]);
  if(mapped.length)sh.getRange(2,1,mapped.length,CONTACT_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);
}

// Ver.2.3: 党員名簿正式項目・通常訪問先の電話/メールを追加。1回だけ実行してください。
function upgradeV23(){
  const ss=SpreadsheetApp.getActive();
  migrateContactsV23_(ss);
  migrateRecordsV23_(ss);
  return 'アイサポ Ver.2.3 への移行が完了しました';
}
function migrateContactsV23_(ss){
  let sh=ss.getSheetByName(SHEETS.CONTACTS);
  if(!sh){sh=ss.insertSheet(SHEETS.CONTACTS);sh.appendRow(CONTACT_HEADERS);return;}
  const vals=sh.getDataRange().getValues();if(!vals.length){sh.appendRow(CONTACT_HEADERS);return;}
  const oldH=vals[0].map(String),rows=vals.slice(1);
  const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{
    const o={};oldH.forEach((h,i)=>o[h]=r[i]);
    if(!o.name)o.name=[o.lastName,o.firstName].filter(Boolean).join(' ');
    return CONTACT_HEADERS.map(h=>o[h]??'');
  });
  sh.clearContents();sh.getRange(1,1,1,CONTACT_HEADERS.length).setValues([CONTACT_HEADERS]);
  if(mapped.length)sh.getRange(2,1,mapped.length,CONTACT_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);
}
function migrateRecordsV23_(ss){
  let sh=ss.getSheetByName(SHEETS.RECORDS);
  if(!sh){sh=ss.insertSheet(SHEETS.RECORDS);sh.appendRow(RECORD_HEADERS);return;}
  const vals=sh.getDataRange().getValues();if(!vals.length){sh.appendRow(RECORD_HEADERS);return;}
  const oldH=vals[0].map(String),rows=vals.slice(1);
  const mapped=rows.filter(r=>r.some(v=>v!=='')) .map(r=>{const o={};oldH.forEach((h,i)=>o[h]=r[i]);return RECORD_HEADERS.map(h=>o[h]??'');});
  sh.clearContents();sh.getRange(1,1,1,RECORD_HEADERS.length).setValues([RECORD_HEADERS]);
  if(mapped.length)sh.getRange(2,1,mapped.length,RECORD_HEADERS.length).setValues(mapped);sh.setFrozenRows(1);
}

function rowsFromSheet_(ss,name){const sh=ss.getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues(),h=v.shift().map(String);return v.map(row=>{const o={};h.forEach((k,j)=>o[k]=row[j]);return o;});}


function repairRecordsV235(){
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName(SHEETS.RECORDS);
  if(!sh)throw Error('Recordsシートが見つかりません');
  const backup=backupRecordsV235_();

  ensureHeadersByName_(sh,RECORD_HEADERS);
  const values=sh.getDataRange().getValues();
  const headers=values[0].map(String);
  const col=n=>headers.indexOf(n);
  const statusVals=['unvisited','visited','good','absent','revisit','refused','未訪問','訪問済','訪問済み','手応えあり','不在','要再訪','断られた'];
  const typeVals=['戸建て','集合住宅','事業所','その他'];
  const supporterVals=['','◎有力','○可能性あり','△様子見','×なし'];

  let fixed=0;
  for(let i=1;i<values.length;i++){
    const row=values[i];
    let changed=false;
    const get=n=>{const c=col(n);return c>=0?(row[c]??''):'';};
    const set=(n,v)=>{const c=col(n);if(c>=0)row[c]=v;};

    // phone/status, email/type shifted rows
    const phone=String(get('phone')).trim(), email=String(get('email')).trim();
    if(statusVals.includes(phone)&&typeVals.includes(email)){
      set('status',phone);
      set('type',email);
      set('phone','');
      set('email','');
      changed=true;
    }

    // referrer TRUE/FALSE + supporter free text = warning + warning memo
    const ref=String(get('referrer')).trim(), sup=String(get('supporter')).trim();
    if(['TRUE','FALSE','true','false','1','0'].includes(ref) && !supporterVals.includes(sup)){
      set('warning',['TRUE','true','1'].includes(ref));
      if(!String(get('warningMemo')).trim())set('warningMemo',sup);
      set('referrer','');
      set('supporter','');
      changed=true;
    }

    if(changed){
      sh.getRange(i+1,1,1,headers.length).setValues([row]);
      fixed++;
    }
  }
  SpreadsheetApp.flush();
  return '修復完了: '+fixed+'件 / バックアップ: '+backup;
}

function upgradeV235(){
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName(SHEETS.RECORDS);
  ensureHeadersByName_(sh,RECORD_HEADERS);
  return 'アイサポ Ver.2.3.5 保存方式へ移行しました';
}


function upgradeV237(){
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName(SHEETS.RECORDS);
  if(!sh)throw Error('Recordsシートが見つかりません');

  let backup='Records_backup_before_v237',n=2;
  while(ss.getSheetByName(backup))backup='Records_backup_before_v237_'+(n++);
  sh.copyTo(ss).setName(backup);

  const vals=sh.getDataRange().getValues();
  if(!vals.length){
    sh.getRange(1,1,1,RECORD_HEADERS.length).setValues([RECORD_HEADERS]);
    sh.setFrozenRows(1);
    return 'Ver.2.3.7へ移行しました / バックアップ: '+backup;
  }

  const oldH=vals[0].map(v=>String(v).trim());
  const data=vals.slice(1).filter(r=>r.some(v=>v!==''));
  const mapped=data.map(row=>{
    const o={};
    oldH.forEach((h,i)=>{if(h)o[h]=row[i]});
    return RECORD_HEADERS.map(h=>o[h]??'');
  });

  sh.clearContents();
  sh.getRange(1,1,1,RECORD_HEADERS.length).setValues([RECORD_HEADERS]);
  if(mapped.length)sh.getRange(2,1,mapped.length,RECORD_HEADERS.length).setValues(mapped);
  sh.setFrozenRows(1);
  SpreadsheetApp.flush();
  return 'Ver.2.3.7へ移行しました: '+mapped.length+'件 / バックアップ: '+backup;
}


function upgradeV244(){
  const ss=SpreadsheetApp.getActive();
  ensureSheet_(ss,SHEETS.RECORDS,RECORD_HEADERS);
  ensureHeadersByName_(ss.getSheetByName(SHEETS.RECORDS),RECORD_HEADERS);
  const old=rows_(SHEETS.CONTACTS);
  const existing=rows_(SHEETS.RECORDS);
  const key=x=>String(x.partyId||'').trim()||[x.personName||x.name,x.fullAddress,x.phone].map(v=>String(v||'').trim().toLowerCase()).join('|');
  const seen=new Set(existing.map(key));
  const sh=ss.getSheetByName(SHEETS.RECORDS);
  const out=[];
  old.forEach(c=>{
    const item={id:uuid_(),branchId:c.branchId||'',areaId:c.areaId||'',source:'import',memberType:normalizeMemberType_(c.memberType),
      partyId:c.partyId||'',lastName:c.lastName||'',firstName:c.firstName||'',lastNameKana:c.lastNameKana||'',firstNameKana:c.firstNameKana||'',
      postalCode:c.postalCode||'',birthDate:c.birthDate||'',gender:c.gender||'',occupation:c.occupation||'',approvedAt:c.approvedAt||'',
      branchParticipation:c.branchParticipation||'',joinReason:c.joinReason||'',sourceBranch:c.sourceBranch||'',contactId:'',
      lat:c.lat||'',lng:c.lng||'',area:'',address:'',fullAddress:c.fullAddress||'',personName:c.name||'',phone:c.phone||'',email:c.email||'',
      status:'unvisited',type:'戸建て',household:'',contact:'',revisitPriority:'',referrer:c.referrer||'',supporter:c.supporter||'',
      warning:false,warningReason:'',warningMemo:'',signboard:'',posterParty:'',posterMemo:'',memo:c.memo||'',date:'',startTime:'',endTime:'',
      durationMinutes:'',googleMapsUrl:'',assigneeId:c.assigneeId||'',assigneeName:c.assigneeName||'',createdAt:c.createdAt||now_(),updatedAt:now_(),updatedBy:'upgradeV244'};
    const k=key(item); if(!seen.has(k)){seen.add(k);out.push(RECORD_HEADERS.map(h=>item[h]??''));}
  });
  if(out.length)sh.getRange(sh.getLastRow()+1,1,out.length,RECORD_HEADERS.length).setValues(out);
  return 'Ver.2.4.4移行完了：'+out.length+'件をRecordsへ移行';
}


function repairV244MemberTypes(){
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS);
  if(!sh)return 'Recordsシートがありません';
  ensureHeadersByName_(sh,RECORD_HEADERS);
  const vals=sh.getDataRange().getValues();
  if(vals.length<2)return '修正対象なし';
  const h=vals[0].map(String);
  const idx=Object.fromEntries(h.map((x,i)=>[x,i]));
  let changed=0;
  for(let r=1;r<vals.length;r++){
    const row=vals[r];
    let mt=String(row[idx.memberType]||'').trim();
    if(mt==='party_member'||mt==='supporter'||mt==='general')continue;
    const raw=[row[idx.memo],row[idx.personName],row[idx.sourceBranch]].map(x=>String(x||'')).join(' ');
    if(/サポ|support/i.test(raw)){ row[idx.memberType]='supporter'; changed++; }
    else if(/党員|会員|member/i.test(raw)){ row[idx.memberType]='party_member'; changed++; }
  }
  if(changed)sh.getRange(2,1,vals.length-1,vals[0].length).setValues(vals.slice(1));
  return '区分修正：'+changed+'件';
}
