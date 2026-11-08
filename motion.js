(() => {
  'use strict';

  const P = window.FormPoses;
  if (!P) return;

  const BOUNDARIES = [0, .10, .40, .78, 1];
  const FLOOR_IDS = new Set(['pushup', 'plank', 'bridge']);
  const BAR_IDS = new Set(['rdl', 'squat', 'bench']);
  const DUMBBELL_IDS = new Set(['row', 'overhead', 'curl', 'lateral']);
  const IDS = ['rdl', 'squat', 'pushup', 'row', 'overhead', 'plank', 'curl', 'lunge', 'lateral', 'bridge', 'calf', 'bench'];

  const add = (a, b) => a.map((value, index) => value + b[index]);
  const mul = (a, value) => a.map(component => component * value);
  const midpoint = (a, b) => mul(add(a, b), .5);
  const ease = t => t * t * (3 - 2 * t);
  const clone = value => P.clone(value);
  const blend = (a, b, t) => P.blend(a, b, ease(Math.max(0, Math.min(1, t))));

  function barAt(y, z, shoulder = false) {
    const bar = { a: [-1.01, y, z], b: [1.01, y, z], plates: true };
    if (shoulder) bar.shoulder = true;
    return bar;
  }

  function matFor(id) {
    if (!FLOOR_IDS.has(id)) return null;
    return { a: [0, .018, -1.18], b: [0, .018, .76], width: .78 };
  }

  function baseFor(id) {
    const p = P.get(0, id);
    const base = { bench: clone(p.bench), mat: matFor(id) };
    if(id==='rdl') base.bar=barAt(.207,.116);
    else if (BAR_IDS.has(id)) {
      const lowest = id === 'squat' ? P.get(.105, id) : p;
      const rackY = lowest.bar.a[1] - (id === 'bench' ? .06 : 0);
      const rackZ = lowest.bar.a[2] + (id === 'bench' ? -.28 : 0);
      base.rack = { x: .68, y: rackY, z: rackZ };
      base.bar = barAt(rackY, rackZ, id === 'squat');
    }
    if (DUMBBELL_IDS.has(id)) {
      base.dumbbells = id === 'row'
        ? [[.97, .08, .52]]
        : [[-.28, .08, .52], [.28, .08, .52]];
    }
    return base;
  }

  const PROP_BASE = Object.fromEntries(IDS.map(id => [id, baseFor(id)]));

  function equip(p, id, overrides) {
    const out = clone(p);
    for (const [key, value] of Object.entries(PROP_BASE[id] || {})) {
      if (value != null && out[key] === undefined) out[key] = clone(value);
    }
    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        if (value !== undefined) out[key] = clone(value);
      }
    }
    return out;
  }

  function shiftPose(pose, offset, moveHeldEquipment = true) {
    const out = clone(pose);
    for(const key of ['hip','mid','shoulder'])out.torso[key]=add(out.torso[key],offset);
    out.head=add(out.head,offset);out.shoulder=add(out.shoulder,offset);
    for (const key of ['hips','ankles','knees','elbows','wrists','feet'])out[key]=out[key].map(point=>add(point,offset));
    if (moveHeldEquipment) {
      if (out.bar) {
        out.bar.a = add(out.bar.a, offset);
        out.bar.b = add(out.bar.b, offset);
      }
      if (out.dumbbells) out.dumbbells = out.dumbbells.map(point => add(point, offset));
    }
    return out;
  }

  function withProps(pose, id, extra) {
    return equip(pose, id, extra);
  }

  function dumbbellReach(id, row = false) {
    const centerX = row ? .72 : 0;
    const hip = [centerX, .36, -.05];
    const axis = [0, Math.cos(1.10), Math.sin(1.10)];
    const ankles = [[centerX - .18, .10, 0], [centerX + .18, .10, 0]];
    const weights = row ? [[.97, .08, .52]] : [[-.28, .08, .52], [.28, .08, .52]];
    const wrists = row
      ? [[centerX - .13, .43, .13], weights[0]]
      : weights;
    const pose = P.make({
      type: id,
      hip,
      axis,
      ankles,
      wrists,
      armPoles: [[-.4, 0, -1], [.4, 0, -1]],
      footDirections: [[0, 0, 1], [0, 0, 1]]
    });
    return equip(pose, id, { dumbbells: row ? [wrists[1]] : wrists });
  }

  function rowCarry() {
    const p = shiftPose(P.stand(), [.72, 0, 0], false);
    p.type = 'row';
    const right = p.wrists[1];
    return equip(p, 'row', { dumbbells: [right] });
  }

  function sittingPose(id, reclined = false) {
    const hip = reclined ? [0, .16, .12] : [0, .16, .02];
    const axis = reclined ? [0, .66, -.75] : [0, 1, 0];
    const ankles = reclined
      ? [[-.17, .10, .59], [.17, .10, .59]]
      : [[-.17, .10, .48], [.17, .10, .48]];
    const pose = P.make({
      type: id,
      hip,
      axis,
      ankles,
      wrists: reclined ? [[-.28, .09, -.25], [.28, .09, -.25]] : [[-.26, .09, -.015], [.26, .09, -.015]],
      armPoles: [[-1, 0, .2], [1, 0, .2]],
      footDirections: [[0, 0, 1], [0, 0, 1]]
    });
    return equip(pose, id);
  }

  function floorKneel(id) {
    return equip(P.make({
      type: id,
      hip: [0, .54, .05],
      axis: [0, Math.cos(1.30), Math.sin(1.30)],
      ankles: [[-.15, .10, -.38], [.15, .10, -.38]],
      knees: [[-.15, .10, .05], [.15, .10, .05]],
      wrists: [[-.24, .08, .75], [.24, .08, .75]],
      armPoles: [[-.4, 0, -1], [.4, 0, -1]],
      footDirections: [[0, 0, -1], [0, 0, -1]]
    }), id);
  }

  function crouchPose(id) {
    return equip(P.make({
      type: id,
      hip: [0, .58, -.06],
      axis: [0, Math.cos(1.10), Math.sin(1.10)],
      ankles: [[-.18, .10, 0], [.18, .10, 0]],
      footDirections: [[0, 0, 1], [0, 0, 1]]
    }), id);
  }

  function floorQuadruped(id) {
    return equip(P.make({
      type: id,
      hip: [0, .53, -.05],
      axis: [0, Math.cos(1.32), Math.sin(1.32)],
      ankles: [[-.15, .10, -.48], [.15, .10, -.48]],
      knees: [[-.15, .10, -.05], [.15, .10, -.05]],
      wrists: [[-.24, .08, .69], [.24, .08, .69]],
      armPoles: [[-.4, 0, -1], [.4, 0, -1]],
      footDirections: [[0, 0, -1], [0, 0, -1]]
    }), id);
  }

  function oneLegOut(id) {
    const pose = floorQuadruped(id);
    pose.ankles[1] = [.15, .10, -.91];
    pose.knees[1] = [.15, .29, -.48];
    pose.feet = pose.ankles.map((ankle, i) => add(add(ankle, mul(pose.footDirection[i], .052)), [0, -.04, 0]));
    return pose;
  }

  function oneElbow(id,low,high) {
    const p=clone(low);
    const stillPalm=high.wrists[1];
    p.wrists[1]=clone(stillPalm);
    p.elbows[1]=P.joint(P.shoulders(p)[1],stillPalm,.31,.33,[.65,.12,-1]);
    p.type=id;
    return p;
  }

  function kneelFromFloor(id) {
    return floorKneel(id);
  }

  function barSetup(id) {
    const start = P.get(0, id);
    if (id === 'rdl') {
      const lower = P.make({
        type:id, hip:[0,.592,-.325], axis:[0,.415,Math.sqrt(1-.415*.415)],
        ankles:start.ankles, wrists:[[-.257,.207,.116],[.257,.207,.116]],
        armPoles:[[-.1,0,-1],[.1,0,-1]]
      });
      lower.bar=clone(PROP_BASE.rdl.bar);
      return {
        setup: [
          { at: 0, pose: equip(P.stand(), id), label: '自然站立', cue: '杠铃静置于脚前，站到杆身靠近小腿的位置。' },
          { at: .48, pose: equip(lower, id), label: '屈髋屈膝，双手握杠', cue: '屈髋屈膝，背部保持稳定，双手握住杠铃。' },
          { at: .64, pose: equip(lower, id), label: '握稳杠铃', cue: '双手握住杠，肩膀保持在杠铃上方。' },
          { at: 1, pose: equip(start, id, { bar: start.bar }), label: '站起进入预备位', cue: '脚踩稳地面，带着杠铃回到大腿前侧。' }
        ],
        reset: [
          { at: 0, pose: equip(start, id, { bar: start.bar }), label: '回到站立', cue: '保持杠铃贴近身体。' },
          { at: .53, pose: equip(lower, id, { bar: lower.bar }), label: '髋部后移下放', cue: '先屈髋，再屈膝，把杠铃平稳放回地面。' },
          { at: .69, pose: equip(lower, id), label: '杠铃落地', cue: '等两侧杠铃片稳稳落地后，再放开双手。' },
          { at: 1, pose: equip(P.stand(), id), label: '自然站立', cue: '松手后站稳，完成动作循环。' }
        ]
      };
    }
    const rackBar = clone(PROP_BASE.squat.bar);
    const waiting = equip(shiftPose(P.stand(), [0, 0, -.36], false), id);
    const underRack = equip(P.get(.105, id), id, { bar: rackBar });
    const underRackWithBar = equip(start, id, { bar: start.bar });
    const afterStep = equip(shiftPose(start, [0, 0, -.35]), id);
    return {
      setup: [
        { at: 0, pose: waiting, label: '自然站立', cue: '杠铃在肩高托架上。' },
        { at: .37, pose: blend(waiting, underRack, .72), label: '走到杠铃下方', cue: '双脚站稳，双手调整到对称握距。' },
        { at: .58, pose: underRack, label: '肩背贴稳杠铃', cue: '躯干收紧，准备从架上取杠。' },
        { at: .76, pose: underRackWithBar, label: '从托钩取杠', cue: '先稳住肩背，再把杠铃从托钩上移开。' },
        { at: 1, pose: afterStep, label: '小步后退站稳', cue: '向后退一步，确认杠铃离开托钩后再下蹲。' }
      ],
      reset: [
        { at: 0, pose: afterStep, label: '站直并稳住杠铃', cue: '先站稳，再向托架靠近。' },
        { at: .40, pose: underRackWithBar, label: '对准托钩', cue: '小步向前，让杠铃与两侧托钩对齐。' },
        { at: .61, pose: underRack, label: '将杠铃放回托钩', cue: '让托钩承住杠铃后再松手。' },
        { at: 1, pose: waiting, label: '离开杠铃架', cue: '松手后退开，恢复自然站姿。' }
      ]
    };
  }

  function dumbbellSetup(id) {
    const floor = equip(id === 'row' ? shiftPose(P.stand(), [.72, 0, 0], false) : P.stand(), id);
    const pick = dumbbellReach(id, id === 'row');
    const carry = id === 'row' ? rowCarry() : equip(P.get(0, id === 'overhead' ? 'curl' : id), id);
    let actionStart = equip(P.get(0, id), id);
    if (id === 'row') actionStart = equip(P.get(0, id), id);
    let braced;
    if(id==='row'){
      const hip=[.16,.86,-.24],axis=[0,.38,.925],working=add(add(hip,mul(axis,.56)),[.258,-.628,.01]);
      braced=P.make({type:id,hip,axis,ankles:[[.045,.100,-.34],actionStart.ankles[1]],
        wrists:[actionStart.wrists[0],working],armPoles:[[-.24,0,-1],[.15,0,-1]],footDirections:[[0,0,1],[.08,0,1]]});
      braced=equip(braced,id,{dumbbells:[working]});
      P.palmSupports(braced,braced.bench.a[1],[[0,0,1],[0,0,1]],[1,0]);
    }
    const setupFrames = [{ at: 0, pose: floor, label: '自然站立', cue: '哑铃放在脚前地面。' }];
    if (id === 'row') {
      setupFrames.push(
        { at: .33, pose: pick, label: '双脚踩稳，屈髋屈膝握铃', cue: '双脚着地，保持躯干稳定，伸手握住哑铃。' },
        { at: .55, pose: carry, label: '站起并拿稳哑铃', cue: '拿稳哑铃后站起，移到训练凳旁。' },
        { at: .82, pose: braced, label: '先用空手撑住凳面', cue: '支撑手压稳凳面，再把同侧膝盖移到凳上。' },
        { at: 1, pose: actionStart, label: '哑铃垂在身下', cue: '肩膀远离耳朵，手臂自然伸直。' }
      );
    } else {
      const down = id === 'overhead' ? equip(P.get(0, 'curl'), id) : actionStart;
      setupFrames.push(
        { at: .34, pose: pick, label: '双脚踩稳，屈髋屈膝握铃', cue: '双脚着地，保持背部稳定，双手握住地面的哑铃。' },
        { at: .68, pose: down, label: '站起，哑铃垂在身侧', cue: '站稳后让哑铃自然垂在身体两侧。' }
      );
      if (id === 'overhead') setupFrames.push({ at: 1, pose: actionStart, label: '举至肩旁', cue: '双肘位于身体前侧附近，手腕保持平直。' });
      else setupFrames.push({ at: 1, pose: actionStart, label: '调整站姿', cue: '双脚站稳，手臂自然垂下。' });
    }
    const resetFrames = [];
    if (id === 'row') {
      resetFrames.push(
        { at: 0, pose: actionStart, label: '控制哑铃下放', cue: '先把哑铃垂回身下。' },
        { at: .17, pose: braced, label: '先把支撑腿移到地面', cue: '手掌仍压稳凳面，先让双脚落地。' },
        { at: .34, pose: carry, label: '起身离凳', cue: '双脚踩稳后松开支撑手，站直。' },
        { at: .55, pose: pick, label: '双脚踩稳，放回哑铃', cue: '屈髋屈膝，把哑铃轻放回地面。' },
        { at: .72, pose: equip(pick, id), label: '松手站起', cue: '确认哑铃在地面后再松手。' },
        { at: 1, pose: floor, label: '自然站立', cue: '站稳，完成动作循环。' }
      );
    } else {
      const down = id === 'overhead' ? equip(P.get(0, 'curl'), id) : actionStart;
      resetFrames.push(
        { at: 0, pose: actionStart, label: id === 'overhead' ? '哑铃回到肩旁' : '回到动作起点', cue: '控制哑铃，不要突然放松。' },
        { at: .28, pose: down, label: '哑铃垂在身侧', cue: '手臂自然下垂，准备放回地面。' },
        { at: .57, pose: pick, label: '双脚踩稳，放回哑铃', cue: '屈髋屈膝，哑铃轻放在脚前。' },
        { at: .72, pose: equip(pick, id), label: '确认哑铃落地', cue: '双手松开后再站起。' },
        { at: 1, pose: floor, label: '自然站立', cue: '站稳，完成动作循环。' }
      );
    }
    return { setup: setupFrames, reset: resetFrames };
  }

  function floorSetup(id) {
    const stand = equip(P.stand(), id);
    const crouch = crouchPose(id);
    const kneel = floorKneel(id);
    const quadruped = floorQuadruped(id);
    const extended = oneLegOut(id);
    const start = equip(P.get(0, id === 'pushup' ? 'pushup' : 'plank'), id);
    if (id === 'pushup') {
      const setup = [
        { at: 0, pose: stand, label: '自然站立', cue: '先确认垫子平铺在脚前。' },
        { at: .16, pose: crouch, label: '屈髋屈膝下蹲', cue: '双脚踩地，先降低身体并保持躯干稳定。' },
        { at: .29, pose: kneel, label: '双手与双膝落到垫上', cue: '双膝落垫后，再把手掌放到肩膀下方。' },
        { at: .46, pose: quadruped, label: '四点支撑', cue: '双手撑地，肩膀在手腕上方。' },
        { at: .65, pose: extended, label: '先伸出一条腿', cue: '脚尖落地，身体由双手和另一侧膝盖支撑。' },
        { at: .82, pose: blend(extended, start, .52), label: '伸直另一条腿', cue: '逐步进入高位平板，收紧腹部。' },
        { at: 1, pose: start, label: '俯卧撑预备位', cue: '头、背、髋大致成一直线。' }
      ];
      const reset = [
        { at: 0, pose: start, label: '俯卧撑预备位', cue: '先放下膝盖，再退出支撑。' },
        { at: .22, pose: extended, label: '一侧膝盖落垫', cue: '保持手掌支撑，轻轻放下一侧膝盖。' },
        { at: .42, pose: quadruped, label: '双膝回到垫上', cue: '回到四点支撑，稳住身体。' },
        { at: .60, pose: kneel, label: '手膝支撑', cue: '臀部向后移，再起身。' },
        { at: .76, pose: crouch, label: '双脚踩地，屈髋屈膝', cue: '先让双脚承重，再从下蹲姿势站起。' },
        { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
      ];
      return { setup, reset };
    }
    const forearms=start, high=equip(P.get(0,'pushup'),id), single=oneElbow(id,forearms,high);
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: '确认垫子平铺，留出伸展空间。' },
      { at: .14, pose: crouch, label: '屈髋屈膝下蹲', cue: '双脚踩地，先降低身体。' },
      { at: .27, pose: kneel, label: '双手与双膝落到垫上', cue: '双膝落垫后，用手掌支撑身体。' },
      { at: .42, pose: quadruped, label: '四点支撑', cue: '手掌位于肩膀下方，膝盖支撑在垫上。' },
      { at: .57, pose: extended, label: '先伸出一条腿', cue: '脚尖落地，另一侧膝盖继续支撑。' },
      { at: .68, pose: high, label: '伸直另一条腿，双掌撑垫', cue: '逐步伸直双腿，保持躯干稳定。' },
      { at: .84, pose: single, label: '先落一侧前臂', cue: '一次放下一侧前臂，肘部落在肩膀下方。' },
      { at: 1, pose: forearms, label: '前臂平板支撑', cue: '前臂贴垫，头到脚跟保持一线。' }
    ];
    const reset = [
      { at: 0, pose: forearms, label: '前臂平板支撑', cue: '先回到手掌支撑，再屈膝。' },
      { at: .14, pose: single, label: '先撑起一侧手掌', cue: '另一前臂仍贴垫，稳住躯干。' },
      { at: .28, pose: high, label: '两手掌撑稳', cue: '两侧手掌撑稳，再依次收膝。' },
      { at: .41, pose: extended, label: '一侧膝盖落垫', cue: '轻放一侧膝盖，脚尖保持接地。' },
      { at: .52, pose: quadruped, label: '双膝回到垫上', cue: '回到四点支撑。' },
      { at: .67, pose: kneel, label: '手膝支撑', cue: '臀部向后移，再用手支撑起身。' },
      { at: .80, pose: crouch, label: '双脚踩地，屈髋屈膝', cue: '先让双脚承重，再从下蹲姿势站起。' },
      { at: 1, pose: stand, label: '自然站立', cue: '站稳，完成动作循环。' }
    ];
    return { setup, reset };
  }

  function bridgeSetup() {
    const id='bridge', stand=equip(shiftPose(P.stand(),[0,.012,.51],false),id);
    const supine=equip(P.get(0,id),id),ankles=supine.ankles;
    const make=(hip,axis,wrists,weights)=>{
      const p=P.make({type:id,hip,axis,wrists,ankles,legPoles:[[0,1,1],[0,1,1]],armPoles:[[-.85,.10,-.3],[.85,.10,-.3]],footDirections:[[0,0,1],[0,0,1]]});
      P.palmSupports(p,P.matY,[[-.55,0,-.835],[.55,0,-.835]],weights);
      return equip(p,id);
    };
    const crouch=make([0,.48,.25],[0,.85,.527],[[-.26,.66,.67],[.26,.66,.67]],[0,0]);
    const side=make([-.027,.215,.105],[0,.85,-.527],[[-.30,.054,-.27],[.28,.58,.43]],[1,0]);
    const sit=make([0,.158,.061],[0,.77,-.638],[[-.30,.054,-.32],[.30,.054,-.32]],[1,1]);
    const recline=make([0,.155,.04],[0,.42,-.908],[[-.30,.054,-.24],[.30,.054,-.24]],[1,1]);
    // Fingers turn toward the feet once the back and pelvis carry the load.
    const down=equip(P.get(0,id),id);
    const setup=[
      {at:0,pose:stand,label:'站在垫上',cue:'双脚踩稳，给身后留出躺下的空间。'},
      {at:.26,pose:crouch,label:'屈膝向后坐',cue:'双脚留在原处，双手向前保持平衡。'},
      {at:.43,pose:side,label:'一手向后撑垫',cue:'先把一侧手落在身后，再把骨盆放在垫上。'},
      {at:.57,pose:sit,label:'坐稳，双手撑垫',cue:'两脚踩稳，双手在身后支撑。'},
      {at:.77,pose:recline,label:'控制上背后躺',cue:'屈肘降低躯干，逐步把肩背放到垫上。'},
      {at:1,pose:down,label:'仰卧屈膝',cue:'后脑和肩背落垫，双臂放到身侧。'}
    ];
    const reset=[
      {at:0,pose:supine,label:'仰卧屈膝',cue:'脚掌踩稳，手臂准备辅助坐起。'},
      {at:.27,pose:recline,label:'屈肘支撑上身',cue:'手掌和前臂辅助抬起肩背。'},
      {at:.45,pose:sit,label:'坐稳在垫上',cue:'双脚留在原处，双手仍在身后支撑。'},
      {at:.60,pose:side,label:'一手支撑，向脚掌移重心',cue:'用脚掌承重，让骨盆离开垫面。'},
      {at:.78,pose:crouch,label:'收手转为低蹲',cue:'让双脚踩稳，双手向前帮助平衡。'},
      {at:1,pose:stand,label:'站直',cue:'平稳伸髋伸膝，恢复站姿。'}
    ];
    return {setup,reset};
  }

  function benchSitting(id, reclined = false) {
    const start = P.get(0, 'bench');
    const fullRecline = reclined === true;
    const partialRecline = reclined === 'partial';
    const axis = fullRecline ? start.torso.axis : partialRecline ? [0, .55, -.835] : [0, 1, 0];
    const hip = fullRecline ? start.torso.hip : partialRecline ? [0, .625, .18] : [0, .575, .16];
    const ankles = [[-.17, .10, .67], [.17, .10, .67]];
    const rack = PROP_BASE.bench.rack;
    const wristPosition = rack ? [rack.y, rack.z] : [1.25, -.5];
    const wrists = fullRecline
      ? [[-.435, wristPosition[0], wristPosition[1]], [.435, wristPosition[0], wristPosition[1]]]
      : [[-.12, .569, hip[2]], [.12, .569, hip[2]]];
    return equip(P.make({
      type: 'bench',
      hip,
      axis,
      headAxis:fullRecline?start.headAxis:axis,
      ankles,
      wrists,
      armPoles: [[-.8, -1, .1], [.8, -1, .1]],
      footDirections: [[0, 0, 1], [0, 0, 1]]
    }), 'bench', {
      bench: clone(PROP_BASE.bench.bench),
      rack: clone(PROP_BASE.bench.rack),
      bar: clone(PROP_BASE.bench.bar)
    });
  }

  function benchSupport(id) {
    const start = P.get(0, id);
    return equip(P.make({
      type: id,
      hip: start.torso.hip,
      axis: start.torso.axis,
      headAxis:start.headAxis,
      ankles: [[-.17, .10, .67], [.17, .10, .67]],
      wrists: [[-.12, .569, .16], [.12, .569, .16]],
      armPoles: [[-.8, -1, .1], [.8, -1, .1]],
      footDirections: [[0, 0, 1], [0, 0, 1]]
    }), id, {
      bench: clone(start.bench),
      rack: clone(PROP_BASE.bench.rack),
      bar: clone(PROP_BASE.bench.bar)
    });
  }

  function benchSetup() {
    const id = 'bench';
    const stand = equip(shiftPose(P.stand(), [0, 0, .75], false), id);
    const sit = benchSitting(id, false);
    const lean = benchSitting(id, 'partial');
    const recline = benchSitting(id, true);
    const start = equip(P.get(0, id), id);
    const rackBar = clone(PROP_BASE.bench.bar);
    const support = benchSupport(id);
    const setup = [
      { at: 0, pose: stand, label: '自然站立', cue: '杠铃位于托钩，训练凳固定在杠铃下方。' },
      { at: .22, pose: sit, label: '坐到训练凳上', cue: '坐稳在凳面，双脚先踩地。' },
      { at: .40, pose: lean, label: '用手臂支撑后躺', cue: '双手撑在凳面，慢慢向后放低肩背。' },
      { at: .60, pose: recline, label: '躺稳并伸手握杠', cue: '肩背落在凳上，双脚踩地后再握杠。' },
      { at: .79, pose: equip(recline, id, { bar: rackBar }), label: '确认握距与手腕', cue: '握距略宽于肩，手腕保持平直。' },
      { at: 1, pose: start, label: '取杠至胸口上方', cue: '从托钩取杠，稳定在胸部上方。' }
    ];
    const unrack = equip(recline, id, { bar: rackBar });
    const sitUp = benchSitting(id, false);
    const reset = [
      { at: 0, pose: start, label: '杠铃回到胸口上方', cue: '控制杠铃，准备放回托钩。' },
      { at: .22, pose: unrack, label: '杠铃对准托钩', cue: '向头侧小幅移动，确认两端对齐托钩。' },
      { at: .38, pose: support, label: '手臂支撑在凳面', cue: '杠铃已由托钩承接，双手落到身体两侧。' },
      { at: .53, pose: lean, label: '用手臂支撑坐起', cue: '双手撑在凳面，慢慢抬起肩背。' },
      { at: .69, pose: sitUp, label: '坐稳在凳面', cue: '双脚踩稳，再准备离开训练凳。' },
      { at: .81, pose: sitUp, label: '双脚移到凳外', cue: '从凳面前侧起身，避免踩到凳架。' },
      { at: 1, pose: stand, label: '自然站立', cue: '双脚站稳，完成动作循环。' }
    ];
    return { setup, reset };
  }

  function lungeSetup() {
    const start = equip(P.stand(), 'lunge');
    const action = equip(P.get(0, 'lunge'), 'lunge');
    const stance = blend(start,action,.65);
    return {
      setup: [
        { at: 0, pose: start, label: '自然站立', cue: '双脚与髋同宽，准备向后迈步。' },
        { at: .72, pose: stance, label: '双脚站稳', cue: '躯干收紧，视线朝前。' },
        { at: 1, pose: action, label: '后撤弓步预备位', cue: '前后脚留出适当宽度。' }
      ],
      reset: [
        { at: 0, pose: action, label: '回到站立位', cue: '先把后脚收回，再站稳。' },
        { at: .52, pose: stance, label: '双脚并回髋宽', cue: '保持平衡，视线朝前。' },
        { at: 1, pose: start, label: '自然站立', cue: '站稳，完成动作循环。' }
      ]
    };
  }

  function calfSetup() {
    const start = equip(P.stand(), 'calf');
    const action = equip(P.get(0, 'calf'), 'calf');
    return {
      setup: [
        { at: 0, pose: start, label: '自然站立', cue: '双脚与髋同宽，脚尖朝前。' },
        { at: .65, pose: action, label: '站稳准备提踵', cue: '需要时指尖轻扶固定支撑物。' },
        { at: 1, pose: action, label: '站姿提踵预备位', cue: '重心放在前脚掌，脚踝对齐。' }
      ],
      reset: [
        { at: 0, pose: action, label: '双脚落地', cue: '脚跟回到地面，再放松站立。' },
        { at: 1, pose: start, label: '自然站立', cue: '站稳，完成动作循环。' }
      ]
    };
  }

  const SETUPS = {};
  for (const id of IDS) {
    if (id === 'bench') SETUPS[id] = benchSetup();
    else if (BAR_IDS.has(id)) SETUPS[id] = barSetup(id);
    else if (DUMBBELL_IDS.has(id)) SETUPS[id] = dumbbellSetup(id);
    else if (id === 'bridge') SETUPS[id] = bridgeSetup();
    else if (id === 'lunge') SETUPS[id] = lungeSetup();
    else if (id === 'calf') SETUPS[id] = calfSetup();
    else SETUPS[id] = floorSetup(id);
  }

  const rowClocks=Object.fromEntries(['setup','reset'].map(stage=>[
    stage,P.transitionClock(t=>sampleFrames(SETUPS.row[stage],t).pose)
  ]));

  const plankResetClock=P.transitionClock(t=>sampleFrames(SETUPS.plank.reset,t).pose);
  const REP_GUIDES = {
    rdl: ['髋部向后折叠', '杠铃贴近腿部，下放至大腿后侧有拉伸感后站起。'],
    squat: ['屈髋屈膝下蹲', '膝盖沿脚尖方向移动，脚掌踩稳后站起。'],
    pushup: ['俯卧撑', '胸口平稳下降，再推开地面回到起始位。'],
    row: ['单臂划船', '肘部向髋部拉，躯干保持不旋转。'],
    overhead: ['哑铃推举', '将哑铃平稳推过头顶，再控制回到肩旁。'],
    plank: ['保持平板支撑', '保持头到脚跟一线，自然呼吸。'],
    curl: ['哑铃弯举', '上臂留在身体两侧，屈肘举起并缓慢下放。'],
    lunge: ['后撤弓步', '后脚向后迈，屈膝下沉后以前脚踩地站回。'],
    lateral: ['哑铃侧平举', '双臂抬至肩高附近，控制下放。'],
    bridge: ['臀桥', '夹紧臀部抬起髋部，再缓慢下放。'],
    calf: ['站姿提踵', '脚跟抬起停顿，再缓慢下降。'],
    bench: ['杠铃卧推', '杠铃控制下降至胸前附近，再平稳推回。']
  };

  function sampleFrames(frames, t) {
    const value = Math.max(0, Math.min(1, t));
    if (value <= frames[0].at) return frames[0];
    for (let i = 1; i < frames.length; i++) {
      const end = frames[i];
      if (value <= end.at) {
        const start = frames[i - 1];
        const span = end.at - start.at || 1;
        const local = (value - start.at) / span;
        return {
          pose: blend(start.pose, end.pose, local),
          label: local < .55 ? start.label : end.label,
          cue: local < .55 ? start.cue : end.cue
        };
      }
    }
    return frames[frames.length - 1];
  }

  function decorateRep(id, repPhase) {
    let p = equip(P.get(repPhase, id), id);
    if (id === 'squat') p = equip(shiftPose(p, [0, 0, -.35]), id);
    if (id === 'plank') return equip(P.get(0, id), id);
    return p;
  }

  function anchorFor(pose, id) {
    const hips = pose.hips || [];
    const knees = pose.knees || [];
    const ankles = pose.ankles || [];
    const shoulder = pose.shoulder || [0, 1.3, 0];
    const torso = pose.torso || { mid: [0, 1.1, 0], hip: [0, 1, 0] };
    const jointMid = index => hips[index] && knees[index] ? midpoint(hips[index], knees[index]) : torso.mid;
    if (id === 'rdl') return add(jointMid(0), [0, 0, -.045]);
    if (id === 'squat' || id === 'lunge') return jointMid(0);
    if (id === 'row') return pose.elbows && pose.elbows[1] ? midpoint(pose.shoulder, pose.elbows[1]) : torso.mid;
    if (id === 'overhead' || id === 'lateral') return add(shoulder, [0, -.05, .06]);
    if (id === 'curl') return pose.elbows && pose.elbows[1] ? midpoint(pose.elbows[1], pose.wrists[1]) : torso.mid;
    if (id === 'calf') return ankles[0] && knees[0] ? midpoint(ankles[0], knees[0]) : torso.mid;
    if (id === 'bridge') return add(torso.hip, [0, .05, .03]);
    if (id === 'bench' || id === 'pushup') return add(torso.mid, [0, .04, .13]);
    return torso.mid;
  }

  function squatWalk(p,local,backward){
    const onRack=P.get(0,'squat'), u=backward?local:1-local;
    const a=Math.max(0,Math.min(1,u*2)),b=Math.max(0,Math.min(1,u*2-1));
    const steps=[a,b].map(ease),feet=steps.map((step,i)=>add(onRack.ankles[i],[0,.075*Math.sin(Math.PI*step),-.35*step]));
    const shift=-.175*(steps[0]+steps[1]);
    const out=shiftPose(onRack,[.017*(Math.sin(Math.PI*a)-Math.sin(Math.PI*b)),-.029*Math.sin(Math.PI*u),shift]);
    out.ankles=feet;
    const active=ease(Math.min(1,u/.14,(1-u)/.14));
    out.knees=out.hips.map((h,i)=>{
      const solved=P.joint(h,feet[i],.45,.43,[0,0,1]);
      return out.knees[i].map((v,j)=>v+(solved[j]-v)*active);
    });
    P.feet(out,onRack.footDirection);
    return equip(out,'squat');
  }
  function sample(cyclePhase, id) {
    if (window.FormExtraMoves?.[id]) return window.FormExtraMoves[id](cyclePhase);
    const rawCycle = Number(cyclePhase);
    const cycle = rawCycle - Math.floor(rawCycle);
    const selected = IDS.includes(id) ? id : 'rdl';
    let stage, local, pose, label, cue, repPhase;
    if (cycle < BOUNDARIES[1]) {
      stage = 'stand';
      local = cycle / (BOUNDARIES[1] - BOUNDARIES[0]);
      const frame = SETUPS[selected].setup[0];
      pose = clone(frame.pose);
      label = '自然站立';
      cue = '先观察动作与器械摆放。';
      repPhase = 0;
    } else if (cycle < BOUNDARIES[2]) {
      stage = 'setup';
      local = (cycle - BOUNDARIES[1]) / (BOUNDARIES[2] - BOUNDARIES[1]);
      const frame = sampleFrames(SETUPS[selected].setup, selected==='row'?rowClocks.setup(local):local);
      pose = frame.pose;
      label = frame.label;
      cue = frame.cue;
      repPhase = 0;
    } else if (cycle < BOUNDARIES[3]) {
      stage = 'rep';
      local = (cycle - BOUNDARIES[2]) / (BOUNDARIES[3] - BOUNDARIES[2]);
      repPhase = local;
      pose = decorateRep(selected, selected === 'plank' ? 0 : repPhase);
      label = REP_GUIDES[selected][0];
      cue = REP_GUIDES[selected][1];
    } else {
      stage = 'reset';
      local = (cycle - BOUNDARIES[3]) / (BOUNDARIES[4] - BOUNDARIES[3]);
      const frame = sampleFrames(SETUPS[selected].reset, selected==='row'?rowClocks.reset(local):selected==='plank'?plankResetClock(local):local);
      pose = frame.pose;
      label = frame.label;
      cue = frame.cue;
      repPhase = 1;
    }
    if(selected==='squat'){
      if(stage==='setup'&&local>.76)pose=squatWalk(pose,(local-.76)/.24,true);
      if(stage==='reset'&&local<.40)pose=squatWalk(pose,local/.40,false);
      if((stage==='setup'&&local<.58)||(stage==='reset'&&local>.61)){
        const u=stage==='setup'?local/.58:(1-local)/.39;
        const atStart=SETUPS.squat.setup[0].pose,atBar=SETUPS.squat.setup[2].pose;
        pose.ankles=atStart.ankles.map((f,i)=>{
          const step=ease(Math.max(0,Math.min(1,u*2-i))),end=atBar.ankles[i];
          return f.map((x,j)=>x+(end[j]-x)*step+(j===1?.064*Math.sin(Math.PI*step):0));
        });
        const active=ease(Math.min(1,u/.12,(1-u)/.12));
        pose.knees=pose.hips.map((h,i)=>{
          const solved=P.joint(h,pose.ankles[i],.45,.43,[0,0,1]);
          return pose.knees[i].map((v,j)=>v+(solved[j]-v)*active);
        });
        P.feet(pose,pose.footDirection);
      }
    }
    if(pose.dumbbells)P.gripDumbbells(pose,selected);
    if(pose.bar)pose.handRadials=[[1,0,0],[-1,0,0]];
    if(['pushup','plank','bridge'].includes(selected)||pose.bench){
      const y=pose.bench?pose.bench.a[1]:P.matY;
      const handDir=selected==='bridge'&&pose.torso.axis[1]>.10?[0,0,-1]:[0,0,1];
      if(!pose.handSupports?.every(v=>Number.isFinite(v?.weight)))P.palmSupports(pose,y,[handDir,handDir],pose.wrists.map((w,i)=>{
        if(pose.bench && (selected==='row'?i===1:Math.abs(w[0])>.167))return 0;
        return 1-ease(Math.max(0,Math.min(1,(w[1]-y-.072)/.15)));
      }));
    }
    if(selected==='rdl'&&pose.bar){pose.bar.a=[-.90,pose.bar.a[1],pose.bar.a[2]];pose.bar.b=[.90,pose.bar.b[1],pose.bar.b[2]]}
    return {
      pose,
      stage,
      label,
      cue,
      anchor: anchorFor(pose, selected),
      repPhase,
      equipmentVisible: !!(pose.bar || pose.dumbbells || pose.bench || pose.mat || pose.rack)
    };
  }

  const posePhases=new WeakMap();
  function sampleWithPhase(phase,id) {
    const sampleFrame=sample(phase,id);
    const t=Number(phase)||0;
    posePhases.set(sampleFrame.pose,t-Math.floor(t));
    return sampleFrame;
  }
  window.AtlasMotion = { sample:sampleWithPhase, phaseOf:pose=>posePhases.get(pose), boundaries: BOUNDARIES.slice(), get ids(){return [...IDS,...Object.keys(window.FormExtraMoves||{})]} };
})();
