(() => {
  'use strict';

  const P = window.FormPoses;
  const A = window.AtlasMotion;
  if (!P || !A) return;

  const BOUNDARIES = [0, .10, .40, .78, 1];
  const IDS = ['hammer', 'frontraise', 'shrug', 'dbrow', 'floorpress', 'dbfly', 'goblet', 'dbsquat'];
  const DB_AXIS = [0, 0, 1];
  const DB_FLOOR = [[-.285, .08, .52], [.285, .08, .52]];
  const clone = value => P.clone(value);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const mul = (a, n) => a.map(v => v * n);
  const mid = (a, b) => mul(add(a, b), .5);
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = t => t * t * (3 - 2 * t);
  const repCurve = t => (1 - Math.cos(2 * Math.PI * clamp(t))) / 2;

  // Both bells rest outside the mat, beside the bent elbows.
  const FLOORPRESS_FLOOR = floorPressPose(.5).elbows.map((elbow,i)=>{
    const dy=.08-elbow[1];
    return add(elbow,[(i?1:-1)*Math.sqrt(.33*.33-dy*dy),dy,0]);
  });

  function axesFor(points) {
    return points.map(() => DB_AXIS.slice());
  }

  function gear(pose, points, axes = axesFor(points)) {
    const out = clone(pose);
    out.dumbbells = clone(points);
    delete out.handSupports;
    out.dumbbellAxes = clone(axes);
    return out;
  }

  function kettlebell(pose, center, handles) {
    const out = clone(pose);
    delete out.handSupports;
    out.kettlebell = { center: clone(center), handles: clone(handles) };
    return out;
  }

  function setMat(pose) {
    const out = clone(pose);
    out.mat = true;
    return out;
  }

  function setBench(pose, bench = P.get(0, 'bench').bench) {
    const out = clone(pose);
    out.bench = clone(bench);
    return out;
  }

  function stripBar(pose) {
    const out = clone(pose);
    delete out.bar;
    delete out.rack;
    return out;
  }

  function oldPose(phase, id) {
    return clone(A.sample(phase, id).pose);
  }

  // Rebuild just the arm chain while keeping the source pose's feet, body,
  // mat, and bench contacts. FormPoses.make applies the shared limb IK.
  function handsFrom(source, wrists, extra = {}) {
    const options = {
      type: source.type || 'weighted',
      hip: source.torso.hip,
      axis: source.torso.axis,
      headAxis: source.headAxis,
      ankles: source.ankles,
      knees: source.knees,
      wrists,
      armPoles: wrists.map((_, i) => [i ? .45 : -.45, 0, 1]),
      footDirections: source.footDirection
    };
    const out = P.make(options);
    if (source.mat) out.mat = true;
    if (source.bench) out.bench = clone(source.bench);
    Object.assign(out, clone(extra));
    return out;
  }

  function setType(pose, id) {
    const out = clone(pose);
    out.type = id;
    return out;
  }

  function shiftPose(pose, offset) {
    const out = clone(pose);
    if (out.torso) {
      for (const key of ['hip', 'shoulder', 'mid']) if (out.torso[key]) out.torso[key] = add(out.torso[key], offset);
    }
    for (const key of ['shoulder', 'head', 'hips', 'ankles', 'knees', 'elbows', 'wrists', 'feet', 'dumbbells']) {
      if (out[key]) out[key] = Array.isArray(out[key][0]) ? out[key].map(point => add(point, offset)) : add(out[key], offset);
    }
    if (out.dumbbells) out.dumbbellAxes = out.dumbbells.map(() => DB_AXIS.slice());
    return out;
  }

  function framesPose(frames, t) {
    const value = clamp(t);
    if (value <= frames[0].at) return frames[0];
    for (let i = 1; i < frames.length; i++) {
      const end = frames[i];
      if (value <= end.at) {
        const start = frames[i - 1];
        const u = ease((value - start.at) / (end.at - start.at || 1));
        return {
          pose: P.blend(start.pose, end.pose, u),
          label: u < .55 ? start.label : end.label,
          cue: u < .55 ? start.cue : end.cue
        };
      }
    }
    return frames[frames.length - 1];
  }

  function standWithFloorWeights(id, positions = DB_FLOOR) {
    return gear(setType(P.stand(), id), positions);
  }

  function pickTwoDumbbells(id) {
    const source=oldPose(.202,'curl'), wr=clone(DB_FLOOR);
    return gear(setType(handsFrom(source,wr),id),wr);
  }

  function sideCarry(id, source = P.stand()) {
    const wrists = source.shoulder
      ? [[-.285, source.shoulder[1] - .62, source.shoulder[2] + .05], [.285, source.shoulder[1] - .62, source.shoulder[2] + .05]]
      : [[-.285, .91, .03], [.285, .91, .03]];
    return gear(handsFrom(source, wrists), wrists);
  }

  function standingFrames(id, start, pick, carry, stand, options = {}) {
    const released = options.released || gear(pick, DB_FLOOR);
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: options.standCue || '器械先放在脚前地面，站稳后再开始。' },
      { at: .34, pose: pick, label: '屈髋屈膝取起器械', cue: '双脚踩稳，屈髋屈膝拿起器械，再站直。' },
      { at: .70, pose: carry, label: '站起并握稳器械', cue: '站直后让手腕保持中立，器械贴近身体。' },
      { at: 1, pose: start, label: options.startLabel || '调整到预备姿势', cue: options.startCue || '双脚踩稳，躯干收紧，准备开始。' }
    ];
    const reset = [
      { at: 0, pose: start, label: '回到预备姿势', cue: '先控制器械回到动作起点。' },
      { at: .30, pose: carry, label: '站稳并准备放下', cue: '保持躯干稳定，屈髋屈膝靠近地面。' },
      { at: .62, pose: pick, label: '双脚踩稳，轻放器械', cue: '器械触地后再松手。' },
      { at: .74, pose: released, label: '确认器械落地', cue: '确认器械稳定在地面，再站起。' },
      { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
    ];
    return { setup, reset };
  }

  function uprightHands(id, wrists, base = P.stand(), extras = {}) {
    const pose = handsFrom(base, wrists, extras);
    return gear(setType(pose, id), wrists);
  }

  function hammerStart() {
    const p = P.get(0, 'curl');
    return gear(setType(p, 'hammer'), p.wrists);
  }

  function frontStart() {
    return frontRep(0);
  }

  function frontRep(t) {
    // The dumbbells travel in arcs, with only a slight bend at the elbows.
    const u=clamp(t);
    const lifts=[u>.5?repCurve((u-.5)*2):0,u<=.5?repCurve(u*2):0];
    const pose=P.stand();
    pose.type='frontraise';
    for(const [i,lift] of lifts.entries()){
      const side=i?1:-1,angle=.08+1.43*lift;
      const shoulder=add(pose.shoulder,[side*.246,0,0]);
      pose.elbows[i]=add(shoulder,[-side*.008,-.31*Math.cos(angle),.31*Math.sin(angle)]);
      pose.wrists[i]=add(pose.elbows[i],[-side*.019,-.329*Math.cos(angle+.08),.329*Math.sin(angle+.08)]);
    }
    return gear(pose,pose.wrists,[[1,0,0],[1,0,0]]);
  }

  function shrugStart() {
    const base = P.stand();
    const wrists = [[-.285, .91, .03], [.285, .91, .03]];
    return uprightHands('shrug', wrists, base);
  }

  function shrugRep(t) {
    const lift = .076 * repCurve(t);
    const pose = clone(shrugStart());
    pose.shoulderLift=lift;
    pose.elbows = pose.elbows.map(point => [point[0], point[1] + lift, point[2]]);
    pose.wrists = pose.wrists.map(point => [point[0], point[1] + lift, point[2]]);
    pose.dumbbells = clone(pose.wrists);
    pose.dumbbellAxes = axesFor(pose.dumbbells);
    return pose;
  }

  function rowPose(t) {
    const q = repCurve(t);
    const hip=[0,.91,0],axis=[0,Math.cos(1.05),Math.sin(1.05)];
    const pose=P.make({type:'dbrow',hip,axis,ankles:[[-.20,.10,.02],[.20,.10,.02]]});
    const theta=.075+1.16*q;
    pose.elbows=P.shoulders(pose).map((sh,i)=>add(sh,[(i?1:-1)*.030,-.3085*Math.cos(theta),-.3085*Math.sin(theta)]));
    const wrists=pose.elbows.map((elbow,i)=>add(elbow,[(i?1:-1)*.024,-.328,.024]));
    pose.wrists=wrists;
    pose.dumbbells = clone(wrists);
    pose.dumbbellAxes = axesFor(wrists);
    return pose;
  }

  function rowStart() { return rowPose(0); }

  function squatBase(t) {
    const phase = clamp(t);
    return P.get(phase, 'squat');
  }

  function dbSquatPose(t) {
    const base = squatBase(t);
    const wrists = base.shoulder && base.torso
      ? [[-.30, base.shoulder[1] - .62, base.shoulder[2] + .04], [.30, base.shoulder[1] - .62, base.shoulder[2] + .04]]
      : [[-.30, .91, .03], [.30, .91, .03]];
    const pose = handsFrom(base, wrists);
    pose.type = 'dbsquat';
    pose.dumbbells = clone(wrists);
    pose.dumbbellAxes = axesFor(wrists);
    return pose;
  }

  function gobletPose(t) {
    const base = squatBase(t);
    const grip = add(add(base.shoulder,mul(base.torso.axis,-.075)),mul(base.torso.depth,.19));
    const wrists = [-1,1].map(side=>add(grip,[side*.095,0,0]));
    const pose = P.make({type:'goblet',hip:base.torso.hip,axis:base.torso.axis,headAxis:base.headAxis,
      ankles:base.ankles,knees:base.knees,wrists,armPoles:[[-.25,-1,-.15],[.25,-1,-.15]],footDirections:base.footDirection});
    pose.kettlebell = { center:add(grip,[0,-.11,0]), handles:clone(wrists) };
    return pose;
  }

  function gobletPick() {
    const base = oldPose(.202, 'curl');
    const wrists = [[-.095, .209, .52], [.095, .209, .52]];
    const pose = handsFrom(base, wrists);
    return kettlebell(setType(pose, 'goblet'), [0, .099, .52], clone(wrists));
  }

  function floorPressPose(t) {
    const q = repCurve(t);
    const base = P.get(0, 'bridge');
    const unit=v=>mul(v,1/Math.hypot(...v));
    const toward=(a,b)=>unit(a.map((v,i)=>v+(b[i]-v)*q));
    base.elbows=[];base.wrists=[];
    for(const side of [-1,1]){
      const shoulder=add(base.shoulder,[side*.246,0,0]);
      const upper=toward([-side*.07,.986,.10],[side*.79,-.25,.56]);
      const lower=toward([-side*.1,.99,0],[0,1,0]);
      const elbow=add(shoulder,mul(upper,.31));
      base.elbows.push(elbow);base.wrists.push(add(elbow,mul(lower,.33)));
    }
    base.type='floorpress';base.mat=true;
    return gear(base,base.wrists);
  }

  function placeFloorBells(amount) {
    const p=floorPressPose(.5);
    p.wrists=p.elbows.map((elbow,i)=>{
      const start=Math.asin((.08-elbow[1])/.33);
      const angle=start+(Math.PI/2-start)*amount;
      return add(elbow,[(i?1:-1)*.33*Math.cos(angle),.33*Math.sin(angle),0]);
    });
    return gear(p,p.wrists);
  }

  function benchFlyPose(t) {
    const base=stripBar(P.get(0,'bench')),theta=-.09+1.58*repCurve(t);
    base.elbows=[];base.wrists=[];
    for(const side of [-1,1]){
      const shoulder=add(base.shoulder,[side*.246,0,0]);
      const arm=angle=>[side*Math.sin(angle),Math.cos(angle),0];
      const elbow=add(shoulder,mul(arm(theta),.31));
      base.elbows.push(elbow);base.wrists.push(add(elbow,mul(arm(theta-.30),.33)));
    }
    base.type='dbfly';
    return gear(base,base.wrists);
  }

  function buildStandingDB(id, start, rep, options = {}) {
    const stand = standWithFloorWeights(id, options.floor || DB_FLOOR);
    const pick = pickTwoDumbbells(id);
    const released = gear(pick, options.floor || DB_FLOOR);
    const carry = options.carry || sideCarry(id);
    const frames = standingFrames(id, start, pick, carry, stand, { ...options, released });
    const repFn = t => setType(rep(t), id);
    return { stand, setup: frames.setup, reset: frames.reset, rep: repFn };
  }

  function floorPressFrames() {
    const grounded=(phase,label,cue,at)=>{
      const source=oldPose(phase,'bridge'),pose=gear(source,FLOORPRESS_FLOOR);
      pose.handSupports=clone(source.handSupports);
      return {at,label,cue,pose};
    };
    const stand=grounded(0,'自然站立','哑铃静置在垫面两侧，先准备躺下。',0);
    const flat=grounded(.4,'肩背落垫','肩背和后脑得到支撑后，再伸手拿铃。',.60);
    const grip=placeFloorBells(0);
    const bottom=floorPressPose(.5), top=floorPressPose(0);
    const setup=[
      stand,
      grounded(.18,'屈膝向后坐','双脚踩稳，先坐到哑铃之间。',.16),
      grounded(.266,'坐稳，双手支撑','双手在身后撑垫，哑铃仍静置在身体两侧。',.32),
      grounded(.331,'控制肩背后躺','逐步把上背放在垫上。',.47),
      flat,
      {at:.73,pose:grip,label:'双手握稳垫旁的哑铃',cue:'双肘屈曲，手掌握稳把手后再移动哑铃。'},
      {at:.84,pose:bottom,label:'稳住上臂，调整手腕位置',cue:'手腕位于肘部上方，双脚踩稳。'},
      {at:1,pose:top,label:'将哑铃推至胸口上方',cue:'在胸口上方稳定双臂。'}
    ];
    const reset=[
      {at:0,pose:top,label:'控制下放哑铃',cue:'双肘先回到垫面附近。'},
      {at:.14,pose:bottom,label:'上臂轻触垫面',cue:'保持握紧，把哑铃平稳放回两侧。'},
      {at:.27,pose:grip,label:'哑铃落地并握稳',cue:'确认铃片承重后再张开手指。'},
      {...flat,at:.40,label:'松手，手掌回垫',cue:'哑铃在身侧静置，准备用手支撑起身。'},
      grounded(.331,'用手支撑上身','用手臂辅助坐起，保持双脚踩稳。',.54),
      grounded(.266,'在垫上坐稳','双脚继续承重。',.69),
      grounded(.18,'屈膝转为低蹲','重心移到双脚，平稳起身。',.84),
      {...stand,at:1}
    ];
    return {setup,reset,stand:stand.pose,rep:floorPressPose};
  }

  function benchFlyFrames() {
    const bench = P.get(0, 'bench').bench;
    const standRaw = stripBar(oldPose(0, 'bench'));
    const floorWeights = [[-.28, .08, 1.27], [.28, .08, 1.27]];
    const stand = gear(setBench(setType(standRaw, 'dbfly'), bench), floorWeights);
    const pick = gear(setBench(setType(handsFrom(shiftPose(oldPose(.202,'curl'),[0,0,.75]),floorWeights),'dbfly'),bench),floorWeights);
    const carrySource = oldPose(0, 'bench');
    const carryW = [[-.285, .91, .80], [.285, .91, .80]];
    const carry = gear(setBench(handsFrom(carrySource, carryW), bench), carryW);
    const sitRaw = oldPose(.166, 'bench');
    const sitW = [[-.25, .74, .37], [.25, .74, .37]];
    const sit = gear(setBench(handsFrom(sitRaw, sitW), bench), sitW);
    const reclineRaw = oldPose(.28, 'bench');
    const reclineW = [[-.20, .78, -.29], [.20, .78, -.29]];
    const recline = gear(setBench(handsFrom(reclineRaw, reclineW), bench), reclineW);
    const readyW = [[-.22, 1.02, -.34], [.22, 1.02, -.34]];
    const ready = gear(setBench(handsFrom(reclineRaw, readyW), bench), readyW);
    const top = benchFlyPose(0);
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: '训练凳固定在身后，哑铃放在脚前。' },
      { at: .30, pose: pick, label: '屈髋屈膝取起哑铃', cue: '双脚踩稳，拿起哑铃后站直。' },
      { at: .50, pose: carry, label: '站稳并握好哑铃', cue: '手腕保持中立，慢慢坐到训练凳上。' },
      { at: .68, pose: sit, label: '坐稳，哑铃靠近大腿', cue: '坐在凳面中部，双脚踩稳。' },
      { at: .82, pose: recline, label: '收铃靠胸，控制后躺', cue: '双手持铃靠近胸前，缓慢将上背落在凳上。' },
      { at: .92, pose: ready, label: '将哑铃举至胸口上方', cue: '肘部微屈，掌心相对。' },
      { at: 1, pose: top, label: '手臂稳定在胸口上方', cue: '保留肘部微屈，不要锁死手肘。' }
    ];
    const thighW = [[-.275, .80, -.12], [.275, .80, -.12]];
    const thighs = gear(setBench(handsFrom(reclineRaw, thighW), bench), thighW);
    const sitDown = gear(setBench(handsFrom(sitRaw, sitW), bench), sitW);
    const pickRelease=pick;
    const reset = [
      { at: 0, pose: top, label: '回到动作起点', cue: '控制哑铃回到胸口上方。' },
      { at: .20, pose: thighs, label: '将哑铃收近胸前', cue: '肩背保持贴凳，先把哑铃收近身体。' },
      { at: .40, pose: sitDown, label: '持铃靠近大腿，坐起', cue: '收铃靠近躯干，双脚踩稳，随躯干坐起将铃靠到大腿上。' },
      { at: .58, pose: pickRelease, label: '屈髋屈膝轻放哑铃', cue: '保持双脚着地，把哑铃放回脚前地面。' },
      { at: .73, pose: gear(pickRelease, floorWeights), label: '确认哑铃落地', cue: '确认哑铃稳定，再站起来。' },
      { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
    ];
    return { setup, reset, stand, rep: benchFlyPose };
  }

  const DATA = {};

  {
    const start = hammerStart();
    const stand = standWithFloorWeights('hammer');
    const pick = pickTwoDumbbells('hammer');
    const frames = standingFrames('hammer', start, pick, start, stand);
    DATA.hammer = { ...frames, stand, rep: t => gear(setType(P.get(t, 'curl'), 'hammer'), P.get(t, 'curl').wrists) };
  }

  {
    const start = frontStart();
    const stand = standWithFloorWeights('frontraise');
    const pick = pickTwoDumbbells('frontraise');
    const frames = standingFrames('frontraise', start, pick, start, stand, {
      startLabel: '哑铃置于大腿前侧',
      startCue: '手臂自然下垂，掌心朝向大腿。'
    });
    DATA.frontraise = { ...frames, stand, rep: frontRep };
  }

  {
    const start = shrugStart();
    const stand = standWithFloorWeights('shrug');
    const pick = pickTwoDumbbells('shrug');
    const frames = standingFrames('shrug', start, pick, start, stand, {
      startLabel: '双手自然垂在身体两侧',
      startCue: '手臂伸直但不僵硬，肩膀自然下沉。'
    });
    DATA.shrug = { ...frames, stand, rep: shrugRep };
  }

  {
    const stand = standWithFloorWeights('dbrow');
    const pick = pickTwoDumbbells('dbrow');
    const carry = sideCarry('dbrow');
    const start = rowStart();
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: '哑铃放在脚前，双脚与髋同宽。' },
      { at: .34, pose: pick, label: '双脚踩稳，屈髋屈膝取铃', cue: '保持背部稳定，拿起哑铃后站直。' },
      { at: .64, pose: carry, label: '站起并握稳哑铃', cue: '哑铃垂在身侧，准备屈髋进入划船姿势。' },
      { at: .84, pose: P.blend(carry, start, .58), label: '髋部后移，躯干前倾', cue: '膝盖微屈，背部保持平直。' },
      { at: 1, pose: start, label: '俯身划船预备位', cue: '哑铃垂在肩膀下方，颈部与背部保持自然延长。' }
    ];
    const reset = [
      { at: 0, pose: start, label: '哑铃回到身下', cue: '先把哑铃控制到肩膀正下方。' },
      { at: .30, pose: P.blend(start, carry, .72), label: '髋部伸展，站直', cue: '保持背部稳定，站直后再放下哑铃。' },
      { at: .62, pose: pick, label: '屈髋屈膝放回哑铃', cue: '双脚踩稳，哑铃轻放地面。' },
      { at: .75, pose: gear(pick, DB_FLOOR), label: '确认哑铃落地', cue: '器械落稳后再松手。' },
      { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
    ];
    DATA.dbrow = { setup, reset, stand, rep: rowPose };
  }

  {
    const cfg = floorPressFrames();
    DATA.floorpress = cfg;
  }

  {
    const cfg = benchFlyFrames();
    DATA.dbfly = cfg;
  }

  {
    const stand = kettlebell(setType(P.stand(), 'goblet'), [0, .099, .52], [[-.095, .209, .52], [.095, .209, .52]]);
    const pick = gobletPick();
    const start = gobletPose(0);
    const carrySource = P.stand();
    const carryW = [[-.095, 1.21, .16], [.095, 1.21, .16]];
    const carry = kettlebell(handsFrom(carrySource, carryW), [0, 1.10, .16], clone(carryW));
    const released = clone(pick);
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: '壶铃放在脚前，先站稳。' },
      { at: .38, pose: pick, label: '屈髋屈膝双手握住壶铃', cue: '双脚踩地，握住壶铃两侧把手后站起。' },
      { at: .70, pose: carry, label: '将壶铃抱到胸前', cue: '手肘朝下，壶铃贴近胸口。' },
      { at: 1, pose: start, label: '杯式深蹲预备位', cue: '双脚略宽于髋，脚尖自然外展。' }
    ];
    const reset = [
      { at: 0, pose: start, label: '回到站立位', cue: '先站稳，再将壶铃放回地面。' },
      { at: .34, pose: carry, label: '壶铃贴近胸前', cue: '保持壶铃靠近身体，屈髋屈膝下蹲。' },
      { at: .66, pose: pick, label: '双脚踩稳，轻放壶铃', cue: '双手扶稳把手，确认壶铃落地。' },
      { at: .78, pose: released, label: '松手并站起', cue: '壶铃稳定后再松手，双脚踩稳站起。' },
      { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
    ];
    DATA.goblet = { stand, setup, reset, rep: gobletPose };
  }

  {
    const stand = standWithFloorWeights('dbsquat');
    const pick = pickTwoDumbbells('dbsquat');
    const carry = sideCarry('dbsquat');
    const start = dbSquatPose(0);
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: '哑铃放在脚前，双脚与髋同宽。' },
      { at: .34, pose: pick, label: '屈髋屈膝取起哑铃', cue: '双脚踩稳，拿起哑铃后站直。' },
      { at: .66, pose: carry, label: '站直并握稳哑铃', cue: '哑铃自然垂在身体两侧。' },
      { at: .82, pose: P.blend(carry, start, .6), label: '调整到深蹲站距', cue: '双脚约与肩同宽，脚尖自然外展。' },
      { at: 1, pose: start, label: '哑铃深蹲预备位', cue: '胸口打开，手臂自然垂下。' }
    ];
    const reset = [
      { at: 0, pose: start, label: '回到站立位', cue: '站直后控制哑铃靠近身体。' },
      { at: .27, pose: P.blend(start, carry, .7), label: '双脚站稳，准备放下', cue: '保持躯干稳定，屈髋屈膝拿向地面。' },
      { at: .60, pose: pick, label: '双脚踩稳，轻放哑铃', cue: '哑铃触地后再松手。' },
      { at: .73, pose: gear(pick, DB_FLOOR), label: '确认哑铃落地', cue: '确认器械稳定后再站起。' },
      { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
    ];
    DATA.dbsquat = { stand, setup, reset, rep: dbSquatPose };
  }

  const REP_COPY = {
    hammer: ['锤式弯举', '掌心相对，固定上臂，只屈伸肘关节。'],
    frontraise: ['交替前平举', '左臂完成抬起与下放后，再换右臂，躯干保持稳定。'],
    shrug: ['哑铃耸肩', '肩膀向上靠近耳朵，再控制下沉；手臂保持伸长。'],
    dbrow: ['俯身双哑铃划船', '躯干保持稳定，肘部沿身体两侧向后拉。'],
    floorpress: ['哑铃地板卧推', '上臂轻触地面后推起，手腕保持在肘部上方。'],
    dbfly: ['平凳哑铃飞鸟', '肘部微屈，沿宽弧打开，再用胸部把手臂合回。'],
    goblet: ['壶铃杯式深蹲', '壶铃贴近胸口，膝盖沿脚尖方向移动，再踩地站起。'],
    dbsquat: ['哑铃深蹲', '臀部向后下方移动，脚掌踩稳后站起。']
  };

  function anchorFor(pose, id, t) {
    if (id === 'hammer') return pose.elbows && pose.wrists ? mid(pose.elbows[0], pose.wrists[0]) : pose.torso.mid;
    if (id === 'frontraise') return add(pose.shoulder, [0, 0, .22 + .26 * Math.sin(Math.PI * clamp(t))]);
    if (id === 'shrug') return add(pose.shoulder, [0, -.06, 0]);
    if (id === 'dbrow') return add(pose.torso.mid, [0, -.04, 0]);
    if (id === 'floorpress' || id === 'dbfly') return add(pose.torso.mid, [0, .02, .04]);
    if (id === 'goblet' || id === 'dbsquat') return pose.torso.hip;
    return pose.torso.mid;
  }

  function normalizePhase(value) {
    const phase = Number(value);
    return Number.isFinite(phase) ? phase - Math.floor(phase) : 0;
  }

  function sampleOne(id, cyclePhase) {
    const cycle = normalizePhase(cyclePhase);
    const action = DATA[id] || DATA.hammer;
    let stage, label, cue, pose, repPhase = 0, t = 0;
    if (cycle < BOUNDARIES[1]) {
      stage = 'stand';
      pose = clone(action.stand);
      label = '自然站立';
      cue = '先观察动作与器械摆放。';
    } else if (cycle < BOUNDARIES[2]) {
      stage = 'setup';
      t = (cycle - BOUNDARIES[1]) / (BOUNDARIES[2] - BOUNDARIES[1]);
      const frame = framesPose(action.setup, t);
      pose = frame.pose;
      label = frame.label;
      cue = frame.cue;
    } else if (cycle < BOUNDARIES[3]) {
      stage = 'rep';
      t = (cycle - BOUNDARIES[2]) / (BOUNDARIES[3] - BOUNDARIES[2]);
      repPhase = t;
      pose = action.rep(t);
      [label, cue] = REP_COPY[id] || REP_COPY.hammer;
      if (id === 'frontraise') {
        cue = t < .25 ? '左臂平举至肩高附近，身体保持稳定。'
          : t < .5 ? '左臂控制下放，右手保持在大腿前。' : t < .75 ? '右臂抬到肩高附近，保持肘部微屈。'
            : '控制右臂回到大腿前侧，肩膀远离耳朵。';
      }
    } else {
      stage = 'reset';
      t = (cycle - BOUNDARIES[3]) / (BOUNDARIES[4] - BOUNDARIES[3]);
      const frame = framesPose(action.reset, t);
      pose = frame.pose;
      label = frame.label;
      cue = frame.cue;
      repPhase = 1;
    }
    if(id==='floorpress'){
      if(stage==='setup' && t>=.73 && t<=.84)pose=placeFloorBells(ease((t-.73)/.11));
      if(stage==='reset' && t>=.14 && t<=.27)pose=placeFloorBells(1-ease((t-.14)/.13));
      if(pose.dumbbells.every((d,i)=>Math.hypot(...d.map((x,k)=>x-pose.wrists[i][k]))<.0001))delete pose.handSupports;
    }
    P.gripDumbbells(pose,id);
    if(pose.kettlebell)pose.handRadials=[[-.16,.982,-.10],[.16,.982,-.10]];

    const hasGear = !!(pose.dumbbells || pose.kettlebell || pose.bench || pose.mat);
    return { pose, stage, label, cue, anchor: anchorFor(pose, id, t), repPhase, equipmentVisible: hasGear };
  }

  const moves = {};
  for (const id of IDS) {
    if(!['floorpress','dbfly'].includes(id)){moves[id]=phase=>sampleOne(id,phase);continue}
    const setupClock=P.transitionClock(t=>sampleOne(id,.10+.30*t).pose);
    const resetClock=P.transitionClock(t=>sampleOne(id,.78+.22*t).pose);
    moves[id]=phase=>{
      let f=normalizePhase(phase);
      if(f>=.10&&f<.4)f=.10+.30*setupClock((f-.10)/.30);
      if(f>=.78)f=.78+.22*resetClock((f-.78)/.22);
      return sampleOne(id,f);
    };
  }
  window.FormExtraMoves = Object.assign(window.FormExtraMoves || {}, moves);
  window.FormExtraMoveMeta = { ids: IDS.slice(), boundaries: BOUNDARIES.slice() };
})();
