"use strict";
let session=JSON.parse(localStorage.getItem("aisapo_session")||localStorage.getItem("gdbv2_session")||"null"),records=[],contacts=[],posters=[],branches=[],areas=[],users=[],map,markers={},editing=null,editingContact=null,editingPoster=null,editStatus="unvisited",currentAreaId=localStorage.getItem("aisapo_area")||"";
