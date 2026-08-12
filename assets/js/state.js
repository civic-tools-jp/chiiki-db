"use strict";
let session=JSON.parse(localStorage.getItem("gdbv2_session")||"null"),records=[],branches=[],users=[],map,markers={},editing=null,editStatus="unvisited";
