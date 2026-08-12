"use strict";
const $=id=>document.getElementById(id); const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
function msg(id,text,type="error"){$(id).innerHTML=text?`<div class="${type}">${esc(text)}</div>`:""}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
