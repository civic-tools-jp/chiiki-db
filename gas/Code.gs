const SHEETS={USERS:'Users',BRANCHES:'Branches',AREAS:'Areas',CONTACTS:'Contacts',RECORDS:'Records',SESSIONS:'Sessions'};
const USER_HEADERS=['userId','loginId','name','passwordHash','salt','role','branchId','areaId','active','mustChangePassword','createdAt','updatedAt'];
const BRANCH_HEADERS=['branchId','name','prefecture','active'];
const AREA_HEADERS=['areaId','branchId','city','name','mapLat','mapLng','active'];
const CONTACT_HEADERS=['contactId','branchId','areaId','partyId','lastName','firstName','lastNameKana','firstNameKana','name','phone','email','postalCode','fullAddress','memberType','birthDate','gender','occupation','approvedAt','branchParticipation','joinReason','sourceBranch','lat','lng','referrer','supporter','assigneeId','assigneeName','memo','createdAt','updatedAt','updatedBy'];
const RECORD_HEADERS=['id','branchId','areaId','contactId','lat','lng','area','address','fullAddress','personName','phone','email','status','type','household','contact','revisitPriority','referrer','supporter','warning','warningReason','warningMemo','signboard','posterParty','posterMemo','memo','date','startTime','endTime','durationMinutes','googleMapsUrl','assigneeId','assigneeName','createdAt','updatedAt','updatedBy'];
const SESSION_HEADERS=['token','userId','expiresAt','createdAt'];

function doGet(){return json_({ok:true,name:'アイサポ Ver.2.3.4a API'});}
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


function ensureHeadersByName_(sh, requiredHeaders){
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

function ensureRecordSchema_(){
  const ss=SpreadsheetApp.getActive();
  let sh=ss.getSheetByName(SHEETS.RECORDS);
  if(!sh)sh=ss.insertSheet(SHEETS.RECORDS);
  ensureHeadersByName_(sh,RECORD_HEADERS);
  return sh;
}

function writeObjectByHeaders_(sh,rowNumber,obj,requiredHeaders){
  const headers=ensureHeadersByName_(sh,requiredHeaders);
  const width=headers.length;
  let vals=new Array(width).fill('');
  if(rowNumber && rowNumber<=sh.getLastRow()){
    vals=sh.getRange(rowNumber,1,1,width).getValues()[0];
  }else{
    rowNumber=sh.getLastRow()+1;
  }
  requiredHeaders.forEach(h=>{
    const idx=headers.indexOf(h);
    if(idx>=0)vals[idx]=(obj[h]??'');
  });
  sh.getRange(rowNumber,1,1,width).setValues([vals]);
  return rowNumber;
}

function backupRecords_(suffix){
  const ss=SpreadsheetApp.getActive();
  const src=ss.getSheetByName(SHEETS.RECORDS);
  if(!src)return '';
  const base='Records_backup_'+suffix;
  let name=base,n=2;
  while(ss.getSheetByName(name))name=base+'_'+(n++);
  src.copyTo(ss).setName(name);
  return name;
}

// Ver.2.3.1以前の保存処理が、phone/email/warningReason追加前の列順で
// 現在のRecordsへ書き込んだ行だけを判定して修復します。
function repairRecordsV234(){
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName(SHEETS.RECORDS);
  if(!sh)throw Error('Recordsシートが見つかりません');

  const backupName=backupRecords_('before_v234');
  ensureRecordSchema_();

  const vals=sh.getDataRange().getValues();
  if(vals.length<2)return '修復対象はありません。バックアップ: '+backupName;

  const headers=vals[0].map(String);
  const idx=name=>headers.indexOf(name);
  const get=(row,name)=>{const i=idx(name);return i>=0?(row[i]??''):'';};
  const set=(row,name,value)=>{const i=idx(name);if(i>=0)row[i]=value;};

  const statusValues=['unvisited','visited','good','absent','revisit','refused','未訪問','訪問済','訪問済み','手応えあり','不在','要再訪','断られた'];
  const typeValues=['戸建て','集合住宅','事業所','その他'];

  let repaired=0;
  let patternA=0; // phone/email に status/type が入っている
  let patternB=0; // referrer/supporter に warning/warningMemo が入っている

  for(let r=1;r<vals.length;r++){
    const row=vals[r];
    let changed=false;

    const phone=String(get(row,'phone')).trim();
    const email=String(get(row,'email')).trim();
    const status=String(get(row,'status')).trim();
    const type=String(get(row,'type')).trim();

    // パターンA:
    // phone列に訪問状態、email列に対象種別。
    // 正しいstatus/typeが空、または phone/email と明らかに重複していない場合だけ修復。
    if(statusValues.includes(phone) && typeValues.includes(email)){
      if(!status || !statusValues.includes(status)){
        set(row,'status',phone);
      }
      if(!type || !typeValues.includes(type)){
        set(row,'type',email);
      }
      set(row,'phone','');
      set(row,'email','');
      changed=true;
      patternA++;
    }

    // パターンB:
    // referrer=TRUE/FALSE、supporter に自由記述が入っている旧ズレ。
    // supporter本来の候補値以外なら warningMemo と判定する。
    const referrer=String(get(row,'referrer')).trim();
    const supporter=String(get(row,'supporter')).trim();
    const warning=get(row,'warning');
    const warningMemo=String(get(row,'warningMemo')).trim();

    const supporterChoices=['','◎有力','○可能性あり','△様子見','×なし','◎有力候補','○可能性あり'];
    const referrerLooksBool=['TRUE','FALSE','true','false','1','0'].includes(referrer);

    if(referrerLooksBool && !supporterChoices.includes(supporter)){
      // TRUEなら訪問注意ON。FALSEは古いズレでも注意OFFなので、warningはFALSEのまま。
      set(row,'warning',(referrer==='TRUE'||referrer==='true'||referrer==='1'));
      if(!warningMemo && supporter){
        set(row,'warningMemo',supporter);
      }
      set(row,'referrer','');
      set(row,'supporter','');
      changed=true;
      patternB++;
    }

    // 追加パターン:
    // warningReason に自由記述が入り warningMemo が空の場合は、理由候補外なら warningMemoへ。
    const warningReason=String(get(row,'warningReason')).trim();
    const reasonChoices=['','強い拒否','訪問不可','時間帯注意','犬など','その他'];
    if(warningReason && !reasonChoices.includes(warningReason) && !String(get(row,'warningMemo')).trim()){
      set(row,'warningMemo',warningReason);
      set(row,'warningReason','その他');
      changed=true;
    }

    if(changed){
      sh.getRange(r+1,1,1,headers.length).setValues([row]);
      repaired++;
    }
  }

  SpreadsheetApp.flush();
  return '修復完了: '+repaired+'件'
    +' / status-type修復: '+patternA+'件'
    +' / 訪問注意修復: '+patternB+'件'
    +' / バックアップ: '+backupName;
}

// Ver.2.3.3: ヘッダー名保存方式へ移行。既存データはrepairRecordsV233()で修復してください。
function upgradeV233(){
  ensureRecordSchema_();
  return 'アイサポ Ver.2.3.3 の保存方式へ移行しました';
}


// Ver.2.3.4: データパターン別修復版
function upgradeV234(){
  ensureRecordSchema_();
  return 'アイサポ Ver.2.3.4 の保存方式へ移行しました';
}
