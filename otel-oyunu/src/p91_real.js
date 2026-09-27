
// =====================================================================
// GERÇEKÇİLİK: dolu odanın kapısı kapalı (geçilmez), misafir odada
// uyanıkken bir şeyle uğraşır (uzanır, TV, okur, çalışır, banyo, pencere)
// =====================================================================

// ---------- kapılar ----------
// dolu odada hedef: kapının önü (içeri girilmez), boş odada: oda içi
function roomReach(id){ const sp=roomSpots(id); return RT(id).guest&&!state.rooms[id].broken?{x:sp.door.x,z:roomInfo(id).z+RD/2+0.45,f:sp.door.f}:sp.stand; }
function doorWant(id){ const R=RT(id), s=state.rooms[id], g=R.guest; return !!(g&&g.inRoom&&g.state==='room'&&!s.broken); }
function someoneInDoor(id){
  const ri=roomInfo(id), hd=RD/2, near=e=>e&&e.f===ri.f&&Math.abs(e.x-ri.x)<1.5&&e.z>ri.z-hd-0.1&&e.z<ri.z+hd+0.35;
  if(near(player)) return true; for(const e of staffEnts) if(near(e)) return true;
  const own=RT(id).guest; for(const g of guests) if(g!==own&&near(g)) return true; return false;
}
function makeDoor(R){
  const hd=RD/2, wood=tmat('woodDark',1,1), mk=sd=>{ const pv=new THREE.Group(), T=new THREE.Group(); pv.position.set(sd*0.7,0,hd-0.06);
    T.add(mesh(rbox(0.68,0.5,0.05,.02),wood,-sd*0.35,0.27,0,true)); T.add(mesh(box(0.5,0.03,0.055),M.gold,-sd*0.35,0.46,0)); T.add(mesh(sph(0.03,8,6),M.gold,-sd*0.62,0.3,0.04)); pv.add(bake(T)); R.group.add(pv); return pv; };
  R.parts.door=[mk(-1),mk(1)]; R.parts.doorA=R.doorClosed?0:1; R.parts.doorG=R.group;
}
function setDoorCol(id,closed){ const ri=roomInfo(id), hd=RD/2; if(closed) addCols('door'+id,[[ri.f,ri.x-0.72,ri.x+0.72,ri.z+hd-0.14,ri.z+hd+0.02]]); else removeCols('door'+id); }
function updateDoors(dt){
  for(const k in state.rooms){ const id=+k, R=RT(id); if(!R.group||!R.parts) continue;
    if(!R.parts.door||R.parts.doorG!==R.group){ makeDoor(R); }
    let want=doorWant(id);
    if(want&&!R.doorClosed&&someoneInDoor(id)) want=false;          // içeride/kapıda biri varken kapatma
    if(want!==!!R.doorClosed){ R.doorClosed=want; setDoorCol(id,want); if(Sound.ctx&&state.sound!==false&&player.f===roomInfo(id).f&&d2(player.x,player.z,roomInfo(id).x,roomInfo(id).z)<64) sfx(want?'doorC':'doorO'); }
    const P=R.parts, tgt=R.doorClosed?0:1; P.doorA+=(tgt-P.doorA)*Math.min(1,dt*7);
    const a=P.doorA*Math.PI*0.5; P.door[0].rotation.y=a; P.door[1].rotation.y=-a;
  }
}

// ---------- odada aktiviteler ----------
// yerel koordinatlar (oda merkezine göre), sit pozlarında py oturma yüksekliği
function actSpots(id){
  const t=state.rooms[id].type, b=bedGeom(t), hd=RD/2, L=[];
  L.push({k:'lie',w:3,px:b.bx,pz:0.2,py:0.5,rx:-Math.PI/2,rot:0,pose:'lie',e:['📱','🎧','😌']});
  L.push({k:'bedsit',w:2,px:b.right-0.14,pz:-0.15,py:0.12,rot:Math.PI/2,pose:t==='dlx'?'sit':'sitread',e:t==='dlx'?['📺','🍿','😂']:['📖','📱','🗺️'],tv:t==='dlx'});
  if(t==='eco') L.push({k:'chair',w:3,px:0.96,pz:0.8,py:0.12,rot:Math.PI,pose:'type',e:['💻','✍️','☕']});
  if(t==='dlx') L.push({k:'arm',w:3,px:1.0,pz:0.82,py:0.02,rot:-0.7,pose:'sitread',e:['📖','☕','📰']});
  if(t==='suite') L.push({k:'sofa',w:3,px:1.16,pz:0.55,py:0.03,rot:-Math.PI/2,pose:'sitread',e:['🍷','📖','🎶']});
  L.push({k:'window',w:1,px:0.25,pz:-hd+0.62,py:0,rot:Math.PI,pose:null,e:['🌇','📸']});
  L.push({k:'bath',w:1,px:1.06,pz:-0.98,py:0,rot:0,pose:null,e:['🚿','🛁','🪥'],hide:true});
  return L;
}
const ACT_PREF={business:'chair',family:'bedsit',couple:'lie',student:'lie',elderly:'arm',vip:'sofa',influencer:'window',athlete:'bath',grumpy:'bedsit'};
function pickAct(g){ const L=actSpots(g.room), pref=ACT_PREF[g.type]; let tot=0; L.forEach(a=>{ a.ww=a.w*(a.k===pref?2.5:1)*(a.k===g.lastAct?0.3:1); tot+=a.ww; });
  let r=Math.random()*tot; for(const a of L){ r-=a.ww; if(r<=0) return a; } return L[0]; }
function standUp(g){
  if(g.room==null) return; const Rd=RT(g.room); if(Rd.doorClosed){ Rd.doorClosed=false; setDoorCol(g.room,false); }
  if(!g.act&&!g.asleep) return;
  const sp=roomSpots(g.room); g.unpose(); g.act=null; g.asleep=false; g.x=sp.stand.x; g.z=sp.stand.z; g.hidden=false;
  const R=RT(g.room); if(R.parts&&R.parts.tvOn!=null) R.parts.tvOn=false;
}
function doAct(g,a){
  const ri=roomInfo(g.room); g.act=a; g.lastAct=a.k; g.actT=rnd(12,22);
  if(a.pose) g.pose({px:ri.x+a.px,pz:ri.z+a.pz,py:a.py,rx:a.rx||0,rot:a.rot,pose:a.pose});
  else { g.unpose(); g.x=ri.x+a.px; g.z=ri.z+a.pz; g.tRot=g.rot=a.rot; }
  const R=RT(g.room); if(R.parts) R.parts.tvOn=!!a.tv;
}
function updateRoomLife(dt){
  for(const g of guests){
    if(g.state!=='room'||!g.inRoom||g.room==null){ if(g.act&&g.state!=='room'){ g.act=null; } g.hidden=false; continue; }
    if(g.asleep){ g.act=null; g.hidden=false; continue; }
    g.actT=(g.actT==null?rnd(0.5,2):g.actT)-dt;
    if(!g.act&&g.actT<=0) doAct(g,pickAct(g));
    else if(g.act&&g.actT<=0){ if(Math.random()<0.25){ standUp(g); g.actT=rnd(2,4); } else doAct(g,pickAct(g)); }
    g.hidden=!!(g.act&&g.act.hide);
    if(g.act){
      g.actFx=(g.actFx||rnd(3,6))-dt; if(g.actFx<=0){ g.actFx=rnd(5,9); if(!g.act.hide||Math.random()<0.5) fxEmoji(g.x,g.y+1.9,g.z,g.f,rand(g.act.e)); } }
  }
}
function updateReal(dt){ updateDoors(dt); updateRoomLife(dt); }
