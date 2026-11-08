(() => {
  'use strict';
  // Working-rep cues follow each joint as the camera orbits.
  const repCues={
    rdl:[['hip','髋向后送，膝盖保持微屈。'],['hand','杠铃沿腿下放，保持贴近身体。'],['hip','伸髋站直，顶端避免向后挺腰。']],
    squat:[['foot','脚掌三点踩稳，再屈髋屈膝。'],['knee','膝盖朝脚尖方向，避免内扣。'],['hip','髋和肩一起抬起，平稳站直。']],
    pushup:[['shoulder','双手略宽于肩，推起前稳住肩部。'],['elbow','屈肘斜向身后，胸口平稳下放。'],['hip','胸和髋一起离地，避免腰部下沉。']],
    row:[['back','支撑侧压稳凳面，躯干保持平稳。'],['workingElbow','肘部贴近躯干，向髋旁拉。'],['workingHand','控制哑铃下放，避免躯干跟着转。']],
    overhead:[['hand','手腕叠在肘部上方，保持平直。'],['back','推过头顶时收紧腹部，避免仰腰。'],['elbow','控制双肘下降，回到肩旁。']],
    plank:[['elbow','手肘放在肩膀正下方。'],['hip','收紧腹部和臀部，髋部保持水平。'],['head','头颈顺着背部伸展，保持呼吸。']],
    curl:[['elbow','上臂靠近躯干，肘部留在身侧。'],['hand','手腕保持平直，避免折腕。'],['elbow','控制下放，避免向后摆肘借力。']],
    lunge:[['backFoot','一脚向后迈，前后脚保持适当间距。'],['frontKnee','前膝朝向脚尖，前脚掌和脚跟都踩稳。'],['frontFoot','前脚踩地站起，再收回后脚。']],
    lateral:[['elbow','肘部微屈，双臂向两侧略向前抬。'],['shoulder','抬到肩高附近，避免耸肩。'],['hip','躯干保持稳定，控制哑铃下放。']],
    bridge:[['foot','双脚稳稳踩地，再抬起髋部。'],['hip','肩、髋、膝接近一条直线。'],['back','控制骨盆下放，避免腰部反弓。']],
    calf:[['foot','前脚掌踩稳，缓慢抬起脚跟。'],['ankle','脚跟垂直向上，避免脚踝外翻。'],['heel','脚跟缓缓落地，避免弹震。']],
    bench:[['hand','握稳杠铃，手腕与前臂对齐。'],['elbow','屈肘控制下放，前臂大致竖直。'],['shoulder','肩背贴稳凳面，平稳推回上方。']]
  };
  const anatomy={hip:'髋部',foot:'脚掌',knee:'膝盖',hand:'手腕',workingHand:'动作侧手腕',elbow:'肘部',workingElbow:'动作侧手肘',shoulder:'肩部',back:'腰背',head:'头颈',ankle:'脚踝',heel:'脚跟',backFoot:'后脚',frontKnee:'前膝',frontFoot:'前脚',bar:'器械位置',core:'腹部',chest:'胸部',tuckedKnee:'活动侧膝盖',supportHand:'支撑手',supportKnee:'支撑膝',supportFoot:'支撑脚'};
  function point(p,key,i){
    const side=i===1?1:-1,t=p.torso;
    const shift=(v,axis,n)=>v.map((x,k)=>x+axis[k]*n);
    switch(key){
      case 'hip':return p.hips[i];
      case 'supportHand':return p.wrists[0];
      case 'supportFoot':return p.feet[p.feet[0][1]<=p.feet[1][1]?0:1];
      case 'supportKnee':return p.knees[0];
      case 'core':return shift(shift(t.hip,t.axis,.19),t.depth,.095);
      case 'chest':return shift(shift(t.hip,t.axis,.39),t.depth,.13);
      case 'foot':return p.feet[i];
      case 'ankle':return p.ankles[i];
      case 'heel':return shift(p.ankles[i],p.footDirection[i],-.05);
      case 'tuckedKnee':return p.knees[p.knees[0][2]>=p.knees[1][2]?0:1];
      case 'knee':return p.knees[i];
      case 'hand':return p.wrists[i];
      case 'workingHand':return p.wrists[1];
      case 'elbow':return p.elbows[i];
      case 'workingElbow':return p.elbows[1];
      case 'shoulder':return shift(shift(t.shoulder,t.right,side*.21),[0,1,0],p.shoulderLift||0);
      case 'head':return p.head;
      case 'back':return shift(shift(t.hip,t.axis,.2),t.depth,-.105);
      case 'frontFoot':return p.feet[0];
      case 'frontKnee':return p.knees[0];
      case 'backFoot':return p.feet[1];
      case 'bar':return p.bar?shift(p.bar.a,[1,0,0],.24):p.dumbbells?.at(-1)||p.wrists[i];
      default:return t.mid;
    }
  }
  const setupFocus=[
    [/双手握|握稳|握住|握距|松手|哑铃垂|举至肩旁/,'hand'],
    [/托钩|托架|取杠|杠铃落/,'bar'],
    [/肩背|躺到凳面/,'shoulder'],
    [/髋部|坐到|坐稳在/,'hip'],
    [/前臂|肘部/,'elbow'],
    [/膝盖|双膝|一侧膝|跪/,'knee'],
    [/双手|手掌|手臂|手膝|四点支撑/,'hand'],
    [/后退|迈步|站稳|落地|踩稳/,'foot']
  ];
  function cue(sample,id,yaw,showEquipment){
    const visibleSide=Math.sin(yaw*Math.PI/180)>=0?1:0;
    let key='foot',text=sample.cue;
    if(sample.stage==='rep'){
      const part=sample.repPhase<.27?0:sample.repPhase<.69?1:2;
      [key,text]=(repCues[id]||window.EXERCISES.find(ex=>ex.id===id).repCues)[part];
    }else if(sample.stage==='stand'){
      text='双脚约髋宽站稳，重心均匀落在两脚。';
    }else{
      key=setupFocus.find(([rule])=>rule.test(sample.label))?.[1]||setupFocus.find(([rule])=>rule.test(text))?.[1]||'hip';
      if(key==='bar'&&!showEquipment)key='hand';
    }
    let side=visibleSide;
    if(sample.stage==='rep'){
      const q=sample.repPhase;
      if(id==='frontraise'){
        side=q<.5?1:0;key='hand';
        const lifting=q%0.5<.25,which=side?'左':'右';
        text=lifting?which+'臂向前举起，微屈肘，抬到肩高附近。':which+'臂平稳下放，躯干保持稳定。';
      }else if(id==='deadbug')side=key==='foot'||key==='knee'?(q<.5?1:0):(q<.5?0:1);
      else if(id==='climber')side=Math.cos(q*2*Math.PI)>=0?0:1;
    }
    return {title:'留意'+(anatomy[key]||'动作'),cue:text,anchor:point(sample.pose,key,side)};
  }
  window.FormCoaching={cue,point};
})();
