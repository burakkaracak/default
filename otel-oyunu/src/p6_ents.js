
// =====================================================================
// ENTITIES
// =====================================================================
const ents=[]; let elevRider=null;
const VSPEED=2.4;
class Ent{
  constructor(look){ this.c=makeChar(look); this.x=0; this.z=0; this.f=0; this.y=0; this.yOff=0; this.rx=0; this.rot=0; this.tRot=0;
    this.path=null; this.pi=0; this.speed=2.2; this.onArrive=null; this.riding=false; this.anim=null; world.add(this.c.root); ents.push(this); }
  place(x,z,f){ this.x=x; this.z=z; this.f=f; this.y=f*FH; this.path=null; this.onArrive=null; }
  goTo(tf,tx,tz,cb){
    const p=route(this.f,this.x,this.z,tf,tx,tz);
    if(!p){ this.path=null; this.onArrive=null; return false; }
    this.path=p; this.pi=0; this.onArrive=cb||null; this.elevWait=false; return true;
  }
  step(dt){
    if(!this.path) return;
    let remain=this.speed*dt;
    while(remain>0&&this.path&&this.pi<this.path.length){
      const p=this.path[this.pi];
      if(p.f!==this.f||p.ride){
        if(!this.isPlayer&&elevRider&&elevRider!==this&&elevRider.riding&&!this.riding){ this.elevWait=true; remain=0; break; }
        this.elevWait=false; elevRider=this; this.riding=true; const ty=p.f*FH, dy=ty-this.y, v=VSPEED*dt*clamp(Math.abs(dy)/1.1,0.3,1.25);
        if(Math.abs(dy)<=v){ this.y=ty; this.f=p.f; this.pi++; this.riding=false; if(elevRider===this) elevRider=null; } else this.y+=Math.sign(dy)*v;
        remain=0; break;
      }
      const dx=p.x-this.x, dz=p.z-this.z, d=Math.hypot(dx,dz);
      if(d>0.001) this.tRot=Math.atan2(dx,dz);
      if(d<=remain){ this.x=p.x; this.z=p.z; remain-=d; this.pi++; }
      else { this.x+=dx/d*remain; this.z+=dz/d*remain; remain=0; }
    }
    if(this.path&&this.pi>=this.path.length){ this.path=null; const cb=this.onArrive; this.onArrive=null; if(cb) cb(); }
  }
  sync(dt){
    let dr=this.tRot-this.rot; while(dr>Math.PI) dr-=2*Math.PI; while(dr<-Math.PI) dr+=2*Math.PI; this.rot+=dr*Math.min(1,dt*12);
    const r=this.c.root; r.position.set(this.x,this.y+this.yOff,this.z); r.rotation.set(this.rx,this.rot,0);
    this.c.mode=this.anim||(this.path&&!this.riding&&!this.elevWait||this.moving?'walk':'idle'); this.c.spd=this.speed/2.3;
    if(this.sqT>0){ this.sqT=Math.max(0,this.sqT-dt); const bs=this.c.bs||(this.c.bs=r.scale.x||1), u=1-this.sqT/0.4, a=Math.sin(u*Math.PI*2.5)*(1-u)*0.22;
      r.scale.set(bs*(1+a),bs*(1-a),bs*(1+a)); if(this.sqT===0) r.scale.setScalar(bs); }
    if(this.c.face) setFace(this.c,faceFor(this));
    r.visible=floorVisible(this.y)&&!this.hidden;
    if(r.visible) animChar(this.c,dt);
  }
  pose(p){ this.x=p.px; this.z=p.pz; this.yOff=p.py||0; this.rx=p.rx||0; this.tRot=this.rot=p.rot||0; this.anim=p.pose; }
  unpose(){ this.yOff=0; this.rx=0; this.anim=null; }
  remove(){ if(elevRider===this) elevRider=null; world.remove(this.c.root); const i=ents.indexOf(this); if(i>=0) ents.splice(i,1); }
  pos(){ return {x:this.x,y:this.y,z:this.z}; }
}

// =====================================================================
// PLAYER
// =====================================================================
let player=null;
function playerSpeed(){ return 3.3*(1+0.13*state.up.speed); }
function moveCollide(e,dx,dz){
  const r=0.25;
  if(blockedAt(e.f,e.x,e.z,r)){ e.x+=dx; e.z+=dz; if(blockedAt(e.f,e.x,e.z,r)&&!inWalk(e.f,e.x,e.z,0.05)){ e.x-=dx; e.z-=dz; } return; }
  let nx=e.x+dx; if(!blockedAt(e.f,nx,e.z,r)) e.x=nx;
  let nz=e.z+dz; if(!blockedAt(e.f,e.x,nz,r)) e.z=nz;
}

// =====================================================================
// GUESTS
// =====================================================================
const guests=[], queue=[];
const NAMES_F=['Ayşe','Elif','Zeynep','Selin','Deniz','Aylin','Ceren','İpek','Gizem','Merve','Buse','Ece','Defne','Nil'];
const NAMES_M=['Mehmet','Ahmet','Can','Emre','Burak','Kerem','Onur','Mert','Kaan','Arda','Barış','Efe','Tolga','Cem'];
const SURN=['Yılmaz','Kaya','Demir','Şahin','Çelik','Arslan','Aydın','Koç','Yıldız','Polat','Aksoy','Güneş','Öztürk','Kurt'];
class Guest extends Ent{
  constructor(type){ super(LOOKS.guest(type)); this.type=type; this.T=GTYPES[type];
    this.name=rand(Math.random()<.5?NAMES_F:NAMES_M)+' '+rand(SURN); this.state='arrive';
    this.patMax=this.T.pat; this.pat=this.patMax; this.sat=60; this.room=null; this.nights=rint(this.T.nights[0],this.T.nights[1]);
    this.stay=0; this.inRoom=false; this.asleep=false; this.seat=null; this.reqT=rnd(10,22); this.amenT=rnd(12,26); this.speed=2.1+Math.random()*0.3;
    this.tag=null; guests.push(this); }
  remove(){ super.remove(); const i=guests.indexOf(this); if(i>=0) guests.splice(i,1); if(this.tag) tagRemove(this.tag); }
}
function qPos(k){ return {x:L.qHead.x+k*L.qStep.x, z:L.qHead.z+k*L.qStep.z}; }
function reflowQueue(){ queue.forEach((g,k)=>{ const p=qPos(k); g.qk=k; g.goTo(0,p.x,p.z,()=>{ g.tRot=Math.PI; }); }); }
function pickType(){
  const st=stars(), opts=Object.keys(GTYPES).filter(k=>GTYPES[k].stars<=st);
  let maxLv=0; for(const k in state.rooms) maxLv=Math.max(maxLv,ROOM_T[state.rooms[k].type].lvl);
  const w=k=>GTYPES[k].w*(GTYPES[k].want>maxLv?0.3:1)*(k==='vip'&&state.lux&&state.lux.limo?2:1)*priceTypeW(k)*(k==='vip'&&skillLv('g4')?1.6:1)*festTypeW(k)*worldTypeW(k);
  let tot=0; opts.forEach(k=>tot+=w(k)); let r=Math.random()*tot;
  for(const k of opts){ r-=w(k); if(r<=0) return k; } return 'tourist';
}
function spawnGuest(type,from,tour,fl){
  const g=new Guest(type||pickType()), side=from||(Math.random()<.5?L.spawnL:L.spawnR);
  if(tour){ g.tour=true; g.patMax=g.pat=g.T.pat*1.25; }
  if(skillLv('g3')) g.patMax=g.pat=g.patMax*1.12;
  g.place(side.x,side.z+rnd(-0.2,0.2),fl||0); queue.push(g); g.qk=queue.length-1;
  const p=qPos(g.qk); if(!g.goTo(0,p.x,p.z,()=>{ g.tRot=Math.PI; })) g.place(p.x,p.z,0);
  g.tag=tagAdd({kind:'patience',ent:g,y:1.95});
  if(!type&&g.type!=='insp'&&anyThemed()&&Math.random()<0.3) g.pref=rand(Object.keys(RTHEMES));
  if(g.type==='elderly') g.speed*=0.72; if(g.type==='athlete') g.speed*=1.3; if(g.type==='team'&&!tour) teamArrive(g);
  if(!type&&state.tut>=TUT.length&&!state.sandbox&&Math.random()<0.025){ g.lucky=true; }
  if(!type&&g.type!=='dog'&&g.type!=='insp'&&state.tut>=TUT.length&&Math.random()<0.06) g.booze=true;
  return g;
}
function readyRooms(){ return Object.keys(state.rooms).map(Number).filter(id=>{ const s=state.rooms[id],R=RT(id); return !s.dirty&&!s.broken&&!s.hold&&!R.guest&&R.group; }); }
function pickRoom(g){
  const rs=readyRooms(); if(!rs.length) return null; const mp=memoryPick(g,rs); if(mp) return mp;
  let best=null, bs=1e9;
  rs.forEach(id=>{ const lv=ROOM_T[state.rooms[id].type].lvl, d=lv-g.T.want; const sc=(d<0?-d*3:d)+roomInfo(id).f*0.3+Math.random()*0.2-(g.pref&&state.rooms[id].theme===g.pref?2.5:0); if(sc<bs){ bs=sc; best=id; } });
  return best;
}
function decorSat(s){ let v=designSat(s); for(const k in s.decor) if(s.decor[k]) v+=DECOR[k].sat; return v; }
function roomRate(id){ const s=state.rooms[id]; return invRate(id)*ROOM_T[s.type].rate*(1+0.3*roomInfo(id).f)*(state.lux&&state.lux.brand?1.1:1)*lodaRoomMul(id); }
function checkIn(g,id){
  const s=state.rooms[id], R=RT(id), T=ROOM_T[s.type];
  R.guest=g; g.room=id; g.lastRoomId=id; g.lodaSuite=lodaSuite(id); g.stay=g.nights*NIGHT_SEC; queue.shift(); reflowQueue(); if(g.c.items.length) setHold(g.c,[]);
  const d=T.lvl-g.T.want, waited=g.patMax-g.pat; g.waited=waited; g.lastRoomT=T.name;
  g.sat=clamp(63+(d<0?9*d:5*d)+decorSat(s)-expectPen()-Math.min(16,Math.max(0,waited-waitGrace())*(0.35+0.08*(stars()-1)))+viewSat(g,id)+(g.coffee?3:0)+(state.lux&&state.lux.chandelier?3:0)-(g.type==='insp'?2:0)-(state.mess?4:0)+rnd(-6,6),5,100);
  const pay0=Math.round((roomRate(id)+(s.decor.bar?DECOR.bar.income:0)+(s.decor.welcome?DECOR.welcome.income:0))*g.nights*g.T.pay*incomeMult()*(g.tour?1.2:1)*(g.heli?1.5:1)*(g.type==='vip'&&state.lux&&state.lux.limo?1.2:1)*(1+0.05*state.up.haggle)*priceMult()*(g.loyal?1.2:1));
  const pay=g.lucky?pay0*2:pay0; if(g.lucky) luckyJackpot(g);
  state.piles.desk+=pay; pileChanged('desk'); state.today.rooms+=pay; state.today.guests++; state.served++;
  fxText(L.piles.desk.x,1.6,L.piles.desk.z,0,'+'+fmt(pay)); fxEmoji(g.x,2.1,g.z,0,'🔑'); g.sqT=0.4;
  if(d<0) fxEmoji(g.x,2.3,g.z,0,'😒');
  g.sat=clamp(g.sat+priceSat()+3*skillLv('g1')+(s.perfect?5:0),5,100); if(s.perfect){ s.perfect=false; fxEmoji(g.x,2.8,g.z,0,'✨'); }
  if(g.pref){ if(s.theme===g.pref){ g.sat=clamp(g.sat+10,5,100); fxEmoji(g.x,2.6,g.z,0,RTHEMES[g.pref].e); } else g.sat=clamp(g.sat-3,5,100); }
  if(g.type==='grumpy'){ if(waited<8){ g.sat=clamp(g.sat+10,5,100); fxEmoji(g.x,2.5,g.z,0,'😌'); } else g.sat=clamp(g.sat-Math.min(18,waited*0.6),5,100); }
  sfx('ding');
  if(g.tag){ tagRemove(g.tag); g.tag=null; }
  g.state='toRoom'; const sp=roomSpots(id);
  if(!g.goTo(sp.stand.f,sp.stand.x,sp.stand.z,()=>enterRoom(g))){ g.place(sp.stand.x,sp.stand.z,sp.stand.f); enterRoom(g); }
  g.sat=clamp(g.sat+floorSat(roomInfo(id).f)+nookSat(roomInfo(id).f)+prjSat()+lodaRoomSat(id)+memorySat(g,id)+shopMorning(g),5,100); albumNoteGuest(g);
  tutEvent('checkin'); qEv('guest'); markSave();
}
function enterRoom(g){
  if(g.room==null) return;
  g.state='room'; g.inRoom=true; g.tRot=rnd(-1,1)+Math.PI*0.5; applyRoomState(g.room);
}
function exitSide(){ return Math.random()<.5?L.spawnL:L.spawnR; }
function guestLeave(g){
  g.state='leave'; g.unpose(); g.asleep=false;
  const ex=exitSide();
  if(!g.goTo(0,ex.x,ex.z,()=>g.remove())) g.remove();
}
function checkout(g){
  standUp(g); teamCheckout(g); lodaCheckout(g); dealerCheckout(g); const id=g.room, s=state.rooms[id], R=RT(id);
  const mood=g.sat>=68?'happy':g.sat>=42?'neutral':'unhappy', mult=g.T.rep||1;
  const tip=mood==='unhappy'?0:Math.round(roomRate(id)*0.45*(g.sat/70)*g.T.tip*incomeMult()*(1+0.15*state.up.charm)*(1+0.15*skillLv('g2')));
  if(tip>0){ s.tip+=tip; state.today.tips+=tip; }
  s.dirty=true; R.guest=null; R.req=null; g.room=null; g.inRoom=false;
  if(g.type==='insp') inspectorVerdict(g,mood);
  if(mood==='happy'){ changeRep(0.75*mult*(1+0.15*state.up.fame)*(1+0.1*skillLv('g4'))); state.today.happy++; qEv('happy'); } else if(mood==='unhappy'){ changeRep(-2.5*mult); state.today.unhappy++; } else { changeRep(0.15); state.today.neutral=(state.today.neutral||0)+1; }
  fxEmoji(g.x,g.y+2.1,g.z,g.f,mood==='happy'?'😍':mood==='neutral'?'🙂':'😠');
  if(g.type==='million') millionReveal(g,id,mood);
  noteGuestDay(g,mood,false); noteLoyal(g); rememberGuest(g); shopCheckout(g,mood); if(g.story) storyCheckout(g,id,mood);
  applyRoomState(id); pendingUpgrade(id); guestLeave(g); markSave();
}
function millionReveal(g,id,mood){
  const s=state.rooms[id];
  if(mood==='happy'){ const b=Math.round(roomRate(id)*4*incomeMult()); s.tip+=b; state.today.tips+=b; changeRep(2);
    banner('🎩 Gizli milyoner!',`${g.name} aslında bir milyonermiş · bahşiş +${fmt(b)} ₺`); sfx('star'); confettiAt(g.x,g.y+2,g.z,50); fxEmoji(g.x,g.y+2.6,g.z,g.f,'🎩'); }
  else toast(`🎩 ${g.name} gizli bir milyonermiş… mutlu edemedin 😢`,'bad');
}
function angryLeave(g){
  const k=queue.indexOf(g); if(k>=0){ queue.splice(k,1); reflowQueue(); }
  if(g.tag){ tagRemove(g.tag); g.tag=null; }
  bookedLeft(g); if(g.type==='insp'){ inspectorVerdict(g,'left'); } else changeRep(-3*(g.T.rep||1)); state.today.left++;
  noteGuestDay(g,'unhappy',true); fxEmoji(g.x,2.2,g.z,0,'😤'); sfx('fail'); toast(`${g.T.e} ${g.name} beklemekten sıkılıp gitti`,'bad');
  guestLeave(g);
}
// ---------- amenity seats ----------
const SEATS=[];
REST_TABLES.forEach(([tx,tz])=>[-1,1].forEach(sd=>SEATS.push({amen:'rest',x:tx+sd*0.74,z:tz+0.8,px:tx+sd*0.74,pz:tz,py:0.12,rot:sd<0?Math.PI/2:-Math.PI/2,pose:'sit',busy:null})));
POOL_LOUNGERS.forEach(lx=>SEATS.push({amen:'pool',x:lx,z:6.25,px:lx,pz:5.72,py:0.43,rx:-Math.PI/2,rot:0,pose:'sleep',busy:null}));
POOL_SWIM.forEach(([sx,sz])=>SEATS.push({amen:'pool',x:sx,z:4.05,px:sx,pz:sz,py:-0.42,rot:rnd(0,6),pose:'swim',busy:null}));
GYM_TREAD.forEach(tx=>SEATS.push({amen:'gym',x:tx,z:-7.5,px:tx,pz:-8.45,py:0.19,rot:Math.PI,pose:'run',busy:null}));
function amenOpen(a){ return a==='spa'?spaOpen():a==='rest'?restOpen():a==='pool'?poolOpen():a==='roof'?roofOpen():gymOpen(); }
function tryAmenity(g){
  const opts=['rest','pool','gym','roof','spa'].filter(a=>amenOpen(a)); if(!opts.length) return false;
  let a=rand(opts); if(roofBarOn()&&opts.includes('roof')&&Math.random()<0.6) a='roof'; if((iftarOn()||sahurOn())&&opts.includes('rest')&&Math.random()<0.7) a='rest';   // iftar çatı barından önce gelir if((g.type==='vip'||g.type==='business')&&opts.includes('roof')&&Math.random()<.5) a='roof'; if(g.T.likes&&opts.includes(g.T.likes)&&Math.random()<.6) a=g.T.likes; if((g.type==='couple'||g.type==='elderly'||g.type==='vip')&&opts.includes('spa')&&Math.random()<.35) a='spa';
  const free=SEATS.filter(s=>s.amen===a&&!s.busy); if(!free.length) return false;
  standUp(g); const seat=rand(free); seat.busy=g; g.seat=seat; g.state='toAmen'; g.inRoom=false; applyRoomState(g.room);
  if(!g.goTo(seat.f||0,seat.x,seat.z,()=>{ g.pose(seat); g.state='amen'; g.amenLeft=rnd(10,16); })){ seat.busy=null; g.seat=null; g.state='room'; g.inRoom=true; return false; }
  return true;
}
function endAmenity(g){
  const seat=g.seat, a=seat.amen; seat.busy=null; g.seat=null; g.unpose(); g.x=seat.x; g.z=seat.z;
  const fee=Math.round(AMEN_FEE[a]*incomeMult()*amenBonus(a)); if(amenBonus(a)>1) g.sat=clamp(g.sat+5,0,100); state.piles[a]+=fee; pileChanged(a); state.today.amen+=fee;
  g.sat=clamp(g.sat+(g.T.likes===a?11:7),0,100); g.amenUsed=(g.amenUsed||[]).concat([a]); qEv('amen'); if(a==='roof') filmShoot(g);
  if(g.visitor){ const x=Math.round(fee*0.5); state.piles[a]+=x; state.today.amen+=x; fxEmoji(g.x,g.y+2.1,g.z,g.f,'👋'); guestLeave(g); return; }
  if(g.stay<=0){ checkout(g); return; }
  const sp=roomSpots(g.room); g.state='toRoom';
  if(!g.goTo(sp.stand.f,sp.stand.x,sp.stand.z,()=>enterRoom(g))){ g.place(sp.stand.x,sp.stand.z,sp.stand.f); enterRoom(g); }
}
function makeRequest(g){
  const R=RT(g.room); if(R.req) return;
  const items=['paper','towel']; if(restOpen()||nightKitchen()) items.push('food');
  R.req={item:g.sahurAwake&&nightKitchen()?'food':rand(items),left:reqTime(),max:reqTime(),by:null};
  sfx('req'); tutEvent('request');
}
function fulfillReq(id){
  const R=RT(id), s=state.rooms[id]; if(!R.req) return;
  const tip=Math.round(REQ_TIP[R.req.item]*incomeMult()*(1+0.15*state.up.charm)*(1+0.15*skillLv('g2')));
  if(R.guest&&R.req.item==='food') R.guest.ateFood=true;   // misafir hafızası: oda servisi aldı
  if(R.guest){ R.guest.sat=clamp(R.guest.sat+10,0,100); fxEmoji(R.guest.x,R.guest.y+2.1,R.guest.z,R.guest.f,'😊'); }
  s.tip+=tip; state.today.req+=tip; R.req=null; applyRoomState(id); sfx('drop'); qEv('req'); markSave();
}
function updateGuests(dt){
  const night=isNight(), rc=readyCount();
  for(let i=guests.length-1;i>=0;i--){
    const g=guests[i];
    try{
    if(g.state==='arrive'&&!g.path){ g.state='queue'; }
    if(g.state==='queue'||(g.state==='arrive'&&queue.indexOf(g)>=0&&g.qk===0)){
      if(!g.path&&!g.asking){ g.pat-=dt*(wxEv('heat')?1.15:1)*(night?0.6:1)*(rc>0?1:0.35)*(built('cafe')?0.7:1)*(state.mess?1.25:1)/(1+0.12*state.up.calm)/(state.lux&&state.lux.piano?1.2:1)*flowPatMul()*shopPatMul(); if(g.pat<=0){ angryLeave(g); continue; }
        if(built('cafe')&&!g.coffee&&g.state==='queue'&&!powerOut()){ if(g.coffeeT==null) g.coffeeT=rnd(1.5,5); g.coffeeT-=dt; if(g.coffeeT<=0) sellCoffee(g); } }
    }
    if(g.state==='room'){
      const R=RT(g.room), s=state.rooms[g.room];
      g.stay-=dt;
      if(s.broken) g.sat=Math.max(0,g.sat-dt*0.25);
      if(state.crisis&&(state.crisis.type==='power'||state.crisis.type==='flood'&&state.crisis.f===g.f)) g.sat=Math.max(0,g.sat-dt*0.18);
      const sleepNow=night&&!g.sahurAwake;   // sahurda uyanan misafir uyumaz
      if(sleepNow&&!g.asleep){ const sp=roomSpots(g.room); g.asleep=true; g.act=null; g.pose({px:sp.bed.x,pz:sp.bed.z,py:0.5,rx:-Math.PI/2,rot:0,pose:'sleep'}); }
      else if(!sleepNow&&g.asleep){ const sp=roomSpots(g.room); g.asleep=false; g.unpose(); g.x=sp.stand.x; g.z=sp.stand.z; g.tRot=Math.PI*0.5; }
      if(!g.asleep){
        if(built('depo')&&!R.req){ g.reqT-=dt*g.T.req; if(g.reqT<=0){ g.reqT=rnd(22,40); if(Math.random()<.75) makeRequest(g); } }
        if(!R.req){ g.amenT-=dt; if(g.amenT<=0){ g.amenT=rnd(16,30); if(g.stay>8&&Math.random()<.6) tryAmenity(g); } }
      }
      if(R.req){ R.req.left-=dt; if(R.req.left<=0){ R.req=null; g.sat=Math.max(0,g.sat-12); changeRep(-0.5); fxEmoji(g.x,g.y+2.1,g.z,g.f,'😠'); sfx('fail'); } }
      if(g.state==='room'&&g.stay<=0&&!night&&!R.req) checkout(g);
      else if(g.state==='room'&&g.stay<-NIGHT_SEC*2) checkout(g);
    } else if(g.state==='amen'){
      g.amenLeft-=dt; g.stay-=dt;
      if(g.amenLeft<=0||!amenOpen(g.seat.amen)) endAmenity(g);
    } else if(g.state==='toAmen'||g.state==='toRoom'){
      g.stay-=dt*0.5;
    }
    }catch(err){ console.error('[misafir]',err); const q=queue.indexOf(g); if(q>=0){ queue.splice(q,1); reflowQueue(); } if(g.seat){ g.seat.busy=null; g.seat=null; } if(g.room!=null&&RT(g.room).guest===g) RT(g.room).guest=null; g.remove(); }
  }
}

// =====================================================================
// STAFF
// =====================================================================
const staffEnts=[];
function staffIdleSpot(k){ const s=L.staffIdle[k%L.staffIdle.length]; return {x:s[0],z:s[1],f:0}; }
function spawnStaff(kind,fromDoor){
  const e=new Ent(LOOKS[kind]()); e.kind=kind; e.job=null; e.wait=0; e.idx=staffEnts.length; e.rec=crewRec(kind); e.name=e.rec.n; e.energy=100; e.slot=staffEnts.filter(x=>x.kind!=='rec').length; e.idleDone=false;
  const sp=fromDoor?{x:rnd(-0.5,0.5),z:8.5,f:0}:staffIdleSpot(e.slot); e.place(sp.x,sp.z,sp.f); staffEnts.push(e);
  e.speed=2.3*staffSpeedMul(kind); return e;
}
function staffSpeedMul(kind){ return moraleMul()*nightStaffMul()*mgrStaff()*STAFF_SPEED[state.staff[kind].lvl-1]*(1+0.1*state.up.lead)*(1+0.08*skillLv('o2')); }
function roomsWhere(fn){ return Object.keys(state.rooms).map(Number).filter(fn); }
function nearestRoom(e,list){ let best=null,bd=1e9; list.forEach(id=>{ const ri=roomInfo(id), d=d2(e.x,e.z,ri.x,ri.z)+Math.abs(ri.f-e.f)*40; if(d<bd){ bd=d; best=id; } }); return best; }
function staffGoIdle(e){
  e.job=null; e.anim=null; e.wait=0.8;
  if(e.idleDone||e.path) return;
  const sp=staffIdleSpot(e.slot), face=()=>{ e.idleDone=true; e.tRot=-Math.PI/2+0.35; };
  if(d2(e.x,e.z,sp.x,sp.z)<=0.1&&e.f===sp.f){ face(); return; }
  e.goTo(sp.f,sp.x,sp.z,face);
}
function updateStaff(dt){
  for(const e of staffEnts){
    e.speed=2.3*staffSpeedMul(e.kind)*staffEnergyMul(e);
    // izinli personel: işini bırakır, görünmez olur (hasta personel mekanizması: e.gone), ertesi gün kapıdan döner
    if(onLeave(e)){ if(!e.leaveNow){ e.leaveNow=true; if(e.job) finishJob(e); e.gone=true; e.c.root.visible=false; } continue; }
    else if(e.leaveNow){ e.leaveNow=false; if(!e.sick){ e.gone=false; e.c.root.visible=true; e.place(rnd(-0.5,0.5),8.6,0); e.idleDone=false; e.wait=0; } }
    if(e.sick) continue;
    if(e.path){ if(e.job||e.riding||e.kind==='rec'||e.kind==='spaT'||e.kind==='laundry'||e.kind==='cook') continue; e.scanT=(e.scanT||0)-dt; if(e.scanT>0) continue; e.scanT=0.5; e.wait=0; }
    if(e.wait>0){ e.wait-=dt; if(e.job&&e.job.working){} else continue; }
    const j=e.job;
    if(e.kind==='spaT'||e.kind==='laundry'||e.kind==='cook'){ staffPost(e); continue; }
    if(e.kind==='rec'){ if(d2(e.x,e.z,L.recSpot.x,L.recSpot.z)>0.05||e.f!==0) e.goTo(0,L.recSpot.x,L.recSpot.z,()=>{ e.tRot=0; }); continue; }
    if(!j){
      if(e.kind==='clean'){ const id=nearestRoom(e,roomsWhere(id=>state.rooms[id].dirty&&!RT(id).task)); if(id){ RT(id).task=e; e.job={type:'clean',id}; goRoom(e,id); } else if(!staffSpotJob(e,'mess')) staffGoIdle(e); }
      else if(e.kind==='tech'){ if(staffSpotJob(e,'crisis')){} else { const id=nearestRoom(e,roomsWhere(id=>state.rooms[id].broken&&!RT(id).ftask)); if(id){ RT(id).ftask=e; e.job={type:'fix',id}; goRoom(e,id); } else staffGoIdle(e); } }
      else if(e.kind==='bell'){
        const id=nearestRoom(e,roomsWhere(id=>{ const R=RT(id); return R.req&&!R.req.by&&(R.req.item!=='food'||built('rest'))&&stockHas(R.req.item); }));
        if(id){ const R=RT(id); R.req.by=e; e.job={type:'fetch',id,item:R.req.item}; const src=R.req.item==='food'?L.pass:L.shelf[R.req.item];
          if(!e.goTo(0,src.x,src.z,()=>{ e.wait=0.5; e.job.type='carry'; useStock(e.job.item); setHold(e.c,[e.job.item]); sfx('pick'); goRoom(e,id); })){ R.req.by=null; e.job=null; } }
        else staffGoIdle(e);
      }
      continue;
    }
    if(j.working&&(j.type==='mess'||j.type==='crisis')){ j.t-=dt*staffSpeedMul(e.kind); e.anim='work'; const tgt=j.type==='mess'?state.mess:state.crisis; if(!tgt){ finishJob(e); continue; } if(j.t<=0){ if(j.type==='mess') cleanMess(true); else resolveCrisis(true); staffWorked(e); finishJob(e); } continue; }
    if(j.working){
      j.t-=dt*staffSpeedMul(e.kind); e.anim='work';
      const s=state.rooms[j.id];
      if(j.type==='clean'&&!s.dirty||j.type==='fix'&&!s.broken){ finishJob(e); continue; }
      if(j.t<=0){ if(j.type==='clean'){ cleanerNow=e; cleanRoom(j.id,true); } else fixRoom(j.id,true); staffWorked(e); finishJob(e); }
    }
  }
}
function goRoom(e,id){
  const sp=roomSpots(id), atDoor=e.job&&e.job.type==='carry'&&!!RT(id).guest, T=atDoor?{f:sp.door.f,x:sp.door.x,z:sp.door.z-0.2}:sp.stand;
  const ok=e.goTo(T.f,T.x+rnd(-0.1,0.1),T.z+rnd(-0.1,0.2),()=>arriveRoom(e,id));
  if(!ok) finishJob(e);
}
function arriveRoom(e,id){
  const j=e.job; if(!j) return; const s=state.rooms[id], R=RT(id);
  if(j.type==='clean'){ if(!s.dirty){ finishJob(e); return; } j.working=true; j.t=4.2; e.tRot=-Math.PI*0.6; }
  else if(j.type==='fix'){ if(!s.broken){ finishJob(e); return; } j.working=true; j.t=4.5; e.tRot=Math.PI; }
  else if(j.type==='carry'){ if(R.req&&R.req.item===j.item){ fulfillReq(id); staffWorked(e); } setHold(e.c,[]); finishJob(e); }
}
function finishJob(e){
  const j=e.job; if(j&&(j.type==='mess'||j.type==='crisis')){ const tgt=j.type==='mess'?state.mess:state.crisis; if(tgt&&tgt.by===e.idx) tgt.by=null; } else if(j){ const R=RT(j.id); if(R.task===e) R.task=null; if(R.ftask===e) R.ftask=null; if(R.req&&R.req.by===e) R.req.by=null; }
  e.job=null; e.anim=null; e.idleDone=false; if(e.c.items.length) setHold(e.c,[]); e.wait=0.3;
}
