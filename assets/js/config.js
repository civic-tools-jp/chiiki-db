"use strict";
const SCRIPT_URL="PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const STATUS={unvisited:{label:"未訪問",color:"#94a3b8"},visited:{label:"訪問済み",color:"#3b82f6"},good:{label:"手応えあり",color:"#22c55e"},absent:{label:"不在",color:"#f59e0b"},revisit:{label:"要再訪",color:"#ef4444"},refused:{label:"断られた",color:"#6b7280"}};
const STATUS_ALIASES={
  "未訪問":"unvisited",
  "訪問済":"visited",
  "訪問済み":"visited",
  "手応えあり":"good",
  "不在":"absent",
  "要再訪":"revisit",
  "断られた":"refused"
};
function statusKey(value){
  const v=String(value||"").trim();
  return STATUS[v] ? v : (STATUS_ALIASES[v] || "unvisited");
}

