
// =====================================================================
// COLLIDERS
// =====================================================================
const COLS={};                 // tag -> [[f,x0,x1,z0,z1],...]
const colByFloor=[[],[],[],[]];
const navDirty=[true,true,true,true];
function rebuildColIndex(){ colByFloor.forEach(a=>a.length=0); for(const t in COLS) for(const c of COLS[t]) colByFloor[c[0]].push(c); }
function addCols(tag,list){ if(COLS[tag]) COLS[tag].forEach(c=>navDirty[c[0]]=true); COLS[tag]=list; list.forEach(c=>navDirty[c[0]]=true); rebuildColIndex(); }
function removeCols(tag){ if(!COLS[tag]) return; COLS[tag].forEach(c=>navDirty[c[0]]=true); delete COLS[tag]; rebuildColIndex(); }
function walkRects(f){ return f===0?[[-17.3,17.3,BACK-0.12,12.75]]:[[-6.88,6.88,BACK+0.1,2.62],[4.92,6.28,2.45,4.12]]; }
function inWalk(f,x,z,m=0){ for(const r of walkRects(f)) if(x>=r[0]+m&&x<=r[1]-m&&z>=r[2]+m&&z<=r[3]-m) return true; return false; }
function blockedAt(f,x,z,r){
  if(!inWalk(f,x,z,0.05)) return true;
  for(const c of colByFloor[f]){ const cx=clamp(x,c[1],c[2]), cz=clamp(z,c[3],c[4]); const dx=x-cx, dz=z-cz; if(dx*dx+dz*dz<r*r) return true; }
  return false;
}

// =====================================================================
// NAV GRID + A*
// =====================================================================
const CELL=0.3, NAV_R=0.22;
const grids=[];
function gridFor(f){
  if(!grids[f]){ const r=f===0?[-17.4,17.4,BACK-0.3,12.85]:[-7,7,BACK-0.1,4.25];
    const w=Math.ceil((r[1]-r[0])/CELL), h=Math.ceil((r[3]-r[2])/CELL), n=w*h;
    grids[f]={f,x0:r[0],z0:r[2],w,h,b:new Uint8Array(n),gs:new Float32Array(n),from:new Int32Array(n),seen:new Uint32Array(n),closed:new Uint32Array(n),stamp:0}; }
  const g=grids[f];
  if(navDirty[f]){
    const rects=walkRects(f), cols=colByFloor[f], R=NAV_R;
    for(let j=0;j<g.h;j++) for(let i=0;i<g.w;i++){
      const x=g.x0+(i+0.5)*CELL, z=g.z0+(j+0.5)*CELL; let ok=false;
      for(const r of rects) if(x>=r[0]&&x<=r[1]&&z>=r[2]&&z<=r[3]){ ok=true; break; }
      if(ok) for(const c of cols) if(x>c[1]-R&&x<c[2]+R&&z>c[3]-R&&z<c[4]+R){ ok=false; break; }
      g.b[j*g.w+i]=ok?0:1;
    }
    navDirty[f]=false;
  }
  return g;
}
const cellI=(g,x)=>clamp(Math.floor((x-g.x0)/CELL),0,g.w-1);
const cellJ=(g,z)=>clamp(Math.floor((z-g.z0)/CELL),0,g.h-1);
const cx_=(g,i)=>g.x0+(i+0.5)*CELL, cz_=(g,j)=>g.z0+(j+0.5)*CELL;
function nearestFree(g,i,j){
  if(!g.b[j*g.w+i]) return [i,j];
  for(let r=1;r<10;r++){ let best=null,bd=1e9;
    for(let dj=-r;dj<=r;dj++) for(let di=-r;di<=r;di++){ if(Math.max(Math.abs(di),Math.abs(dj))!==r) continue;
      const ii=i+di, jj=j+dj; if(ii<0||jj<0||ii>=g.w||jj>=g.h||g.b[jj*g.w+ii]) continue; const d=di*di+dj*dj; if(d<bd){ bd=d; best=[ii,jj]; } }
    if(best) return best; }
  return null;
}
// binary heap on f-scores
const heap={a:[],f:null,
  push(i,f){ const a=this.a; a.push([i,f]); let k=a.length-1; while(k>0){ const p=(k-1)>>1; if(a[p][1]<=a[k][1]) break; [a[p],a[k]]=[a[k],a[p]]; k=p; } },
  pop(){ const a=this.a, top=a[0], last=a.pop(); if(a.length){ a[0]=last; let k=0; for(;;){ const l=2*k+1, r=l+1; let m=k; if(l<a.length&&a[l][1]<a[m][1]) m=l; if(r<a.length&&a[r][1]<a[m][1]) m=r; if(m===k) break; [a[m],a[k]]=[a[k],a[m]]; k=m; } } return top; }};
const NB=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.4142],[1,-1,1.4142],[-1,1,1.4142],[-1,-1,1.4142]];
function astar(g,si,sj,ti,tj){
  const W=g.w, st=++g.stamp, s=sj*W+si, t=tj*W+ti;
  heap.a.length=0; g.gs[s]=0; g.from[s]=-1; g.seen[s]=st; heap.push(s,0);
  let iter=0;
  while(heap.a.length){
    const [cur]=heap.pop(); if(cur===t) break;
    if(g.closed[cur]===st) continue; g.closed[cur]=st;
    if(++iter>20000) return null;
    const ci=cur%W, cj=(cur-ci)/W;
    for(const [di,dj,cost] of NB){
      const ni=ci+di, nj=cj+dj; if(ni<0||nj<0||ni>=W||nj>=g.h) continue;
      const n=nj*W+ni; if(g.b[n]||g.closed[n]===st) continue;
      if(di&&dj&&(g.b[cj*W+ni]||g.b[nj*W+ci])) continue;
      const ng=g.gs[cur]+cost;
      if(g.seen[n]!==st||ng<g.gs[n]){ g.seen[n]=st; g.gs[n]=ng; g.from[n]=cur;
        const dx=Math.abs(ni-ti), dz=Math.abs(nj-tj); heap.push(n,ng+(dx+dz)+(1.4142-2)*Math.min(dx,dz)); }
    }
  }
  if(g.seen[t]!==st) return null;
  const out=[]; for(let c=t;c!==-1;c=g.from[c]) out.push(c); out.reverse(); return out;
}
function los(g,ax,az,bx,bz){
  const len=Math.hypot(bx-ax,bz-az), n=Math.ceil(len/(CELL*0.4));
  for(let k=1;k<n;k++){ const t=k/n, x=ax+(bx-ax)*t, z=az+(bz-az)*t; if(g.b[cellJ(g,z)*g.w+cellI(g,x)]) return false; }
  return true;
}
function findPath(f,ax,az,bx,bz){
  const g=gridFor(f);
  let s=nearestFree(g,cellI(g,ax),cellJ(g,az)), t=nearestFree(g,cellI(g,bx),cellJ(g,bz));
  if(!s||!t) return null;
  const tFree=!g.b[cellJ(g,bz)*g.w+cellI(g,bx)];
  const endX=tFree?bx:cx_(g,t[0]), endZ=tFree?bz:cz_(g,t[1]);
  if(s[0]===t[0]&&s[1]===t[1]) return [{x:endX,z:endZ,f}];
  const cells=astar(g,s[0],s[1],t[0],t[1]); if(!cells) return null;
  const pts=cells.map(c=>{ const i=c%g.w, j=(c-i)/g.w; return [cx_(g,i),cz_(g,j)]; });
  pts[pts.length-1]=[endX,endZ];
  // string pulling
  const out=[]; let cur=[ax,az], k=0;
  while(k<pts.length-1){
    let far=k; for(let m=pts.length-1;m>k;m--){ if(los(g,cur[0],cur[1],pts[m][0],pts[m][1])){ far=m; break; } }
    if(far===k) far=k+1;
    out.push({x:pts[far][0],z:pts[far][1],f}); cur=pts[far]; k=far;
  }
  if(!out.length) out.push({x:endX,z:endZ,f});
  return out;
}
// multi-floor route (through the elevator)
function route(f,ax,az,tf,tx,tz){
  if(f===tf) return findPath(f,ax,az,tx,tz);
  if(Math.max(f,tf)>=floorsBuilt()) return null;
  const a=findPath(f,ax,az,L.elev.x,L.elev.z), b=findPath(tf,L.elev.x,L.elev.z,tx,tz);
  if(!a||!b) return null;
  return [...a,{x:L.elev.x,z:L.elev.z,f:tf,ride:true},...b];
}
function unstick(e){
  if(!blockedAt(e.f,e.x,e.z,0.2)) return;
  const g=gridFor(e.f), c=nearestFree(g,cellI(g,e.x),cellJ(g,e.z)); if(c){ e.x=cx_(g,c[0]); e.z=cz_(g,c[1]); }
}
