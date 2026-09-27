'use strict';
if(typeof THREE==='undefined'){ document.getElementById('loadErr').style.display='flex'; document.getElementById('boot').style.display='none'; throw new Error('three.js yüklenemedi'); }

// =====================================================================
// UTIL
// =====================================================================
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=a=>a[Math.floor(Math.random()*a.length)];
const rnd=(a,b)=>a+Math.random()*(b-a);
const rint=(a,b)=>Math.floor(rnd(a,b+1));
const d2=(ax,az,bx,bz)=>{ const dx=ax-bx,dz=az-bz; return dx*dx+dz*dz; };
const fmt=n=>Math.round(n).toLocaleString('tr-TR');
const fmtM=n=>fmt(n)+' ₺';
const easeOutBack=t=>{ const c1=1.9,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); };
const IS_TOUCH=('ontouchstart' in window)||navigator.maxTouchPoints>0;

// =====================================================================
// GAME DATA
// =====================================================================
const FH=3.0;              // floor height
const DAY_SEC=160;         // real seconds per in-game day
const NIGHT_SEC=21;        // real seconds a guest "night" lasts
const SEASON_DAYS=4;
const ROOM_T={
  eco:  {name:'Ekonomi',lvl:0,rate:30},
  dlx:  {name:'Deluxe', lvl:1,rate:60,up:420},
  suite:{name:'Suit',   lvl:2,rate:110,up:1250}};
const ROOM_ORDER=['eco','dlx','suite'];
const FLOOR_MULT=[1,1.7,2.6];
const DECOR={
  art:  {e:'🖼️',name:'Tablo',  cost:90, sat:6},
  plant:{e:'🪴',name:'Bitki',  cost:60, sat:4},
  bar:  {e:'🧃',name:'Minibar',cost:150,sat:3,income:6},
  aroma:{e:'🕯️',name:'Aroma mumları',cost:80,sat:3},
  welcome:{e:'🍾',name:'Karşılama paketi',cost:140,sat:5,income:4}};
const GTYPES={
  tourist: {name:'Turist',   e:'🎒',w:4,  stars:1,pat:55,pay:1,   want:0,nights:[1,2],tip:1,  req:1},
  business:{name:'İş insanı',e:'💼',w:2.2,stars:2,pat:30,pay:1.45,want:1,nights:[1,1],tip:1.4,req:.7},
  family:  {name:'Aile',     e:'👪',w:2,  stars:2,pat:45,pay:1.25,want:1,nights:[2,3],tip:1.1,req:1.2,likes:'pool'},
  vip:     {name:'Ünlü',     e:'🌟',w:.8, stars:4,pat:32,pay:2.8, want:2,nights:[1,2],tip:2.5,req:1,rep:2},
  student: {name:'Öğrenci',  e:'🎓',w:2.2,stars:1,pat:65,pay:0.8, want:0,nights:[1,3],tip:0.6,req:0.8},
  elderly: {name:'Emekli',   e:'👵',w:1.5,stars:2,pat:75,pay:1.15,want:1,nights:[2,3],tip:1.7,req:1.3,likes:'rest'},
  couple:  {name:'Balayı çifti',e:'💑',w:1.1,stars:3,pat:45,pay:1.9,want:2,nights:[2,3],tip:1.8,req:0.9,likes:'roof'},
  influencer:{name:'Fenomen',e:'🤳',w:0.9,stars:3,pat:28,pay:1.6,want:2,nights:[1,1],tip:1.2,req:1.2,rep:2.5},
  athlete: {name:'Sporcu',   e:'🏋️',w:1.4,stars:2,pat:40,pay:1.2, want:1,nights:[1,2],tip:1.1,req:.8,likes:'gym'},
  grumpy:  {name:'Huysuz',   e:'😤',w:1.2,stars:1,pat:24,pay:1.1, want:0,nights:[1,2],tip:2.2,req:1.4},
  dog:     {name:'Köpekli',  e:'🐶',w:1.2,stars:2,pat:45,pay:1.35,want:1,nights:[1,3],tip:1.2,req:1},
  million: {name:'Turist',   e:'🎒',w:.35,stars:3,pat:50,pay:1,   want:0,nights:[1,2],tip:1,  req:1},  // gizli milyoner: turist kılığında
  insp:    {name:'Müfettiş',  e:'🕵️',w:0,  stars:9,pat:38,pay:1,   want:1,nights:[1,1],tip:1.5,req:1.3,special:true}};
const STAFF={
  rec:  {name:'Resepsiyonist',e:'🛎️',max:1,cost:[300],               wage:40,desc:'Sen yokken misafirleri karşılar'},
  clean:{name:'Temizlikçi',   e:'🧹',max:4,cost:[200,320,480,700],   wage:30,desc:'Kirli odaları kendiliğinden temizler'},
  bell: {name:'Kat görevlisi',e:'🧺',max:3,cost:[350,550,800],       wage:35,desc:'İstekleri depodan alıp odalara götürür',needs:'depo'},
  tech: {name:'Teknisyen',    e:'🔧',max:2,cost:[400,750],           wage:45,desc:'Arızalı odaları onarır'},
  spaT: {name:'Spa terapisti',e:'💆',max:1,cost:[900],               wage:55,desc:'Spa gelirini %60 artırır',needs:'spa'},
  laundry:{name:'Çamaşırcı',   e:'🧼',max:1,cost:[600],               wage:40,desc:'Personelin temizlediği odaların çarşaflarını yıkar (gelir) · senin getirdiklerine +%50',needs:'laundry'}};
const STAFF_LVL_COST=[250,650,1500,3200];
const STAFF_SPEED=[1,1.35,1.75,2.1,2.5];
const UPG={
  speed: {g:0,name:'Hız',        e:'👟',costs:[100,250,500,900,1500,2500,4000],desc:'Daha hızlı yürürsün'},
  cap:   {g:0,name:'Taşıma',     e:'📦',vals:[2,3,4,6,8,10,12],costs:[150,400,900,1600,2800,4500],desc:'Aynı anda daha çok eşya taşırsın'},
  magnet:{g:0,name:'Mıknatıs',   e:'🧲',vals:[0.9,1.6,2.3,3.1,4.0,5.0],costs:[200,600,1300,2500,4200],desc:'Parayı ve bahşişi daha uzaktan toplarsın'},
  clean: {g:1,name:'Temizlik',   e:'✨',costs:[120,300,700,1400,2500,4000],desc:'Odaları daha hızlı temizlersin'},
  fix:   {g:1,name:'Tamircilik', e:'🔧',costs:[150,400,900,1800,3200],desc:'Arıza ve krizleri daha hızlı onarırsın'},
  desk:  {g:1,name:'Karşılama',  e:'🛎️',costs:[200,500,1100,2200],desc:'Misafirleri resepsiyonda daha hızlı kaydedersin'},
  charm: {g:2,name:'Güler yüz',  e:'😊',costs:[250,700,1600,3200],desc:'Her seviye bahşişleri %15 artırır'},
  haggle:{g:2,name:'Pazarlık',   e:'💼',costs:[400,1200,3000,6000,10000],desc:'Her seviye oda gelirini %5 artırır'},
  fame:  {g:2,name:'Şöhret',     e:'🌟',costs:[300,900,2200],desc:'Mutlu misafirler %15 daha çok ün kazandırır'},
  lead:  {g:3,name:'Liderlik',   e:'📣',costs:[500,1400,3200,6500],desc:'Tüm personel %10 daha hızlı çalışır'},
  calm:  {g:3,name:'Sakinlik',   e:'🧘',costs:[180,500,1200,2600],desc:'Sıradaki misafirler %12 daha sabırlı bekler'},
  auto:  {g:0,name:'Süper mıknatıs',e:'🧲',vals:[0,25,10],costs:[2500,7000],desc:'Mıknatısın son aşaması: tüm paraları ve bahşişleri kendiliğinden toplar (25 sn, sonra 10 sn\'de bir)'},
};
const UPG_GROUPS=['🏃 Hareket','🛠️ İş becerileri','💰 Kazanç','👥 Yönetim'];
const ITEMS={paper:{e:'🧻',name:'Tuvalet kâğıdı'},towel:{e:'🧺',name:'Havlu'},food:{e:'🍽️',name:'Oda servisi'},linen:{e:'🧦',name:'Kirli çarşaf'}};
const REQ_TIP={paper:8,towel:10,food:26};
const AMEN_FEE={rest:14,pool:7,gym:9,roof:22,spa:20};
const COFFEE_FEE=6;
const STAR_MULT=[0.9,1,1.1,1.2,1.3];
const CITIES=[
  {name:'İstanbul', e:'🕌',mult:1,  facade:0xf2e6d2,trim:0x9b3f30,accent:0x2d5d8a,ground:'grass',   snow:true, bd:'bos'},
  {name:'Antalya',  e:'🏖️',mult:1.9,facade:0xfbf3e4,trim:0x2a8a96,accent:0xe08a3c,ground:'grass',   snow:false,bd:'beach',palm:true},
  {name:'Kapadokya',e:'🎈',mult:3.4,facade:0xe9cda8,trim:0x8f5130,accent:0x6b4a8e,ground:'grassDry',snow:true, bd:'chim',stone:true},
  {name:'Bodrum',   e:'⛵',mult:5.6,facade:0xffffff,trim:0x2a5fa8,accent:0x3aa0c8,ground:'grass',   snow:false,bd:'aegean',palm:true},
  {name:'Paris',    e:'🗼',mult:8.8,facade:0xece4d6,trim:0x3d4a5c,accent:0xb08d57,ground:'grass',   snow:true, bd:'paris'},
  {name:'Dubai',    e:'🏙️',mult:14, facade:0xf4ead8,trim:0xb8913a,accent:0x1f6f8b,ground:'sand',    snow:false,bd:'dubai',palm:true,desert:true}];
// kalıcı miras: taşınırken kazanılan 🗝️ anahtarlarla alınır, tüm otellerde geçerli
const LEGACY={
  cash:  {e:'💰',name:'Başlangıç sermayesi',max:5,desc:'Her yeni otelde (ve şimdi) +300 ₺ × şehir çarpanı'},
  speed: {e:'👟',name:'Hızlı adımlar',     max:3,desc:'Hız geliştirmesi en az bu seviyeden başlar'},
  magnet:{e:'🧲',name:'Mıknatıslı eller',  max:2,desc:'Mıknatıs geliştirmesi en az bu seviyeden başlar'},
  rep:   {e:'⭐',name:'Tanınmış marka',    max:3,desc:'Her yeni otele (ve şimdi) +8 ün ile başla'},
  income:{e:'📈',name:'Zincir geliri',     max:5,desc:'Tüm gelirler kalıcı +%5'}};
const LEGACY_COST=[2,3,5,8,12];
const SEASONS=[
  {name:'İlkbahar',e:'🌸',arr:0,   trees:[0xf2a7c8,0x74c05e,0xe98bb0],grass:0xf2fff0,wx:{sun:.5,cloud:.3,rain:.2}},
  {name:'Yaz',     e:'☀️',arr:.12, trees:[0x3f7a3e,0x4f8d46,0x346b37],grass:0xffffff,wx:{sun:.75,cloud:.2,rain:.05}},
  {name:'Sonbahar',e:'🍂',arr:-.03,trees:[0xd07a30,0xe0a53c,0xa8502c],grass:0xe9d9a8,wx:{sun:.35,cloud:.35,rain:.3}},
  {name:'Kış',     e:'❄️',arr:-.1, trees:[0x5b6b60,0x6d7d71,0x4e5e54],grass:0xe2e8e4,wx:{sun:.3,cloud:.3,snow:.4}}];
const WEATHER={sun:{e:'☀️',light:1,arr:0},cloud:{e:'☁️',light:.78,arr:0},rain:{e:'🌧️',light:.58,arr:-.08},snow:{e:'🌨️',light:.72,arr:-.06}};

// =====================================================================
// LAYOUT (world units; +z faces the street/camera)
// =====================================================================
const COLX=[-5.45,-2.45,2.45,5.45], ROWZ=[-0.6,-5.2,-9.8], RW=3.0, RD=2.8;
const BACK=-11.34, CORR=[1.7,-2.9,-7.5];   // back wall (center z) and corridor center lines
const L={
  serve:{x0:-4.95,x1:-3.4,z0:3.2,z1:4.35,cx:-4.2,cz:3.8}, recSpot:{x:-3.05,z:3.75},
  desk:{x:-3.8,z:4.7},
  qHead:{x:-3.8,z:5.8}, qStep:{x:0.6,z:0.3},
  outside:{x:0,z:8.8}, inside:{x:0,z:6.5},
  spawnL:{x:-16.9,z:12.15}, spawnR:{x:16.9,z:12.15},
  shelf:{paper:{x:-5.85,z:5.4},towel:{x:-5.85,z:6.8}},
  pass:{x:-12.0,z:-1.15},
  staffIdle:[[5.3,6.15],[5.85,6.15],[4.75,6.15],[5.3,5.6],[5.85,5.6],[4.25,5.65],[5.3,6.6],[5.85,6.6],[4.7,6.6],[4.2,6.2]],
  elev:{x:5.6,z:3.5},
  piles:{desk:{x:-5.75,z:3.7,f:0},spa:{x:-12.6,z:-4.9,f:0},laundry:{x:-8.6,z:-6.2,f:0},rest:{x:-9.6,z:6.3,f:0},pool:{x:12.9,z:6.2,f:0},gym:{x:13.3,z:-4.4,f:0},cafe:{x:3.85,z:3.2,f:0},roof:{x:0.3,z:-3.0,f:3}},
  helipad:{x:3.9,z:-8.3},
  cafe:{x:2.45,z:3.0}, laundryDrop:{x:-9.3,z:-5.2}, laundryW:{x:-9.3,z:-8.8}, spaT:{x:-14.4,z:-7.4}, gen:{x:7.6,z:7.85}, genSpot:{x:7.6,z:8.7}, busStop:{x:-1.2,z:13.55}, busDoor:{x:0.7,z:12.5},
};
const REST_TABLES=[[-14.3,1.0],[-12.0,1.0],[-9.7,1.0],[-14.3,3.9],[-12.0,3.9],[-9.7,3.9]];
const POOL_LOUNGERS=[9.3,10.5,13.5,14.7];
const POOL_SWIM=[[10.2,0.9],[12.0,2.5],[13.8,1.2],[11.1,2.9]];
const GYM_TREAD=[9.4,10.8,13.4,14.8];
function roomId(f,l){ return (f+1)*100+l+1; }
function roomInfo(id){ const f=Math.floor(id/100)-1, l=id%100-1; return {f,l,x:COLX[l%4],z:ROWZ[Math.floor(l/4)]}; }

// ---------- unlock chain ----------
const ROOM_SEQ=[1,2,0,3,5,6,4,7,9,10,8,11];
function padDefs(){
  const P=[], cm=city().mult;
  const push=d=>{ d.cost=Math.round(d.cost*cm/5)*5; P.push(d); };
  const room=(f,l,cost,req,extra)=>{ const id=roomId(f,l), ri=roomInfo(id);
    push(Object.assign({id:'r'+id,kind:'room',room:id,f,x:ri.x,z:ri.z,size:2.3,cost,req,icon:'🛏️',label:'Oda '+id},extra||{})); };
  room(0,1,30,[]); room(0,2,60,['r102']);
  push({id:'depo',kind:'depo',f:0,x:-6.0,z:6.1,size:1.7,cost:120,req:['r103'],icon:'📦',label:'Depo'});
  room(0,0,100,['depo']); room(0,3,140,['r101']);
  push({id:'staff',kind:'staff',f:0,x:5.55,z:6.25,size:1.7,cost:250,req:['r104'],icon:'👥',label:'Personel odası'});
  room(0,5,200,['staff']); room(0,6,240,['r106']);
  push({id:'cafe',kind:'cafe',f:0,x:L.cafe.x,z:L.cafe.z,size:1.7,cost:280,req:['r106'],icon:'☕',label:'Kahve köşesi'});
  push({id:'rest',kind:'rest',f:0,x:-12.0,z:8.9,size:1.9,cost:520,req:['r107'],icon:'🍽️',label:'Restoran'});
  room(0,4,300,['rest']); room(0,7,340,['r105']);
  room(0,9,400,['r108']); room(0,10,450,['r110']);
  push({id:'pool',kind:'pool',f:0,x:12.0,z:8.9,size:1.9,cost:820,req:['r111'],icon:'🏊',label:'Havuz'});
  room(0,8,500,['pool']); room(0,11,560,['r109']);
  push({id:'laundry',kind:'laundry',f:0,x:-9.3,z:-3.75,size:1.2,cost:450,req:['staff'],icon:'🧺',label:'Çamaşırhane'});
  push({id:'gym',kind:'gym',f:0,x:11.9,z:-2.3,size:1.7,cost:720,req:['r112'],icon:'🏋️',label:'Spor salonu'});
  push({id:'spa',kind:'spa',f:0,x:-13.6,z:-3.75,size:1.2,cost:2200,req:['gym'],stars:3,icon:'💆',label:'Spa & sauna'});
  push({id:'f2',kind:'floor',floor:1,f:0,x:L.elev.x,z:L.elev.z,size:1.3,cost:4200,req:['gym'],stars:3,icon:'🛗',label:'2. kat + asansör'});
  let prev='f2';
  const c2=[1200,1300,1420,1540,1680,1820,1970,2130,2300,2480,2680,2900];
  ROOM_SEQ.forEach((l,k)=>{ room(1,l,c2[k],[prev]); prev='r'+roomId(1,l); });
  push({id:'f3',kind:'floor',floor:2,f:1,x:3.0,z:1.9,size:1.6,cost:11000,req:[prev],stars:4,icon:'🛗',label:'3. kat'});
  prev='f3';
  const c3=[3200,3450,3700,4000,4300,4650,5000,5350,5750,6150,6600,7100];
  ROOM_SEQ.forEach((l,k)=>{ room(2,l,c3[k],[prev]); prev='r'+roomId(2,l); });
  push({id:'roof',kind:'floor',floor:3,f:2,x:3.0,z:CORR[0],size:1.6,cost:16000,req:[prev],stars:5,icon:'🚁',label:'Çatı katı: bar, havuz, helikopter pisti'});
  push({id:'mescit',kind:'floor',floor:4,f:3,x:1.8,z:0.9,size:1.6,cost:15000,req:['roof'],stars:5,icon:'🕌',label:'Mescit katı: imam, cemaat, İstanbul vakitlerinde ezan'});
  return P;
}

// =====================================================================
// STATE & SAVE
// =====================================================================
let SAVE_KEY='otel_ustasi_v2'; try{ if(localStorage.getItem('otel_mode')==='sandbox') SAVE_KEY='otel_ustasi_v2_sandbox'; }catch(e){}
const HOTEL_NAMES=['Grand Boğaziçi','Palas Lale','Mavi Martı','Altın Kum','Yıldız Konak','Zeytin Bahçesi','Deniz Yıldızı','Ay Işığı','Kuzey Rüzgârı','Rüya Palas','Lavanta Evi','Kordon Otel','Serin Vadi','Nar Çiçeği','Sultan Köşk'];
const CAT_NAMES=['Pamuk','Tarçın','Boncuk','Minnoş','Duman','Karamel','Fıstık','Zeytin','Lokum','Paşa','Sütlaç','Maviş'];
function blankToday(){ return {rooms:0,tips:0,amen:0,req:0,wages:0,happy:0,unhappy:0,left:0,guests:0,rep0:null,cafe:0,quest:0}; }
function freshState(cityIx,prestige){
  return {v:2, city:cityIx||0, prestige:prestige||0, money:Math.round(60*CITIES[(cityIx||0)%CITIES.length].mult), rep:30, day:1, t:0.02, weather:'sun',
    built:{}, paid:{}, rooms:{}, piles:{desk:0,rest:0,pool:0,gym:0,cafe:0,roof:0,spa:0,laundry:0},
    staff:{rec:{n:0,lvl:1},clean:{n:0,lvl:1},bell:{n:0,lvl:1},tech:{n:0,lvl:1},spaT:{n:0,lvl:1},laundry:{n:0,lvl:1}},
    up:{speed:0,cap:0,clean:0,magnet:0,fix:0,desk:0,charm:0,haggle:0,fame:0,lead:0,calm:0,auto:0},
    tut:0, tips:{}, sound:true, music:true, gfx:null, adsUntil:0, earned:0, served:0, done:false,
    player:{x:-4.2,z:3.8,f:0}, today:blankToday(), quests:null, lux:{}, xp:0, lvl:1, ach:{}, stats:{}, lastSeen:0, vol:{sfx:.55,music:.45}, log:[], gfxAuto:true,
    custom:{name:rand(HOTEL_NAMES),skin:0xf0c49c,hair:0x3a2618,hs:'quiff',top:0x1f3450,tie:0xe0a93a,hat:'none',cat:rand(CAT_NAMES)},
    keys:0, legacy:{}, hist:[], reviews:[], reports:[], offer:null, event:null, breakroom:false, eotd:null, price:1, loyal:[], skills:{}, mgrs:{}, crew:{}, week:null, pass:null, lowFx:false, seenVer:44, rules:{dog:true,booze:true}, ezan:'on', lastVakit:null, live:null, repHist:[], inv:{}, diff:'auto', flow:0, streak:null, album:{}, tier:0, league:null, leagueWins:0, mgr:null, mgrOffer:null, floors:{}, sp:null, stayPol:'ask', parties:0, partyDay:0, loan:null, rival:null, stock:null, order:null, autoOrder:false, catOn:false, catPetDay:-1, catPets:0, mess:null, messDue:false, crisis:null, crisisDue:null, lastCrisis:0, inspDue:false, busDue:false, lastInsp:0, lastBus:0};
}
function loadState(){
  try{
    let s=null; try{ s=JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){ s=null; }
    if(!s||s.v!==2){ try{ s=JSON.parse(localStorage.getItem(SAVE_KEY+'_bak')); }catch(e){ s=null; } }
    if(!s||s.v!==2) return null;
    const base=freshState(s.city,s.prestige);
    for(const k in base){ if(s[k]===undefined) s[k]=base[k]; }
    for(const k of ['staff','up','piles']) for(const kk in base[k]) if(s[k][kk]===undefined) s[k][kk]=base[k][kk];
    s.today=Object.assign(blankToday(),s.today||{});
    return s;
  }catch(e){ return null; }
}
let state=loadState()||freshState(0,0);
if(state.custom&&!state.custom.migr){ if(state.custom.name==='Otel Ustası') state.custom.name=rand(HOTEL_NAMES); if(!state.custom.cat||state.custom.cat==='Pamuk') state.custom.cat=rand(CAT_NAMES); state.custom.migr=1; }
let saveDirty=false, saveT=0;
function save(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(state)); saveDirty=false; }catch(e){} }
function markSave(){ saveDirty=true; }

function city(){ return CITIES[state.city%CITIES.length]; }
function rawStars(){ return clamp(1+Math.floor(state.rep/20),1,5); }
function roomsOfType(t){ let n=0; for(const k in state.rooms) if(state.rooms[k].type===t) n++; return n; }
function nRoomsAll(){ return Object.keys(state.rooms).length; }
const STAR_REQ={
  3:[['8 oda',()=>nRoomsAll()>=8],['2 Deluxe oda',()=>roomsOfType('dlx')+roomsOfType('suite')>=2]],
  4:[['Restoran ve havuz',()=>built('rest')&&built('pool')],['16 oda',()=>nRoomsAll()>=16],['2 Suit oda',()=>roomsOfType('suite')>=2]],
  5:[['Havuz, spor salonu ve spa',()=>built('pool')&&built('gym')&&built('spa')],['28 oda',()=>nRoomsAll()>=28],['6 Suit oda',()=>roomsOfType('suite')>=6]]};
function starCap(){ let c=2; for(let s=3;s<=5;s++){ if(STAR_REQ[s].every(r=>r[1]())) c=s; else break; } return c; }
function stars(){ return Math.min(rawStars(),starCap()); }
function starMissing(s){ return (STAR_REQ[s]||[]).filter(r=>!r[1]()).map(r=>r[0]); }
function incomeMult(){ return city().mult*(1+0.15*state.prestige)*STAR_MULT[stars()-1]*(state.lux&&state.lux.statue?1.05:1)*(1+0.05*((state.legacy||{}).income||0))*(festivalOn()?1.15:1)*(state.rival&&state.rival.bought?1.1:1)*tierMult(); }
function seasonIx(){ return Math.floor((state.day-1)/SEASON_DAYS)%4; }
function season(){ return SEASONS[seasonIx()]; }
function isWinter(){ return seasonIx()===3; }
function hourOf(t){ return t<0.74 ? 7+t/0.74*15 : 22+(t-0.74)/0.26*9; }   // 07:00 .. 22:00 .. 07:00
function hourNow(){ return hourOf(state.t)%24; }
function isNight(){ const h=hourNow(); return h>=22.5||h<6.5; }
function capacity(){ return UPG.cap.vals[state.up.cap]; }
function magnetR(){ return UPG.magnet.vals[state.up.magnet]; }
function built(id){ return !!state.built[id]; }
function poolOpen(){ return built('pool')&&!(isWinter()&&state.weather==='snow')&&(state.weather==='sun'||state.weather==='cloud')&&!isNight()&&!stormOn(); }
function restOpen(){ const h=hourNow(); return built('rest')&&h>=8&&h<22.5; }
function gymOpen(){ const h=hourNow(); return built('gym')&&h>=7&&h<22; }
function floorsBuilt(){ return built('mescit')?5:built('roof')?4:built('f3')?3:built('f2')?2:1; }
const ROOF=3;
function floorName(f){ return f===4?'Mescit':f===ROOF?'Çatı':(f+1)+'. kat'; }
function roofOpen(){ const h=hourNow(); return built('roof')&&h>=10&&h<23.5&&state.weather!=='rain'&&state.weather!=='snow'&&!stormOn(); }

// =====================================================================
// SOUND (synthesized)
// =====================================================================
const Sound={ctx:null,master:null,music:null,noise:null,musicOn:false};
function audioInit(){
  if(Sound.ctx){ if(Sound.ctx.state==='suspended') Sound.ctx.resume(); return; }
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
  try{
    const c=Sound.ctx=new AC();
    // master → yumuşak kompresör → hoparlör; hafif oda yankısı (sentetik impuls) tüm seslere derinlik verir
    const comp=c.createDynamicsCompressor(); comp.threshold.value=-18; comp.knee.value=12; comp.ratio.value=3; comp.attack.value=0.004; comp.release.value=0.2;
    const tame=c.createBiquadFilter(); tame.type='lowpass'; tame.frequency.value=9000; tame.Q.value=0.5;
    Sound.master=c.createGain(); Sound.master.gain.value=0.9; Sound.master.connect(tame); tame.connect(comp); comp.connect(c.destination);
    const ir=c.createBuffer(2,Math.floor(c.sampleRate*1.6),c.sampleRate);
    for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<d.length;i++){ const k=i/d.length; d[i]=(Math.random()*2-1)*Math.pow(1-k,3.2)*(i<c.sampleRate*0.01?i/(c.sampleRate*0.01):1); } }
    const rev=c.createConvolver(); rev.buffer=ir; Sound.rev=c.createGain(); Sound.rev.gain.value=0.22; Sound.rev.connect(rev); rev.connect(Sound.master);
    Sound.sfx=c.createGain(); Sound.sfx.connect(Sound.master); Sound.sfx.connect(Sound.rev);
    const mlp=c.createBiquadFilter(); mlp.type='lowpass'; mlp.frequency.value=2400; mlp.Q.value=0.4; mlp.connect(Sound.master); mlp.connect(Sound.rev);
    Sound.music=c.createGain(); Sound.music.connect(mlp); applyAudioPrefs();
    const len=Math.floor(c.sampleRate*0.4), buf=c.createBuffer(1,len,c.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1; Sound.noise=buf;
    // uzun pembe gürültü (döngü duyulmasın): yağmur ve rüzgâr ambiyansı için
    const pl=Math.floor(c.sampleRate*6), pb=c.createBuffer(2,pl,c.sampleRate);
    for(let ch=0;ch<2;ch++){ const e=pb.getChannelData(ch); let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for(let i=0;i<pl;i++){ const w=Math.random()*2-1; b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.969*b2+w*0.153852; b3=0.8665*b3+w*0.3104856; b4=0.55*b4+w*0.5329522; b5=-0.7616*b5-w*0.016898;
        e[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926; }
      const f=Math.floor(c.sampleRate*0.05); for(let i=0;i<f;i++){ const k=i/f; e[pl-f+i]=e[pl-f+i]*(1-k)+e[i]*k; } }
    Sound.pink=pb;
    startMusic();
  }catch(e){ Sound.ctx=null; }
}
function tone(f,dur,type='sine',vol=.12,delay=0,dest,slide){
  const c=Sound.ctx; if(!c) return;
  const t=c.currentTime+delay, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(dest||Sound.sfx); o.start(t); o.stop(t+dur+0.05);
  if(type==='sine'&&!dest&&dur>0.15){ const o2=c.createOscillator(), g2=c.createGain(); o2.type='sine'; o2.frequency.setValueAtTime(f*2.001,t); if(slide) o2.frequency.exponentialRampToValueAtTime(slide*2,t+dur);
    g2.gain.setValueAtTime(0.0001,t); g2.gain.exponentialRampToValueAtTime(vol*0.18,t+0.01); g2.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.6); o2.connect(g2); g2.connect(Sound.sfx); o2.start(t); o2.stop(t+dur); }
}
function noiseBurst(dur,vol,freq,delay=0){
  const c=Sound.ctx; if(!c) return;
  const t=c.currentTime+delay, s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
  s.buffer=Sound.noise; f.type='bandpass'; f.frequency.value=freq; f.Q.value=0.8;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(Sound.sfx); s.start(t); s.stop(t+dur+0.05);
}
let lastSfx={}, coinStreak=0, coinLastT=0;
function sfx(name,p){
  if(!Sound.ctx||!state.sound) return;
  const now=performance.now(); if(lastSfx[name]&&now-lastSfx[name]<45) return; lastSfx[name]=now;
  switch(name){
    case 'ding':  tone(1568,1.1,'sine',.1); tone(2093,.8,'sine',.04,.01); tone(3136,.3,'sine',.012); break;
    case 'bell':  tone(2093,.7,'sine',.035); tone(2637,.55,'sine',.018,.09); break;   // hafif resepsiyon zili
    case 'req':   tone(880,.22,'sine',.06); tone(1175,.28,'sine',.06,.11); break;
    case 'coin':{ coinStreak=now-coinLastT<520?Math.min(15,coinStreak+1):0; coinLastT=now; const m=Math.pow(2,coinStreak/12);
      tone(1319*m+Math.random()*30,.09,'triangle',.05); tone(1976*m,.26,'sine',.05,.055); break; }
    case 'doorC': tone(95,.16,'sine',.1,0,null,60); noiseBurst(.08,.05,900); break;
    case 'doorO': noiseBurst(.12,.025,1400); tone(520,.06,'triangle',.015,.02); break;
    case 'thud':  tone(140,.22,'sine',.16,0,null,55); noiseBurst(.22,.08,420); break;
    case 'pick':  tone(660,.08,'triangle',.08,0,null,990); break;
    case 'drop':  tone(990,.1,'triangle',.08,0,null,520); break;
    case 'tick':  tone(p==null?1400+Math.random()*300:700+p*1100,.05,'triangle',.03); break;
    case 'clean': noiseBurst(.18,.05,2600); noiseBurst(.18,.05,2100,.17); tone(1760,.12,'sine',.015,.3); break;
    case 'sparkle': [0,.06,.12].forEach((d,k)=>tone(1760+k*440,.18,'sine',.04,d)); break;
    case 'fix':   [0,.13,.26].forEach(d=>{ tone(200,.08,'triangle',.07,d,null,140); noiseBurst(.05,.05,2200,d); }); break;
    case 'build': [523,659,784,1047].forEach((f,k)=>tone(f,.25,'triangle',.09,k*.07)); noiseBurst(.4,.05,700,.0); break;
    case 'fail':  tone(392,.2,'triangle',.08); tone(311,.32,'triangle',.08,.16); break;
    case 'star':  [523,659,784,1047,1319].forEach((f,k)=>tone(f,.4,'triangle',.09,k*.09)); break;
    case 'click': tone(700,.05,'sine',.05); break;
    case 'meow':  tone(620,.28,'sine',.07,0,null,980); tone(980,.35,'triangle',.05,.2,null,560); break;
    case 'alarm': [0,.3,.6].forEach(d=>{ tone(880,.24,'triangle',.07,d,null,660); }); break;
    case 'whoosh':noiseBurst(.35,.05,900); break;
  }
}
const CHORDS=[[261.6,329.6,392],[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7]];
let chordIx=0;
function startMusic(){
  const play=()=>{
    const c=Sound.ctx; if(!c||c.state!=='running'||!state.music) return;
    const ch=CHORDS[chordIx++%CHORDS.length], t=c.currentTime;
    ch.forEach(f=>[-4,4].forEach(dt=>{ const o=c.createOscillator(), g=c.createGain(); o.type='triangle'; o.frequency.value=f/2; o.detune.value=dt;
      g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.014,t+1.4); g.gain.linearRampToValueAtTime(0.0001,t+4.3);
      o.connect(g); g.connect(Sound.music); o.start(t); o.stop(t+4.4); }));
    { const o=c.createOscillator(), g=c.createGain(); o.type='sine'; o.frequency.value=ch[0]/4; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.03,t+0.3); g.gain.linearRampToValueAtTime(0.0001,t+3.6); o.connect(g); g.connect(Sound.music); o.start(t); o.stop(t+3.7); }
    for(let k=0;k<3;k++) tone(ch[Math.floor(Math.random()*3)]*2,.9,'sine',.018,k*1.2+Math.random()*.4,Sound.music);
  };
  play(); setInterval(play,3800);
}
function applyAudioPrefs(){ const V=state.vol||{sfx:.55,music:.45}; if(Sound.sfx) Sound.sfx.gain.value=state.sound===false?0:V.sfx; if(Sound.music) Sound.music.gain.value=state.music===false?0:V.music*1.2; }
document.addEventListener('pointerdown',()=>audioInit(),{passive:true});
document.addEventListener('keydown',()=>audioInit());
