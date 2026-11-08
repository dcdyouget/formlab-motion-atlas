/* Fit the mesh's relaxed hands to the tutorial's palm and grip landmarks.
   Preserve the detailed fingers and blend the correction into the distal forearm. */
(() => {
  'use strict';
  const caches=new WeakMap();
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const times=(a,x)=>[a[0]*x,a[1]*x,a[2]*x];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>times(a,1/(Math.hypot(...a)||1));
  const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  const project=(a,b)=>sub(a,times(b,dot(a,b)));
  const mv=(m,a)=>[dot(m[0],a),dot(m[1],a),dot(m[2],a)];
  const blend=(a,b,t)=>a+(b-a)*t;
  function sm(a,b,t){const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)}
  function inverse(m){
    const a=[m[0][0],m[1][0],m[2][0]],b=[m[0][1],m[1][1],m[2][1]],c=[m[0][2],m[1][2],m[2][2]];
    const bc=cross(b,c),det=dot(a,bc);
    if(Math.abs(det)<1e-5)return null;
    return [times(bc,1/det),times(cross(c,a),1/det),times(cross(a,b),1/det)];
  }
  // The source mesh includes four anatomical landmarks per finger. Fit each
  // digit around a shared handle while retaining its own length and knuckles.
  function palmSpace(data,sign) {
    const side=sign>0?'l':'r', lm=key=>data.landmarks['joint-'+side+'-'+key], wrist=lm('hand');
    const digits=Array.from({length:5},(_,i)=>Array.from({length:4},(_,j)=>lm('finger-'+(i+1)+'-'+(j+1))));
    const long=norm(sub(digits[2][0],wrist));
    const lateral=norm(project(sub(digits[1][0],digits[4][0]),long));
    const normal=times(cross(lateral,long),sign);
    const local=pt=>{const v=sub(pt,wrist);return [dot(v,lateral),dot(v,long),dot(v,normal)]};
    return {local,long,lateral,normal,digits:digits.map(finger=>finger.map(local))};
  }
  function fingerCoordinates(q,chain){
    let min=Infinity,hit,run=0;
    for(let j=1;j<4;j++){
      const a=chain[j-1],v=sub(chain[j],a),delta=sub(q,a),len=Math.hypot(...v);
      const t=Math.max(0,Math.min(1,dot(delta,v)/dot(v,v)));
      const offset=sub(delta,times(v,t)),dist=dot(offset,offset);
      if(dist<min){min=dist;hit={arc:run+len*t,offset}}
      run+=len;
    }
    return hit;
  }
  function gripShape(q,n,space,weights){
    const scale=.87, [u,d,v]=times(q,scale),radius=.022,open=[u,d,v];
    const palm=[u,d-.013*sm(.03,.105,d),v], closed=palm.slice(),normal=n.slice();
    for(let digit=0;digit<5;digit++){
      const w=weights?.[digit] || 0;
      if(!w)continue;
      const chain=space.digits[digit],[ku,kd,kv]=times(chain[0],scale);
      const hit=fingerCoordinates(q,chain),arc=hit.arc*scale,[ou,od,ov]=times(hit.offset,scale);
      const angle=Math.min(3.85,arc/radius),rem=Math.max(0,arc-radius*angle);
      const ca=Math.cos(angle),sa=Math.sin(angle);
      let target;
      if(digit===0){
        // Thumb opposition brings the tip back across the fingers.
        const t=Math.max(0,Math.min(1,arc/.086)),b=1-t;
        target=[b*b*ku+2*b*t*.072+t*t*.017+ou,b*b*kd+2*b*t*.108+t*t*.091+od,b*b*kv+2*b*t*(-.008)+t*t*(-.034)+ov];
      }else{
        target=[ku+ou,.087+(radius+ov)*sa+rem*ca+od*ca,.006-radius+(radius+ov)*ca-rem*sa-od*sa];
      }
      const rotated=[n[0],n[1]*ca+n[2]*sa,n[2]*ca-n[1]*sa];
      for(let k=0;k<3;k++){closed[k]+=(target[k]-palm[k])*w;normal[k]+=(rotated[k]-n[k])*w}
    }
    return {open,closed,closedN:norm(normal)};
  }
  function preserveWebbing(vertices,data){
    // Neighbouring thumb and index vertices share a web even when their bone
    // influences differ. Limit strain on its original edges in the closed pose.
    const lookup=new Map(vertices.map(v=>[v.off/3,v])),raw=atob(data.arrays.indicesU16.body);
    const word=i=>raw.charCodeAt(i)+raw.charCodeAt(i+1)*256,seen=new Set(),edges=[];
    for(let i=0;i<raw.length;i+=6){
      const tri=[word(i),word(i+2),word(i+4)];
      for(let k=0;k<3;k++){
        const a=tri[k],b=tri[(k+1)%3],lo=Math.min(a,b),hi=Math.max(a,b);
        const key=lo*65536+hi;
        if(!lookup.has(lo)||!lookup.has(hi)||seen.has(key))continue;
        seen.add(key);
        const first=lookup.get(lo),second=lookup.get(hi),len=Math.hypot(...sub(first.open,second.open));
        if(len>.00001)edges.push([first.closed,second.closed,len]);
      }
    }
    for(let pass=0;pass<12;pass++)for(const [a,b,rest] of edges){
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);
      if(len<.000001)continue;
      const limit=Math.max(.55*rest,Math.min(1.55*rest,len)),w=.46*(len-limit)/len;
      a[0]+=dx*w;a[1]+=dy*w;a[2]+=dz*w;b[0]-=dx*w;b[1]-=dy*w;b[2]-=dz*w;
    }
  }
  function prepare(positions,normals,joints,weights,data){
    const vertices=[],skinSets=[],byWeights=new Map(),spaces=[palmSpace(data,-1),palmSpace(data,1)];
    const fingerWeights=new Map(), raw=atob(data.arrays.digitsU8);
    for(let i=0;i<raw.length;i+=7)fingerWeights.set(raw.charCodeAt(i)+256*raw.charCodeAt(i+1),Array.from({length:5},(_,k)=>raw.charCodeAt(i+k+2)/255));
    let first=positions.length/3,last=-1;
    for(let idx=0;idx<positions.length/3;idx++){
      const off=idx*3,pt=Array.from(positions.subarray(off,off+3)),side=pt[0]>0?1:0;
      if(Math.abs(pt[0])<.36||pt[1]>1.30||pt[1]<.92)continue;
      const space=spaces[side],q=space.local(pt),[u,d,v]=q;
      if(d<-.100||Math.abs(u)>.13||Math.abs(v)>.09)continue;
      const infl=[];for(let k=0;k<4;k++)if(weights[idx*4+k])infl.push([joints[idx*4+k],weights[idx*4+k]/255]);
      const key=infl.map(i=>i.join(',')).join('/');
      if(!byWeights.has(key)){byWeights.set(key,skinSets.length);skinSets.push(infl)}
      const normal=norm(Array.from(normals.subarray(off,off+3)));
      const handN=[dot(normal,space.lateral),dot(normal,space.long),dot(normal,space.normal)];
      const shape=gripShape(q,handN,space,fingerWeights.get(idx));
      vertices.push({off,side,pt,normal,mask:sm(-.097,.004,d),handN,...shape,set:byWeights.get(key)});
      first=Math.min(first,idx);last=Math.max(last,idx);
    }
    preserveWebbing(vertices,data);
    return {vertices,skinSets,first,last};
  }
  function turnAround(a,b,t,axis,preferredSign){
    const ang=Math.atan2(dot(axis,cross(a,b)),Math.max(-1,Math.min(1,dot(a,b))));
    // Specify the side of the half turn when both projected directions oppose.
    const angle=Math.abs(ang)>Math.PI-.0001?preferredSign*Math.PI:ang;
    return norm(add(times(a,Math.cos(t*angle)),times(cross(axis,a),Math.sin(t*angle))));
  }
  function contactFrame(p,id,side){
    const sign=side?1:-1,w=p.wrists[side], e=p.elbows[side], forearm=norm(sub(w,e));
    let distance=10, handle=null;
    if(p.bar&&w[0]>=p.bar.a[0]&&w[0]<=p.bar.b[0]){
      distance=Math.hypot(w[1]-p.bar.a[1],w[2]-p.bar.a[2]);handle=[-sign,0,0];
    }
    for(const [i,d] of (p.dumbbells||[]).entries()){
      const gap=Math.hypot(...sub(w,d));
      if(gap<distance){
        distance=gap;
        const axis=p.dumbbellAxes?.[i] || (id==='row'?[0,0,1]:[1,0,0]);
        // Neutral grips place the thumbs toward the front. A transverse handle
        // is held overhand except during the supinated dumbbell curl.
        const neutral=['hammer','dbrow','shrug','dbsquat','row','dbfly','lateral'].includes(id);
        handle=times(axis,neutral?1:id==='curl'?sign:-sign);
      }
    }
    if(p.kettlebell)for(const pt of p.kettlebell.handles){const gap=Math.hypot(...sub(w,pt));if(gap<distance){distance=gap;handle=[0,1,.20]}}
    const grip=1-sm(.035,.125,distance);
    const explicit=p.handSupports?.[side];
    const benchPalm=!!p.bench&&((id==='row'&&side===0)||id==='inclinepush'||id==='benchleg')&&Math.abs(w[2]-(p.bench.a[2]+p.bench.b[2])*.5)<.82;
    const floorPalm=['pushup','plank','bridge','climber','singlebridge','superman'].includes(id);
    const supportY=explicit?.y??(benchPalm?p.bench.a[1]:(p.mat ? .0115 : 0));
    const flat=explicit?(1-grip)*explicit.weight:(floorPalm||benchPalm)?(1-grip)*(1-sm(.12,.23,w[1]-supportY)):0;
    const forward=norm(explicit?.direction || [0,0,1]);
    const long=norm(mix(forearm,forward,flat));
    // The sagittal neutral frame follows elbow flexion continuously. The two
    // frontal-plane lifts instead keep their thumb axis along the torso.
    let neutral=norm(cross(long,[1,0,0]));
    if(id==='lateral'||id==='dbfly'){
      const ref=id==='dbfly'?norm(mix([0,0,1],times(p.torso.axis,-1),1-sm(.25,.8,p.torso.shoulder[1]))):[0,0,1];
      const other=project(ref,long);if(Math.hypot(...other)>.16)neutral=norm(other);
    }
    if(Math.hypot(...neutral)<.5)neutral=norm(project([0,0,1],long));
    const desired=p.handRadials?.[side] || handle || neutral;
    const across=flat>0?mix(desired,[-sign,0,0],flat):desired;
    const target=project(across,long);
    const lateral=Math.hypot(...target)>.0001?turnAround(neutral,norm(target),Math.max(grip,flat),long,sign):neutral;
    const normal=times(norm(cross(lateral,long)),sign);
    const basePoint=add(sub(w,times(long,blend(.064,.087,grip))),times(normal,.014*grip));
    if(flat>0)basePoint[1]=blend(basePoint[1],supportY+.017,flat);
    return {long,lateral,normal,basePoint,grip,flat,supportY};
  }
  function orientation(f,side){
    // Convert the hand basis to a proper rotation; opposite hands mirror X.
    const X=times(f.lateral,side?1:-1),Y=f.long,Z=f.normal;
    const m=[X[0],Y[0],Z[0],X[1],Y[1],Z[1],X[2],Y[2],Z[2]];
    const trace=m[0]+m[4]+m[8];
    if(trace>0){const v=Math.sqrt(trace+1)*2;return [(m[7]-m[5])/v,(m[2]-m[6])/v,(m[3]-m[1])/v,v*.25]}
    if(m[0]>m[4]&&m[0]>m[8]){const v=Math.sqrt(1+m[0]-m[4]-m[8])*2;return [v*.25,(m[1]+m[3])/v,(m[2]+m[6])/v,(m[7]-m[5])/v]}
    if(m[4]>m[8]){const v=Math.sqrt(1+m[4]-m[0]-m[8])*2;return [(m[1]+m[3])/v,v*.25,(m[5]+m[7])/v,(m[2]-m[6])/v]}
    const v=Math.sqrt(1+m[8]-m[0]-m[4])*2;return [(m[2]+m[6])/v,(m[5]+m[7])/v,v*.25,(m[3]-m[1])/v];
  }
  function interpolate(a,b,t){
    const d=a.reduce((sum,x,k)=>sum+x*b[k],0),sign=d<0?-1:1;
    const q=a.map((v,i)=>v*(1-t)+b[i]*sign*t),length=Math.hypot(...q);
    return q.map(v=>v/length);
  }
  const tracks=new Map(), samples=256, frameCache=new WeakMap();
  function orientationTrack(id){
    if(tracks.has(id))return tracks.get(id);
    let keys=Array.from({length:samples},(_,i)=>{
      const p=window.AtlasMotion.sample(i/samples,id).pose;
      return [0,1].map(side=>orientation(contactFrame(p,id,side),side));
    });
    // Circular smoothing of unit rotations eases entry/exit from a grip.
    // Its result depends only on the cycle phase, including when scrubbing back.
    for(let pass=0;pass<16;pass++){
      const prev=keys;
      keys=prev.map((pair,i)=>pair.map((q,side)=>{
        const left=prev[(i+samples-1)%samples][side],right=prev[(i+1)%samples][side];
        return interpolate(interpolate(q,left,.5),interpolate(q,right,.5),.5);
      }));
    }
    tracks.set(id,keys);return keys;
  }
  function frame(p,id,side){
    const phase=window.AtlasMotion?.phaseOf?.(p);
    let entry=frameCache.get(p);
    if(entry?.id===id&&entry.phase===phase&&entry[side])return entry[side];
    const f=contactFrame(p,id,side);
    if(Number.isFinite(phase)){
      const track=orientationTrack(id),pos=phase*samples,i=Math.floor(pos)%samples;
      const [x,y,z,h]=interpolate(track[i][side],track[(i+1)%samples][side],pos-Math.floor(pos));
      f.lateral=times([1-2*(y*y+z*z),2*(x*y+h*z),2*(x*z-h*y)],side?1:-1);
      f.long=[2*(x*y-h*z),1-2*(x*x+z*z),2*(y*z+h*x)];
      f.normal=times(cross(f.lateral,f.long),side?1:-1);
      f.basePoint=add(sub(p.wrists[side],times(f.long,blend(.064,.087,f.grip))),times(f.normal,.014*f.grip));
      if(f.flat>0)f.basePoint[1]=blend(f.basePoint[1],f.supportY+.017,f.flat);
    }
    if(!entry||entry.id!==id||entry.phase!==phase){entry={id,phase};frameCache.set(p,entry)}
    entry[side]=f;return f;
  }
  function skinMatrix(infl,rig){
    const m=[[0,0,0],[0,0,0],[0,0,0]],b=[[0,0,0],[0,0,0],[0,0,0]],translation=[0,0,0];
    for(const [id,w] of infl){const bone=rig.cpu[id];for(let i=0;i<3;i++){
      translation[i]+=bone.translation[i]*w;for(let j=0;j<3;j++){m[i][j]+=bone.lin[i][j]*w;b[i][j]+=bone.invN[i][j]*w}
    }}
    return {m,b,translation,inv:inverse(m),invN:inverse(b)};
  }
  function update(p,id,rig,positions,normals,joints,weights,data){
    let c=caches.get(positions);
    if(!c){c=prepare(positions,normals,joints,weights,data);caches.set(positions,c)}
    const skins=c.skinSets.map(set=>skinMatrix(set,rig)),frames=[frame(p,id,0),frame(p,id,1)];
    for(const vert of c.vertices){
      const {off}=vert,sk=skins[vert.set],f=frames[vert.side];
      if(!sk.inv||!sk.invN)continue;
      const [lateral,along,thickness]=mix(vert.open,vert.closed,f.grip);
      const depth=blend(thickness,Math.max(-.016,thickness*.52),f.flat);
      const posed=add(f.basePoint,add(times(f.lateral,lateral),add(times(f.long,along),times(f.normal,depth))));
      const [nu,nd,nv]=mix(vert.handN,vert.closedN,f.grip);
      let normal=norm(add(times(f.lateral,nu),add(times(f.long,nd),times(f.normal,nv))));
      const edge=p.handSupports?.[vert.side]?.edge;
      if(Number.isFinite(edge)&&f.flat>0){
        const sign=edge>0?1:-1,over=Math.max(0,(posed[0]-edge)*sign),r=.010;
        const turn=Math.min(Math.PI/2,over/r)*f.flat,tail=over-r*turn;
        if(over>0){
          posed[0]=edge+sign*(r*Math.sin(turn)+tail*Math.cos(turn));
          posed[1]-=r*(1-Math.cos(turn))+tail*Math.sin(turn);
          const nx=normal[0]*Math.cos(turn)+sign*normal[1]*Math.sin(turn);
          normal=[nx,normal[1]*Math.cos(turn)-sign*normal[0]*Math.sin(turn),normal[2]];
        }
      }
      const basePosition=add(mv(sk.m,vert.pt),sk.translation);
      const out=mv(sk.inv,sub(mix(basePosition,posed,vert.mask),sk.translation));
      const targetN=norm(mv(sk.invN,mix(norm(mv(sk.b,vert.normal)),normal,vert.mask)));
      for(let k=0;k<3;k++){positions[off+k]=out[k];normals[off+k]=Math.round(targetN[k]*127)}
    }
    return {first:c.first,last:c.last};
  }
  window.AtlasHands={update,frame};
})();
