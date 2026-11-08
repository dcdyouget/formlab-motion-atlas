(() => {
  'use strict';
  const P=window.FormPoses, sides=[-1,1], add=(a,b)=>a.map((x,i)=>x+b[i]);
  const scale=(a,s)=>a.map(x=>x*s);
  const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x)};
  const poseMix=(a,b,t)=>P.blend(a,b,smooth(t));
  const wave=q=>(1-Math.cos(2*Math.PI*q))*.5;
  const angle=a=>[0,Math.sin(a),Math.cos(a)];
  const repeat=f=>f-Math.floor(f);
  function timed(f){
    if(f<.10)return ['stand',0];
    if(f<.40)return ['setup',(f-.1)/.30];
    if(f<.78)return ['rep',(f-.4)/.38];
    return ['reset',(f-.78)/.22];
  }
  function result(pose,stage,repPhase,label,cue,anchor){
    return {pose,stage,repPhase,label,cue,anchor,equipmentVisible:Boolean(pose.mat||pose.bench)};
  }
  function bodySquat(q){
    const base=P.get(q,'squat'),t=base.torso;
    return P.make({type:'airsquat',hip:t.hip,axis:t.axis,ankles:base.ankles,knees:base.knees,
      footDirections:base.footDirection,wrists:sides.map(s=>add(t.shoulder,[s*.166,-.13,.28])),
      armPoles:sides.map(s=>[s*.4,-1,.1])});
  }
  const stand=P.stand(),squatStart=bodySquat(0);
  function squat(f){
    const [stage,q]=timed(repeat(f));
    const p=stage==='rep'?bodySquat(q):stage==='setup'?poseMix(stand,squatStart,q):stage==='reset'?poseMix(squatStart,stand,q):stand;
    const label=stage==='stand'?'自然站立':stage==='setup'?'双脚站开，双手置于胸前':stage==='reset'?'双臂放松，站稳':q<.5?'屈髋屈膝下蹲':'脚掌踩稳，向上站起';
    return result(p,stage,stage==='rep'?q:0,label,'双脚踩稳，保持膝盖与脚尖方向一致。',p.knees[1]);
  }
  // The bench lies across the athlete so both palms fit on its padded surface.
  const bench={a:[-.64,.52,.40],b:[.64,.52,.40],width:.34};
  const palms=sides.map(s=>[s*.29,.563,.315]);
  const toePlants=sides.map(s=>P.toeContact(s*.128,-.562,35));
  const rearFeet=toePlants.map(f=>f.ankle),nearFeet=sides.map(s=>[s*.17,.10,-.13]);
  const toes=toePlants.map(f=>f.direction);
  function support(hip,axis,ankles,footDirections){
    const p=P.make({type:'inclinepush',hip,axis,ankles,footDirections,wrists:palms,
      armPoles:sides.map(s=>[s*.53,0,-1]),props:{bench}});
    return P.palmSupports(p,bench.a[1],[[0,0,1],[0,0,1]]);
  }
  function inclineRep(q){
    const axis=angle(.760-.349*wave(q));
    return support(add([0,rearFeet[0][1],rearFeet[0][2]],scale(axis,.875)),axis,rearFeet,toes);
  }
  const inclineStand=P.clone(stand);inclineStand.bench=bench;P.palmSupports(inclineStand,bench.a[1],[[0,0,1],[0,0,1]],[0,0]);
  const planted=support([0,.775,-.33],angle(.70),nearFeet,sides.map(s=>[s*.03,0,1]));
  const base=inclineRep(0);
  const middle=support([0,.762,-.33],angle(.77),[rearFeet[0],nearFeet[1]],[toes[0],[.02,0,1]]);
  function inclineSetup(q){
    if(q<.44)return poseMix(inclineStand,planted,q/.44);
    const first=q<.72, u=first?(q-.44)/.28:(q-.72)/.28;
    const p=first?poseMix(planted,middle,u):poseMix(middle,base,u),i=first?0:1;
    p.ankles[i][1]+=.105*Math.sin(Math.PI*smooth(u));
    p.knees[i]=P.joint(p.hips[i],p.ankles[i],.45,.43,[0,0,1]);
    P.feet(p,p.footDirection);
    return p;
  }
  function incline(f){
    const [stage,q]=timed(repeat(f));
    const p=stage==='rep'?inclineRep(q):stage==='setup'?inclineSetup(q):stage==='reset'?inclineSetup(1-q):inclineStand;
    const label=stage==='stand'?'面向凳面站立':stage==='setup'?(q<.44?'屈髋，双手撑住凳面':'依次向后迈步'):stage==='reset'?'双脚依次走近凳面，再站起':q<.5?'屈肘，让胸口靠近凳面':'推开凳面，回到起始位';
    return result(p,stage,stage==='rep'?q:0,label,'双手撑住凳面，保持肩、髋和脚跟成线。',p.wrists[1]);
  }
  // The rear foot stays planted while the other knee travels under the torso.
  // The shin follows the ankle in an arc, keeping both leg segments constant.
  const plank=P.get(0,'pushup');plank.mat=true;
  function climbLegs(left,right){
    const p=P.clone(plank);p.type='climber';
    for(const [i,t] of [left,right].entries()){
      if(t<=0)continue;
      const h=p.hips[i],k=plank.knees[i],an=plank.ankles[i],s=sides[i];
      const a0=Math.atan2(k[2]-h[2],h[1]-k[1]),a=a0+(1.01-a0)*t;
      const dx=(k[0]-h[0])*(1-t)+s*(.13*Math.sin(Math.PI*t)+.035*t);
      const length=Math.sqrt(.45*.45-dx*dx);
      p.knees[i]=[h[0]+dx,h[1]-length*Math.cos(a),h[2]+length*Math.sin(a)];
      const y=an[1]*(1-t)+.21*t+.07*Math.sin(Math.PI*t);
      const x=an[0]+s*.065*Math.sin(Math.PI*t);
      const dz=Math.sqrt(Math.max(.001,.43*.43-(y-p.knees[i][1])**2-(x-p.knees[i][0])**2));
      p.ankles[i]=[x,y,p.knees[i][2]-dz];
      p.feet[i]=add(add(p.ankles[i],scale(p.footDirection[i],.052)),[0,-.04,0]);
    }
    return p;
  }
  function climber(f){
    f=repeat(f);const [stage,q]=timed(f);
    let p,label;
    if(stage==='rep'){
      const side=Math.cos(q*2*Math.PI);p=climbLegs(Math.max(side,0),Math.max(-side,0));label='双手撑稳，交替收膝';
    }else if(stage==='setup'&&q>.77){p=climbLegs(smooth((q-.77)/.23),0);label='一膝收至髋下'}
    else if(stage==='reset'&&q<.23){p=climbLegs(1-smooth(q/.23),0);label='后撤收腿，回到平板支撑'}
    else{
      const original=stage==='setup'?.1+.3*q/.77:stage==='reset'?.78+.22*(q-.23)/.77:f;
      const source=window.AtlasMotion.sample(original,'pushup');p=source.pose;label=source.label;
    }
    return result(p,stage,stage==='rep'?q:0,label,'双手持续撑地，膝盖交替向腹部靠近。',p.knees[q>.25&&q<.75?1:0]);
  }
  Object.assign(window.FormExtraMoves ||= {},{airsquat:squat,inclinepush:incline,climber});
})();
