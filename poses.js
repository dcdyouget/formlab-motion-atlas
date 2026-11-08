(() => {
  'use strict';
  // World coordinates in metres: X is the athlete's right, Y is up, Z is forwards.
  const sides=[-1,1], thigh=.45, shin=.43, upperArm=.31, forearm=.33, trunk=.56;
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,t)=>a.map(v=>v*t);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const norm=a=>mul(a,1/(Math.hypot(...a)||1));
  const mix=(a,b,t)=>add(a,mul(sub(b,a),t));
  const lateral=(p,x)=>add(p,[x,0,0]);
  const sagittal=angle=>[0,Math.cos(angle),Math.sin(angle)];
  // Solve a two-link chain. The pole selects the bending plane of the joint.
  function joint(start,end,a,b,pole){
    const v=sub(end,start),d=Math.max(.0001,Math.hypot(...v)),dir=mul(v,1/d);
    const proj=Math.max(-a,Math.min(a,(a*a-b*b+d*d)/(2*d)));
    const normal=norm(sub(pole,mul(dir,dot(pole,dir))));
    return add(add(start,mul(dir,proj)),mul(normal,Math.sqrt(Math.max(0,a*a-proj*proj))));
  }
  function torso(hip,axis){
    const shoulder=add(hip,mul(axis,trunk));
    return {hip,shoulder,axis,right:[1,0,0],depth:[0,-axis[2],axis[1]],mid:mix(hip,shoulder,.52)};
  }
  function body(p,hip,axis,headAxis=axis){
    p.torso=torso(hip,axis);p.shoulder=p.torso.shoulder;p.headAxis=headAxis;
    p.head=add(p.shoulder,mul(headAxis,.225));
    p.hips=sides.map(s=>lateral(hip,s*.145));
  }
  function makePose(options){
    const p={type:options.type||'setup'};
    body(p,options.hip,options.axis,options.headAxis||options.axis);
    p.ankles=options.ankles;
    p.knees=options.knees||p.hips.map((h,i)=>joint(h,p.ankles[i],thigh,shin,(options.legPoles||[])[i]||[0,0,1]));
    if(options.wrists){
      p.wrists=options.wrists;
      p.elbows=options.elbows||shoulders(p).map((s,i)=>joint(s,p.wrists[i],upperArm,forearm,(options.armPoles||[])[i]||[sides[i],0,1]));
    }else hang(p);
    feet(p,options.footDirections);
    if(options.props)Object.assign(p,options.props);
    return p;
  }
  function standingPose(){
    const p={type:'stand'};
    const hip=[0,.971,-.021],axis=[0,1,0];
    body(p,hip,axis);
    p.ankles=sides.map(s=>[s*.15,.099,-.014]);
    p.knees=p.hips.map((h,i)=>joint(h,p.ankles[i],thigh,shin,[0,0,1]));
    const sh=shoulders(p);
    const wrists=sh.map((v,i)=>add(v,[sides[i]*.036,-.626,.055]));
    arms(p,wrists,sides.map(s=>[s*.12,0,-1]));
    feet(p);
    return p;
  }
  function blendValue(a,b,t){
    if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
    if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length)return a.map((v,i)=>blendValue(v,b[i],t));
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
      const out={};
      for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
        if(key in a&&key in b)out[key]=blendValue(a[key],b[key],t);
        else out[key]=cloneValue(t<.5?a[key]:b[key]);
      }
      return out;
    }
    return cloneValue(t<.5?a:b);
  }
  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(value&&typeof value==='object'){
      const out={};for(const key of Object.keys(value))out[key]=cloneValue(value[key]);return out;
    }
    return value;
  }
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function rotate(v,axis,angle){
    return add(add(mul(v,Math.cos(angle)),mul(cross(axis,v),Math.sin(angle))),mul(axis,dot(axis,v)*(1-Math.cos(angle))));
  }
  function carried(pole,from,to){
    const axis=cross(from,to),n=Math.hypot(...axis),c=dot(from,to);
    return n>.00001?rotate(pole,mul(axis,1/n),Math.atan2(n,c)):c>=0?pole:rotate(pole,norm(cross(from,pole)),Math.PI);
  }
  function bendFrame(origin,joint,end,hint){
    const dir=norm(sub(end,origin)), bend=sub(joint,origin);
    let pole=sub(bend,mul(dir,dot(bend,dir)));
    if(Math.hypot(...pole)<.0001)pole=sub(hint,mul(dir,dot(hint,dir)));
    if(Math.hypot(...pole)<.0001)pole=cross(dir,[.3,.7,.6]);
    return {dir,pole:norm(pole),a:Math.hypot(...bend),b:Math.hypot(...sub(end,joint))};
  }
  function blendJoint(origin,end,from,to,t){
    const dir=norm(sub(end,origin));
    const endPole=carried(from.pole,from.dir,to.dir);
    const roll=Math.atan2(dot(to.dir,cross(endPole,to.pole)),dot(endPole,to.pole));
    const pole=rotate(carried(from.pole,from.dir,dir),dir,roll*t);
    return joint(origin,end,from.a+(to.a-from.a)*t,from.b+(to.b-from.b)*t,pole);
  }
  function blendPose(a,b,t){
    const fraction=Math.max(0,Math.min(1,t));
    const p=blendValue(a,b,fraction);
    if(p.torso&&p.torso.hip&&p.torso.axis){
      const axis=norm(p.torso.axis);
      let hip=p.torso.hip;
      // A rotating spine sweeps the shoulders outside a straight Cartesian
      // blend. Preserve a reachable shoulder-hand distance during that sweep.
      if(p.wrists){
        const linearShoulder=mix(a.shoulder,b.shoulder,fraction);
        const shoulder=add(hip,mul(axis,trunk));
        const reach=point=>Math.max(...p.wrists.map((w,i)=>Math.hypot(...sub(w,lateral(point,sides[i]*.246)))));
        if(reach(shoulder)>upperArm+forearm){
          let lo=0,hi=1;
          for(let j=0;j<9;j++){const u=(lo+hi)/2;if(reach(mix(shoulder,linearShoulder,u))>.6399)lo=u;else hi=u}
          hip=add(hip,mul(sub(linearShoulder,shoulder),hi));
        }
      }
      p.torso=torso(hip,axis);
      p.shoulder=p.torso.shoulder;
      p.headAxis=norm(p.headAxis||p.torso.axis);
      p.head=add(p.shoulder,mul(p.headAxis,.225));
      p.hips=sides.map(s=>lateral(p.torso.hip,s*.145));
      if(p.ankles&&p.knees){
        p.knees=p.hips.map((hip,i)=>blendJoint(hip,p.ankles[i],
          bendFrame(a.hips[i],a.knees[i],a.ankles[i],[0,0,1]),
          bendFrame(b.hips[i],b.knees[i],b.ankles[i],[0,0,1]),fraction));
      }
      if(p.wrists&&p.elbows){
        const s0=shoulders(a),s1=shoulders(b);
        p.elbows=shoulders(p).map((sh,i)=>blendJoint(sh,p.wrists[i],
          bendFrame(s0[i],a.elbows[i],a.wrists[i],[sides[i],.08,0]),
          bendFrame(s1[i],b.elbows[i],b.wrists[i],[sides[i],.08,0]),fraction));
      }
      if(p.ankles&&p.footDirection)feet(p,p.footDirection);
    }
    return p;
  }
  const shoulders=p=>sides.map(s=>add(p.shoulder,[s*.246,p.shoulderLift||0,0]));
  function arms(p,wrists,poles){
    p.wrists=wrists;p.elbows=shoulders(p).map((s,i)=>joint(s,wrists[i],upperArm,forearm,poles[i]));
  }
  function legs(p,ankles){p.ankles=ankles;p.knees=p.hips.map((h,i)=>joint(h,ankles[i],thigh,shin,[0,0,1]))}
  function feet(p,dirs){
    p.footDirection=dirs||sides.map(s=>norm([s*.08,0,1]));
    p.feet=p.ankles.map((a,i)=>add(add(a,mul(p.footDirection[i],.052)),[0,-.04,0]));
  }
  function bar(y,z,width=1.01){return {a:[-width,y,z],b:[width,y,z],plates:true}}
  function hang(p){
    p.elbows=shoulders(p).map((v,i)=>add(v,[sides[i]*.038,-.30,.025]));
    p.wrists=p.elbows.map((v,i)=>add(v,[sides[i]*.015,-.322,.048]));
  }
  function hingeOrSquat(p,q,isSquat){
    const shinAngle=isSquat?.04+.48*q:.035+.065*q;
    const thighAngle=isSquat?-.06-1.49*q:-.06-.44*q;
    const stance=isSquat?.223:.151;
    p.ankles=sides.map(s=>[s*stance,.0993,-.045]);
    p.knees=p.ankles.map((a,i)=>add(add(a,mul(sagittal(shinAngle),shin)),[sides[i]*(isSquat?.025*q:0),0,0]));
    const knee=mix(...p.knees,.5);
    const hip=add(knee,mul(sagittal(thighAngle),thigh));
    const lean=isSquat?.055+.51*q:.02+1.16*q;
    body(p,hip,sagittal(lean),sagittal(isSquat?lean:lean-.32*q));
    const [sx,sy,sz]=p.shoulder;
    if(isSquat){
      const y=sy+.007,z=sz-.087;
      p.bar=bar(y,z);p.bar.shoulder=true;
      arms(p,sides.map(s=>[s*.46,y,z]),sides.map(s=>[s*.2,-1,-.66]));
    }else{
      const z=.116+.073*q, y=sy-Math.sqrt((upperArm+forearm-.003)**2-(z-sz)**2);
      arms(p,sides.map(s=>[s*.257,y,z]),sides.map(s=>[s*.22,.03,-.9]));
      p.bar=bar(y,z);
    }
    feet(p);
  }
  const matY = .0115;
  function palmSupports(p, surface, directions, weights = [1,1]) {
    p.handSupports = directions.map((direction,i)=>({y:surface,weight:weights[i],direction}));
    return p;
  }
  // Offsets of the rendered trainer sole under the ankle and in front of it.
  // Interpolation lets the outsole roll from its flat patch onto the toe.
  const shoePitch = [0, 6, 7.5, 15, 22.5, 30, 37.5, 45, 52.5, 60, 67.5, 75, 82.5, 90];
  const shoeHeight = [.0991,.0929,.1006,.1288,.1556,.1805,.2032,.2232,.2402,.2539,.2641,.2705,.273,.2716];
  const toeReach = [.223,.2203,.2189,.2096,.1967,.1804,.161,.1388,.1142,.0875,.0592,.0298,-.0003,-.0305];
  function toeContact(x, toeZ, degrees, surface=0) {
    let i=1;
    while(i<shoePitch.length-1 && shoePitch[i]<degrees)i++;
    const t=Math.max(0,Math.min(1,(degrees-shoePitch[i-1])/(shoePitch[i]-shoePitch[i-1])));
    const value=a=>a[i-1]+(a[i]-a[i-1])*t;
    const rad=degrees*Math.PI/180;
    return {ankle:[x,surface+value(shoeHeight),toeZ-value(toeReach)],direction:[0,-Math.sin(rad),Math.cos(rad)]};
  }
  function floorProne(p,q,plank){
    const slope=plank?.094:.292-.23*q;
    const axis=[0,Math.sin(slope),Math.cos(slope)];
    const toes=sides.map(s=>toeContact(s*.105,-.69,46,matY));
    const base=mix(toes[0].ankle,toes[1].ankle,.5);
    body(p,add(base,mul(axis,.875)),axis);
    p.ankles=toes.map(f=>f.ankle);
    p.knees=p.hips.map((h,i)=>joint(h,p.ankles[i],thigh,shin,[0,1,.2]));
    if(plank){
      p.elbows=shoulders(p).map(v=>add(v,[0,-upperArm,0]));
      p.wrists=p.elbows.map(e=>add(e,[0,.054-e[1],Math.sqrt(forearm*forearm-(e[1]-.054)**2)]));
    }else{
      arms(p,sides.map(s=>[s*.365,.054,.366]),sides.map(s=>[s*.72,.14,-1]));
    }
    feet(p,toes.map(f=>f.direction));
    palmSupports(p,matY,[[0,0,1],[0,0,1]]);
  }
  function floorSupine(p,q,bench){
    if(bench){
      const hip=[0,.661,.22],axis=norm([0,-.008,-1]);body(p,hip,axis,norm([0,-.116,-1]));
      legs(p,sides.map(s=>[s*.266,.10,.68]));feet(p);
      const y=p.shoulder[1]+.596-.428*q,z=p.shoulder[2]+.16*q;
      const width=.435,wr=sides.map(s=>[s*width,y,z]);
      arms(p,wr,sides.map(s=>[s*.62,-.81,.54]));
      p.bar=bar(y,z);p.bench={a:[0,.525,-.77],b:[0,.525,.39],width:.29};
    }else{
      const slope=-.061+.446*q,axis=[0,-Math.sin(slope),-Math.cos(slope)],shoulder=[0,.149,-.55];
      body(p,sub(shoulder,mul(axis,trunk)),axis,norm([0,-.135,-1]));
      p.ankles=sides.map(s=>[s*.15,.111,.495]);
      p.knees=p.hips.map((h,i)=>joint(h,p.ankles[i],thigh,shin,[0,1,.2]));
      feet(p,sides.map(()=>[0,0,1]));
      const wrists=sides.map(s=>[s*.295,.050,.046]);
      arms(p,wrists,sides.map(s=>[s*.70,-.06,.35]));
      palmSupports(p,matY,[[0,0,1],[0,0,1]]);
    }
  }
  function supportedRow(p,q){
    // Keep both the bench-braced knee and the rear foot planted while
    // placing the pelvis high enough for reachable thigh segments.
    const hip=[.062,.948,-.217],axis=sagittal(1.36);
    body(p,hip,axis);
    const benchX=-.183,padY=.454;
    p.knees=[[benchX,padY+.065,-.24],[.235,.50,-.135]];
    p.ankles=[[benchX,padY+.074,-.66],[.274,.101,-.38]];
    feet(p,[norm([0,-.15,-1]),norm([.08,0,1])]);
    p.bench={a:[benchX,padY,-.8],b:[benchX,padY,.66],width:.295};
    const sh=shoulders(p)[1];
    const elbow=add(sh,mul(norm([.055,-Math.cos(1.24*q),-Math.sin(1.24*q)]),upperArm));
    const grip=add(elbow,mul(norm([0,-1,.10+.18*q]),forearm));
    arms(p,[[benchX,padY+.085,.525],grip],[[-.1,0,-1],[.12,.1,-1]]);
    p.elbows[1]=elbow;p.dumbbells=[grip];
    palmSupports(p,padY,[[0,0,1],[0,0,1]],[1,0]);
  }
  function lunge(p,phase){
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
    const half=phase<.5?phase*2:(1-phase)*2;
    const travel=smooth(half/.46),sink=smooth((half-.46)/.54);
    const rear=toeContact(.154,.20-.69*travel,6+37*travel);
    rear.ankle[1]+=.09*Math.sin(Math.PI*travel);
    body(p,[0,.963-.073*travel-.30*sink,-.03-.135*travel-.067*sink],sagittal(.03+.07*sink));
    p.ankles=[[-.154,.099,.04],rear.ankle];
    p.knees=p.hips.map((h,i)=>joint(h,p.ankles[i],thigh,shin,[0,0,1]));
    feet(p,[[0,0,1],rear.direction]);hang(p);
  }
  function standingUpperBody(p,q,id){
    const calfFoot=id==='calf'?toeContact(0,.204,7.5+30*q,.0004):null;
    const heel=calfFoot?calfFoot.ankle[1]-.099:0;
    body(p,[0,.971+heel,-.021],sagittal(.015));
    legs(p,sides.map(s=>[s*.15,.099+heel,-.014]));
    feet(p,sides.map(s=>norm([s*.06,-heel*7.1,1])));
    if(calfFoot){
      const z=calfFoot.ankle[2];body(p,[0,.971+heel,z-.007],sagittal(.015));
      legs(p,sides.map(s=>[s*.15,calfFoot.ankle[1],z]));feet(p,sides.map(()=>calfFoot.direction));hang(p);return;
    }
    const sh=shoulders(p);
    if(id==='overhead'){
      const theta=-.79+2.21*q;
      p.elbows=sh.map((v,i)=>add(v,mul(norm([sides[i]*.78*Math.cos(theta),Math.sin(theta),.60*Math.cos(theta)]),upperArm)));
      p.wrists=p.elbows.map((e,i)=>add(e,mul(norm([-sides[i]*(.07+.12*q),1,-.06]),forearm)));
    }else if(id==='curl'){
      p.elbows=sh.map((v,i)=>add(v,[sides[i]*.041,-.302,.029]));
      p.wrists=p.elbows.map((e,i)=>add(e,mul(norm([sides[i]*.035,-Math.cos(.085+2.31*q),Math.sin(.085+2.31*q)]),forearm)));
    }else{
      const theta=.09+1.45*q;
      p.elbows=sh.map((v,i)=>add(v,mul(norm([sides[i]*Math.sin(theta),-Math.cos(theta),.11*Math.sin(theta)]),upperArm)));
      p.wrists=p.elbows.map((e,i)=>add(e,mul(norm([sides[i]*Math.sin(theta),-Math.cos(theta),.20*Math.sin(theta)]),forearm)));
    }
    p.dumbbells=p.wrists;
  }
  function get(phase,id){
    const q=(1-Math.cos(phase*2*Math.PI))/2,p={type:id};
    if(id==='rdl'||id==='squat')hingeOrSquat(p,q,id==='squat');
    else if(id==='pushup'||id==='plank')floorProne(p,q,id==='plank');
    else if(id==='bridge'||id==='bench')floorSupine(p,q,id==='bench');
    else if(id==='row')supportedRow(p,q);
    else if(id==='lunge')lunge(p,phase);
    else standingUpperBody(p,q,id);
    return p;
  }
  // Allocate transition time by distance traveled. Keeping a small contribution
  // from the authored clock preserves deliberate holds as well as exact endpoints.
  function transitionClock(sample) {
    const count=96,length=[0];
    const points=p=>[p.head,...p.wrists,...p.elbows,...p.knees,...p.ankles];
    let last=points(sample(0));
    for(let i=1;i<=count;i++){
      const here=points(sample(i/count));
      const distance=Math.max(...here.map((v,j)=>Math.hypot(...sub(v,last[j]))*(j===0?1:j<5?.93:.75)));
      length.push(length[i-1]+distance);last=here;
    }
    const total=length[count]||1, clock=length.map((x,i)=>.88*x/total+.12*i/count);
    return t=>{
      if(t<=0||t>=1)return Math.max(0,Math.min(1,t));
      let lo=0,hi=count;
      while(hi-lo>1){const mid=(lo+hi)>>1;if(clock[mid]<t)lo=mid;else hi=mid}
      return (lo+(t-clock[lo])/(clock[hi]-clock[lo]))/count;
    };
  }
  // The handle passes across the four knuckles. Track its signed radial
  // direction (pinky to index) along the chain, including the grounded pickup.
  function gripDumbbells(p,id,ground=.08){
    if(!p.dumbbells)return;
    const pronated=['curl','frontraise','overhead'].includes(id);
    const stationary=pronated?[1,0,0]:[0,0,1];
    p.handRadials=[null,null];
    p.dumbbellAxes=p.dumbbells.map((center,k)=>{
      const i=p.dumbbells.length===1?1:k,sign=sides[i],f=norm(sub(p.wrists[i],p.elbows[i]));
      const signed=pronated?(id==='curl'?sign:-sign):1;
      const resting=mul(stationary,signed);
      let aimed;
      if(id==='hammer')aimed=norm([0,f[2],-f[1]]);
      else aimed=norm(sub(resting,mul(f,dot(resting,f))));
      if(Math.hypot(...aimed)<.9)aimed=resting;
      const height=Math.max(0,Math.min(1,(center[1]-ground)/.18));
      const w=height*height*(3-2*height);
      const axis=norm(mix(resting,aimed,w));
      p.handRadials[i]=axis;
      return axis;
    });
  }
  window.FormPoses={get,stand:standingPose,make:makePose,blend:blendPose,clone:cloneValue,joint,feet,arms,shoulders,palmSupports,toeContact,matY,gripDumbbells,transitionClock};
})();
