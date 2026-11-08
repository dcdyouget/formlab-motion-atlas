// Floor and bench exercises share the catalog clock, with exercise-specific entries.
(() => {
  'use strict';
  const P=window.FormPoses,A=window.AtlasMotion,sides=[-1,1];
  const add=(a,b)=>a.map((x,i)=>x+b[i]), mul=(a,n)=>a.map(x=>x*n);
  const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
  const unit=a=>mul(a,1/(Math.hypot(...a)||1));
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  const wave=x=>(1-Math.cos(2*Math.PI*x))*.5;
  const upBack=a=>[0,Math.sin(a),-Math.cos(a)];
  const forward=a=>[0,Math.sin(a),Math.cos(a)];
  const clone=P.clone, mat=P.matY, forwardHands=[[0,0,1],[0,0,1]];
  const bench=P.get(0,'bench').bench;
  function onMat(p,id){p.type=id;p.mat=true;return p}
  function freeHands(p){return P.palmSupports(p,mat,forwardHands,[0,0])}
  function sequence(frames,t){
    let end=1;while(end<frames.length-1 && t>frames[end][0])end++;
    const [a,start]=frames[end-1],[b,finish]=frames[end];
    const u=Math.max(0,Math.min(1,(t-a)/(b-a))), selected=frames[u<.5?end-1:end];
    return {pose:P.blend(start,finish,smooth(u)),label:selected[2],cue:selected[3]};
  }

  function bridgeLeg(q) {
    const p=onMat(P.get(q,'bridge'),'singlebridge'), hip=p.hips[1];
    p.knees[1]=add(hip,[0,.390,-.2245]);
    p.ankles[1]=add(p.knees[1],[0,-.153,.4018]);
    P.feet(p,[[0,0,1],[0,.34,.9404]]);
    return p;
  }

  function bug(q) {
    const p=onMat(P.get(0,'bridge'),'deadbug');
    const sweep=[q<=.5?wave(2*q):0,q>.5?wave(2*q-1):0];
    for(const [i,t] of sweep.entries()){
      const sh=P.shoulders(p)[i],a=.018+1.46*t;
      const direction=k=>[0,Math.cos(k),-Math.sin(k)];
      p.elbows[i]=add(sh,mul(direction(a),.31));
      p.wrists[i]=add(p.elbows[i],mul(direction(a+.07),.33));
      const leg=1-i,hi=p.hips[leg];
      p.knees[leg]=add(hi,mul(forward(Math.PI/2-1.395*t),.45));
      p.ankles[leg]=add(p.knees[leg],mul(forward(-.098*t),.43));
    }
    P.feet(p,sweep.slice().reverse().map(t=>forward(.38+.13*t)));
    return freeHands(p);
  }

  function crunch(q){
    const p=onMat(P.get(0,'bridge'),'crunch'), amount=wave(q),hip=p.torso.hip;
    const lower=add(hip,[0,-.018,-.192]);
    const upper=add(lower,mul(upBack(.012+.38*amount),.243));
    const reference=add(add(lower,mul(upBack(.012),.243)),mul(upBack(.395),.135));
    const shoulder=add(add(upper,mul(upBack(.395+.30*amount),.135)),p.shoulder.map((v,i)=>v-reference[i]));
    p.spineCurl=.60*amount;p.spinePoints={lower,upper};
    p.shoulder=shoulder;p.torso.shoulder=shoulder;p.torso.mid=mix(lower,upper,.55);
    p.headAxis=upBack(-.135+.56*amount);p.head=add(shoulder,mul(p.headAxis,.225));
    // Open hands reach toward the knees while the lower spine stays planted.
    for(const [i,s] of sides.entries()){
      const sh=P.shoulders(p)[i];
      p.elbows[i]=add(sh,mul(unit([s*.065,.035+.22*amount,1]),.31));
      p.wrists[i]=add(p.elbows[i],mul(unit([-s*.11,.11+.21*amount,1]),.33));
    }
    return freeHands(p);
  }

  function benchGrip(p,w=1){
    p.type='benchleg';p.bench=bench;
    P.palmSupports(p,bench.a[1],sides.map(s=>[s*.94,0,.34]),[w,w]);
    p.handSupports.forEach((h,i)=>h.edge=sides[i]*bench.width/2);
    return p;
  }
  const benchWrists=sides.map(s=>[s*.120,.567,.095]);
  function benchBody(hip,axis,ankles){
    return benchGrip(P.make({type:'benchleg',hip,axis,ankles,wrists:benchWrists,
      armPoles:sides.map(s=>[s,.04,.05]),legPoles:sides.map(()=>[0,1,.3]),
      footDirections:forwardHands}));
  }
  function benchRaise(q){
    const start=P.get(0,'bench'),lift=wave(q),hipY=.631-.017*lift;
    const axisY=(start.shoulder[1]-hipY)/.56,axis=[0,axisY,-Math.sqrt(1-axisY*axisY)];
    const hip=add(start.shoulder,mul(axis,-.56)),p=benchBody(hip,axis,start.ankles);
    p.headAxis=clone(start.headAxis);p.head=add(p.shoulder,mul(p.headAxis,.225));
    const angle=.035+1.47*lift;
    for(let i=0;i<2;i++){
      p.knees[i]=add(p.hips[i],mul(forward(angle),.45));
      p.ankles[i]=add(p.knees[i],mul(forward(angle-.13),.43));
    }
    P.feet(p,sides.map(()=>forward(angle+.54)));return p;
  }
  const benchStand=benchGrip(clone(A.sample(0,'bench').pose),0);
  delete benchStand.bar;delete benchStand.rack;
  const benchFeet=sides.map(s=>[s*.195,.100,.65]);
  const benchSit=benchBody([0,.616,.24],[0,.995,-.100],benchFeet);
  const benchLean=benchBody([0,.637,.225],[0,.55,-.835],benchFeet);
  const benchSource=P.get(0,'bench'),benchDown=benchBody(benchSource.torso.hip,benchSource.torso.axis,benchFeet);
  benchDown.headAxis=clone(benchSource.headAxis);benchDown.head=clone(benchSource.head);
  const benchFrames=[
    [0,benchStand,'面向凳尾站稳','训练凳放稳，双脚位于凳尾两侧。'],
    [.24,benchSit,'坐稳，双手扶凳边','先坐在凳尾，再将双手放到身体两侧的凳边。'],
    [.48,benchLean,'扶凳缓缓后躺','屈肘控制后躺，骨盆保持在凳面。'],
    [.70,benchDown,'肩背和后脑落凳','先放稳上背，双脚仍支撑地面。'],
    [1,benchRaise(0),'双腿伸向凳尾','双手扶稳凳侧，将双腿伸出，膝盖保持轻微弯曲。']
  ];

  function prone(q){
    const lift=wave(q), hip=[0,.164-.0193*lift,-.1],axis=forward(.006+.142*lift);
    const p=P.make({type:'superman',hip,axis,ankles:[[0,0,0],[0,0,0]],footDirections:[[0,0,-1],[0,0,-1]]});
    for(const [i,s] of sides.entries()){
      const sh=P.shoulders(p)[i];
      p.elbows[i]=add(sh,mul(unit([s*.106,-.165+.34*lift,1]),.31));
      p.wrists[i]=add(p.elbows[i],mul(unit([-s*.09,-.185+.36*lift,1]),.33));
      p.knees[i]=add(p.hips[i],mul(upBack(.018+.14*lift),.45));
      p.ankles[i]=add(p.knees[i],mul(upBack(-.185+.285*lift),.43));
    }
    P.feet(p,sides.map(()=>[0,-.12,-.993]));
    P.palmSupports(p,mat,forwardHands,sides.map(()=>1-smooth(lift/.28)));
    return onMat(p,'superman');
  }
  const proneLow=prone(0),pronePrep=clone(proneLow);
  P.arms(pronePrep,sides.map(s=>[s*.34,.054,.41]),sides.map(s=>[s,.25,-.55]));
  const onHands=onMat(clone(A.sample(.1+.3*.46,'pushup').pose),'superman');
  const proneHalf=onMat(P.make({
    type:'superman',hip:[0,.355,-.052],axis:forward(.09),ankles:sides.map(s=>[s*.15,.133,-.77]),
    wrists:pronePrep.wrists,armPoles:sides.map(s=>[s,.12,-.8]),
    legPoles:sides.map(s=>[s*.10,-1,.45]),footDirections:sides.map(()=>[0,0,-1])
  }),'superman');
  P.palmSupports(proneHalf,mat,forwardHands);
  function proneEntry(t){
    if(t<.34){
      const source=A.sample(.10+.30*.46*t/.34,'pushup');
      return {...source,pose:onMat(source.pose,'superman')};
    }
    if(t<.79)return sequence([
      [.34,onHands,'双掌双膝支撑','掌根撑垫，双膝着垫。'],
      [.55,proneHalf,'向后伸腿，屈肘下放','先让双手承重，逐渐降低骨盆和胸口。'],
      [.79,pronePrep,'腹部与大腿落垫','胸腹得到垫面支撑后，再将双手向前移动。']
    ],t);
    const u=smooth((t-.79)/.21), p=clone(pronePrep);
    for(const [i,s] of sides.entries()){
      // Sweep the upper arms out and forward on the mat. A fixed outward
      // elbow plane stays defined even as the hands pass the shoulders.
      const sh=P.shoulders(p)[i], a=pronePrep.elbows[i],b=proneLow.elbows[i];
      const start=Math.atan2(s*(a[0]-sh[0]),a[2]-sh[2]),end=Math.atan2(s*(b[0]-sh[0]),b[2]-sh[2]);
      const theta=start+(end-start)*u, dy=a[1]+(b[1]-a[1])*u-sh[1],radius=Math.sqrt(.31*.31-dy*dy);
      p.elbows[i]=add(sh,[s*radius*Math.sin(theta),dy,radius*Math.cos(theta)]);
      const e=p.elbows[i],da=pronePrep.wrists[i].map((v,j)=>v-a[j]),db=proneLow.wrists[i].map((v,j)=>v-b[j]);
      const from=Math.atan2(s*da[0],da[2]),to=Math.atan2(s*db[0],db[2]),phi=from+(to-from)*u;
      const dy2=da[1]+(db[1]-da[1])*u,r=Math.sqrt(.33*.33-dy2*dy2);
      p.wrists[i]=add(e,[s*r*Math.sin(phi),dy2,r*Math.cos(phi)]);
    }
    return {pose:p,label:'双臂沿垫面向前伸',cue:'骨盆和胸腹贴垫，双臂缓缓伸向头前方。'};
  }

  const reps={singlebridge:bridgeLeg,deadbug:bug,crunch,superman:prone,benchleg:benchRaise};
  const words={
    singlebridge:['收起一侧腿，支撑脚踩垫','支撑脚发力，缓慢抬髋','骨盆保持水平，控制下放'],
    deadbug:['双手朝上，髋膝弯曲','保持手臂长，伸展对侧手脚','换边伸展，再收回到起点'],
    crunch:['仰卧屈膝，双手朝向大腿','呼气轻卷上背，双手朝膝盖伸','腰背保持贴垫，放回肩胛'],
    superman:['俯卧伸展双臂','轻抬胸口、双臂与双腿','控制双臂双腿回落，骨盆贴垫'],
    benchleg:['双手扶凳，伸展双腿','控制抬腿，双手扶稳凳边','收紧腹部，缓慢下放双腿']
  };
  function entry(id,t){
    if(id==='benchleg')return sequence(benchFrames,t);
    if(id==='superman')return proneEntry(t);
    if(t<.80){
      const s=A.sample(.10+.30*t/.80,'bridge');s.pose.type=id;return s;
    }
    const pose=P.blend(A.sample(.4,'bridge').pose,reps[id](0),smooth((t-.80)/.20));
    pose.type=id;
    return {pose,label:words[id][0],cue:words[id][0]+'。'};
  }
  const clocks={};
  function sample(id,phase){
    const f=phase-Math.floor(phase), w=words[id],stage=f<.1?'stand':f<.4?'setup':f<.78?'rep':'reset';
    const q=stage==='rep'?(f-.4)/.38:0;
    const clock=clocks[id]||=P.transitionClock(t=>entry(id,t).pose);
    let step;
    if(stage==='rep')step={pose:reps[id](q),label:w[q<.5?1:2],cue:w[q<.5?1:2]+'。'};
    else if(stage==='reset'){
      const t=(f-.78)/.22;
      const entryTime=clock(1-t);
      step=entry(id,entryTime);
      const labels=id==='benchleg'?['屈膝落脚，肩背仍贴凳','双手扶凳，慢慢坐起','在凳尾坐稳','双脚踩稳后起身']:
        id==='superman'?['双臂收至胸旁','双掌撑起，收回双膝','臀部后移，双脚踩稳','平稳站起']:
        ['收回手脚，仰卧屈膝','双手在身后支撑坐起','双脚踩稳，重心向脚掌移','伸髋伸膝站稳'];
      const back=1-entryTime,label=labels[back<.25?0:back<.56?1:back<.80?2:3];
      step.label=label;step.cue=label+'。';
    }else step=entry(id,stage==='stand'?0:clock((f-.1)/.30));
    const p=step.pose;p.type=id;
    return {...step,stage,repPhase:q,anchor:p.torso.hip,equipmentVisible:true};
  }
  Object.assign(window.FormExtraMoves||={},Object.fromEntries(Object.keys(reps).map(id=>[id,f=>sample(id,f)])));
})();
