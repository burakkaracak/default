function Any(){
  const store={children:[], userData:{}};
  const fn=function(){ return Any(); };
  const p=new Proxy(fn,{
    get(t,k){
      if(k===Symbol.toPrimitive) return ()=>0;
      if(k==='then') return undefined;
      if(k==='add') return (...a)=>{ a.forEach(o=>{ if(o&&o.__setParent) o.__setParent(p); }); store.children.push(...a); return p; };
      if(k==='remove') return (o)=>{ const i=store.children.indexOf(o); if(i>=0) store.children.splice(i,1); return p; };
      if(k==='traverse') return (cb)=>{ cb(p); store.children.forEach(c=>c.traverse&&c.traverse(cb)); };
      if(k==='__setParent') return (par)=>{ store.parent=par; };
      if(k==='parent') return store.parent||null;
      if(k==='clone'||k==='rotateX'||k==='translate') return ()=>p;
      if(!(k in store)) store[k]=Any();
      return store[k];
    },
    set(t,k,v){ store[k]=v; return true; },
    construct(){ return Any(); }, apply(){ return Any(); }
  });
  return p;
}
class V3{ constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;} clone(){return new V3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;} sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;} addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);} normalize(){const l=this.length()||1;return this.multiplyScalar(1/l);}
  project(){ this.x=0; this.y=0; this.z=0.5; return this; } setScalar(s){this.x=this.y=this.z=s;return this;} }
function Obj(){ const o=Any(); o.position=new V3(); o.userData={}; o.visible=true; return o; }
window.THREE=new Proxy({},{get(t,k){
  if(k==='MathUtils') return {smoothstep:(x,a,b)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);}};
  if(k==='Vector3') return V3;
  if(k==='WebGLRenderer') return function(){ const r=Any(); r.domElement=document.createElement('canvas'); return r; };
  if(['Mesh','Group','Sprite','Points','LineSegments'].includes(k)) return function(){ return Obj(); };
  return function(){ return Any(); };
}});
