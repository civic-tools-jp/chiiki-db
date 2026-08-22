"use strict";
window.appSession=JSON.parse(localStorage.getItem("aisapo_session")||localStorage.getItem("gdbv2_session")||"null"),records=[],contacts=[],branches=[],areas=[],users=[],map,markers={},editing=null,editingContact=null,editingPoster=null,editStatus="unvisited",currentAreaId=localStorage.getItem("aisapo_area")||"",branchMessages=[];
