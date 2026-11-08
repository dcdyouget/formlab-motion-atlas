/* Offline MakeHuman-based athlete mesh. Load athlete-model.js immediately before this file. */
(() => {
  'use strict';
  const data = window.ATLAS_MODEL_DATA;
  if (!data) throw new Error('Load athlete-model.js before athlete.js');
  const decode = (base64, Type) => {
    const binary = atob(base64), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Type(bytes.buffer);
  };
  const survey = window.ATLAS_SURFACE;
  const atlasCoords = decode(survey.uv,Uint16Array);
  const plate=new Image(), tissuePlate=new Image();
  const ready=Promise.all([[plate,survey.src],[tissuePlate,survey.tissue]].map(([img,uri])=>new Promise(resolve=>{img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=uri})));
  let cpuPlate;
  function sampleAtlas(i){
    if(!plate.naturalWidth)return .65;
    if(!cpuPlate){
      const c=document.createElement('canvas');c.width=plate.naturalWidth;c.height=plate.naturalHeight;
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(plate,0,0);
      cpuPlate={pixels:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};
    }
    const {pixels,w,h}=cpuPlate,x=Math.min((w>>1)-1,Math.round(w*atlasCoords[i*3]/65535)),y=Math.max(0,Math.min(h-1,Math.round(h*atlasCoords[i*3+1]/65535))),q=Math.max(0,Math.min(1,(atlasCoords[i*3+2]/65535-.30)/.40));
    const k=(y*w+x)*4;return (pixels[k]*(q*q*(3-2*q))+pixels[k+(w>>1)*4]*(1-q*q*(3-2*q)))/255;
  }
  const positions = decode(data.arrays.positionF32, Float32Array);
  const normalsI8 = decode(data.arrays.normalI8, Int8Array);
  const joints = decode(data.arrays.jointsU8, Uint8Array);
  const weights = decode(data.arrays.weightsU8, Uint8Array);
  const indices = Object.fromEntries(Object.entries(data.arrays.indicesU16).map(([name, b64]) => [name, decode(b64, Uint16Array)]));
  const vertexCount = data.vertexCount;
  const boneNames = data.bones.map(b => b.name);
  const boneNameIndex = Object.fromEntries(boneNames.map((name, i) => [name, i]));
  const vec = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, n) => [a[0] * n, a[1] * n, a[2] * n];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // Rotation taking one bone direction to another, with no arbitrary roll.
  function rotationRows(from, to) {
    const a = norm(from), b = norm(to), d = clamp(dot(a, b), -1, 1);
    let q;
    if (d < -0.999999) {
      const axis = norm(cross(a, Math.abs(a[0]) < .8 ? [1, 0, 0] : [0, 1, 0]));
      q = [axis[0], axis[1], axis[2], 0];
    } else {
      const c = cross(a, b), s = Math.sqrt((1 + d) * 2), inv = 1 / (s || 1);
      q = [c[0] * inv, c[1] * inv, c[2] * inv, s * .5];
    }
    const [x, y, z, w] = q, xx = x * x, yy = y * y, zz = z * z;
    return [
      [1 - 2 * (yy + zz), 2 * (x * y - z * w), 2 * (x * z + y * w)],
      [2 * (x * y + z * w), 1 - 2 * (xx + zz), 2 * (y * z - x * w)],
      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (xx + yy)]
    ];
  }
  const reject = (v, axis) => sub(v,mul(axis,dot(v,axis)));
  const compose = (a,b) => a.map(row => [0,1,2].map(k => row[0]*b[0][k]+row[1]*b[1][k]+row[2]*b[2][k]));
  function axisRotation(v, angle) {
    const [x,y,z]=norm(v), c=Math.cos(angle), s=Math.sin(angle), t=1-c;
    return [[c+x*x*t,x*y*t-z*s,x*z*t+y*s],[y*x*t+z*s,c+y*y*t,y*z*t-x*s],[z*x*t-y*s,z*y*t+x*s,c+z*z*t]];
  }
  function swing(parent,restDir,targetDir) {
    return compose(rotationRows(applyRows(parent,restDir),targetDir),parent);
  }
  function followTwist(rotation,bindMarker,direction,hint,strength) {
    const axis=norm(direction), from=norm(reject(applyRows(rotation,bindMarker),axis)), v=reject(hint,axis);
    const amplitude=Math.hypot(...v);
    if(amplitude<.001)return rotation;
    const to=mul(v,1/amplitude), sine=dot(axis,cross(from,to));
    // The bounded signed correction goes through zero at opposing poles. A tiny
    // change in a straight elbow can never reverse an entire arm mesh.
    const roll=Math.asin(clamp(sine,-1,1))*strength*Math.min(1,amplitude/.32);
    return compose(axisRotation(axis,roll),rotation);
  }
  function linearForBone(restDir, rotation, scaleAlong) {
    const d = norm(restDir), delta = scaleAlong - 1, out = [[], [], []];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      let value = 0;
      for (let k = 0; k < 3; k++) value += rotation[r][k] * ((k === c ? 1 : 0) + delta * d[k] * d[c]);
      out[r][c] = value;
    }
    return out;
  }
  function applyRows(m, p) { return [dot(m[0], p), dot(m[1], p), dot(m[2], p)]; }

  function targetBones(pose) {
    const t = pose.torso, axis = norm(t.axis || [0, 1, 0]), right = norm(t.right || [1, 0, 0]);
    const shoulder = t.shoulder, restHip = data.landmarks['joint-pelvis'];
    const restShoulder = data.landmarks['joint-l-shoulder'].map((v, i) => (v + data.landmarks['joint-r-shoulder'][i]) * .5);
    const restAxis = norm(sub(restShoulder, restHip)), restRight = [1, 0, 0];
    const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const restDepth = norm(cross3(restRight, restAxis)), depth = norm(t.depth || cross3(right, axis));
    const restLength = Math.hypot(...sub(restShoulder, restHip));
    const poseLength = Math.hypot(...sub(shoulder, t.hip));
    const axialScale = poseLength / (restLength || 1);
    const mapTorso = point => {
      const d = sub(point, restHip), lateral = dot(d, restRight), axial = dot(d, restAxis), deep = dot(d, restDepth);
      return vec(vec(vec(t.hip, mul(right, lateral)), mul(axis, axial * axialScale)), mul(depth, deep));
    };
    const spine3 = pose.spinePoints?.lower || mapTorso(data.landmarks['joint-spine-3']);
    const spine1 = pose.spinePoints?.upper || mapTorso(data.landmarks['joint-spine-1']);
    const headAxis = norm(pose.headAxis || axis), headDepth = norm(cross3(right, headAxis)), headBone = data.bones[boneNameIndex.head];
    const restHeadVector = sub(headBone.end, headBone.start);
    const headLateral = dot(restHeadVector, restRight), headAxial = dot(restHeadVector, restAxis), headDeep = dot(restHeadVector, restDepth);
    let headVector = vec(vec(mul(right, headLateral), mul(headAxis, headAxial)), mul(headDepth, headDeep));
    headVector = mul(norm(headVector), Math.hypot(...restHeadVector));
    const dirs = pose.footDirection || [[0, 0, 1], [0, 0, 1]];
    const ret = {
      spineLower: [t.hip, spine3], spineMid: [spine3, spine1], spineUpper: [spine1, shoulder],
      head: [sub(pose.head, headVector), pose.head]
    };
    for (const [sourceSide, sideIndex] of [[-1, 0], [1, 1]]) {
      const suffix = sourceSide > 0 ? 'Left' : 'Right';
      const restSide=sourceSide>0?'l':'r';
      const clavicle=mapTorso(data.landmarks['joint-'+restSide+'-clavicle']);
      const nominal=vec(shoulder,mul(right,sourceSide*.211));
      const armDir=norm(sub(pose.elbows[sideIndex],nominal));
      const lift=clamp((dot(armDir,axis)+.58)/1.58,0,1);
      const reach=dot(armDir,depth);
      const sh=vec(vec(nominal,mul(axis,.045*lift+(pose.shoulderLift || 0))),mul(depth,.022*reach));
      ret['clavicle'+suffix]=[clavicle,sh];
      ret['upperArm' + suffix] = [sh, pose.elbows[sideIndex]];
      ret['lowerArm' + suffix] = [pose.elbows[sideIndex], pose.wrists[sideIndex]];
      ret['upperLeg' + suffix] = [pose.hips[sideIndex], pose.knees[sideIndex]];
      ret['lowerLeg' + suffix] = [pose.knees[sideIndex], pose.ankles[sideIndex]];
      ret['foot' + suffix] = [pose.ankles[sideIndex], vec(pose.feet[sideIndex], mul(norm(dirs[sideIndex]), .17))];
    }
    return ret;
  }
  function buildRig(pose,id=pose.type) {
    const targets=targetBones(pose), cpu=[];
    const rotations={};
    // Segment axes from the animated vertebral landmarks carry thoracic flexion.
    // Transport each arm with the rib cage before applying flexion. This gives
    // lying and standing poses the same anatomical elbow and forearm axes.
    const back=data.bones[boneNameIndex.spineUpper], chest=targets.spineUpper;
    const torsoRotation=rotationRows(sub(back.end,back.start),sub(chest[1],chest[0]));
    for (const [side,suffix,si] of [['l','Left',1],['r','Right',0]]) {
      const upper='upperArm'+suffix, lower='lowerArm'+suffix, clav='clavicle'+suffix;
      const hinge='elbow'+suffix, twist='forearmTwist'+suffix;
      const restUpper=data.bones[boneNameIndex[upper]], restLower=data.bones[boneNameIndex[lower]];
      const ru=sub(restUpper.end,restUpper.start), rl=sub(restLower.end,restLower.start);
      const tu=sub(targets[upper][1],targets[upper][0]), tl=sub(targets[lower][1],targets[lower][0]);
      const armRotation=followTwist(swing(torsoRotation,ru,tu),norm(rl),tu,norm(tl),.85);
      rotations[upper]=armRotation;
      const cap='shoulderCap'+suffix, bindArm=applyRows(torsoRotation,ru), capAxis=cross(bindArm,tu);
      const pitch=Math.atan2(Math.hypot(...capAxis),dot(bindArm,tu));
      rotations[cap]=Math.hypot(...capAxis)>1e-7?compose(axisRotation(capAxis,.53*pitch),torsoRotation):torsoRotation;
      targets[cap]=[targets[upper][0],vec(targets[upper][0],mul(norm(applyRows(rotations[cap],ru)),Math.hypot(...tu)))];
      const lowerRot=swing(armRotation,rl,tl);
      rotations[lower]=lowerRot;
      const foreParent=applyRows(armRotation,rl), hingeAxis=cross(foreParent,tl);
      const bend=Math.atan2(Math.hypot(...hingeAxis),dot(foreParent,tl));
      rotations[hinge]=Math.hypot(...hingeAxis)>1e-7?compose(axisRotation(hingeAxis,.52*bend),armRotation):armRotation;
      targets[hinge]=[targets[lower][0],vec(targets[lower][0],mul(norm(applyRows(rotations[hinge],rl)),Math.hypot(...tl)))];
      targets[twist]=targets[lower];
      const handFrame=window.AtlasHands?.frame?.(pose,id,si);
      const radial=sub(data.landmarks['joint-'+side+'-finger-2-1'],data.landmarks['joint-'+side+'-finger-5-1']);
      rotations[twist]=handFrame?followTwist(lowerRot,radial,tl,handFrame.lateral,.90):lowerRot;
      const cl=data.bones[boneNameIndex[clav]];
      rotations[clav]=swing(torsoRotation,sub(cl.end,cl.start),sub(targets[clav][1],targets[clav][0]));
    }
    for(const bone of data.bones){
      const [toA,toB]=targets[bone.name] || [bone.start,bone.end];
      const restVec=sub(bone.end,bone.start), targetVec=sub(toB,toA);
      const rotation=rotations[bone.name] || rotationRows(restVec,targetVec);
      const ratio=clamp(Math.hypot(...targetVec)/(Math.hypot(...restVec)||1),.58,2.25);
      const lin=linearForBone(restVec,rotation,ratio), invN=linearForBone(restVec,rotation,1/ratio);
      const translation=sub(toA,applyRows(lin,bone.start));
      cpu.push({lin,invN,translation});
    }
    return {cpu,targets};
  }
  function updateHands(pose, id, rig) {
    return window.AtlasHands?.update?.(pose, id, rig, positions, normalsI8, joints, weights, data) || null;
  }
  function skinnedVertices(rig, offset = 0) {
    const outPos = new Float32Array(vertexCount * 3), outNorm = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      const p = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
      const n = norm([normalsI8[i * 3] / 127, normalsI8[i * 3 + 1] / 127, normalsI8[i * 3 + 2] / 127]);
      const v = [0, 0, 0], nv = [0, 0, 0];
      for (let k = 0; k < 4; k++) {
        const influence = joints[i * 4 + k], w = weights[i * 4 + k] / 255;
        if (!w) continue;
        const b = rig.cpu[influence], moved = vec(applyRows(b.lin, p), b.translation), movedN = applyRows(b.invN, n);
        v[0] += moved[0] * w; v[1] += moved[1] * w; v[2] += moved[2] * w;
        nv[0] += movedN[0] * w; nv[1] += movedN[1] * w; nv[2] += movedN[2] * w;
      }
      const nn = norm(nv), j = i * 3;
      outPos[j] = v[0] + nn[0] * offset; outPos[j + 1] = v[1] + nn[1] * offset; outPos[j + 2] = v[2] + nn[2] * offset;
      outNorm[j] = nn[0]; outNorm[j + 1] = nn[1]; outNorm[j + 2] = nn[2];
    }
    return { positions: outPos, normals: outNorm };
  }

  const colors = {
    skin: [.84, .845, .835], shirt: [.055, .13, .16], shirtTrim: [.94, .32, .22],
    shorts: [.48, .50, .49], shortsTrim: [.58, .60, .59], shoes: [.83, .84, .79], trainerUpper: [.52, .54, .53], trainerSole: [.34, .36, .35], trainerTrim: [.72, .74, .73],
    eyes: [.78, .785, .775], pupils: [.055, .06, .055], hairScalp: [.065, .075, .078], hairCap: [.065, .075, .078], hairBun: [.065, .075, .078],
    chest: [1, .29, .19], core: [1, .34, .22], back: [1, .30, .19], traps: [1, .30, .19], lowerBack: [1, .31, .20], shoulders: [1, .31, .19],
    biceps: [1, .32, .20], triceps: [1, .31, .20], quads: [1, .31, .19], hamstrings: [1, .33, .20], glutes: [1, .29, .18], calves: [1, .34, .20]
  };
  function activeGroups(id, highlight) {
    if (!highlight) return [];
    const ex = window.EXERCISES?.find(item => item.id === id), muscles = (ex?.muscles || []).join(' ').toLowerCase();
    if (Array.isArray(ex?.highlightGroups)) {
      const aliases = {
        pec: 'chest', pecs: 'chest', chest: 'chest', abs: 'core', abdominal: 'core', abdominals: 'core', core: 'core',
        back: 'back', lats: 'back', traps: 'traps', trapezius: 'traps', lowerback: 'lowerBack', 'lower-back': 'lowerBack',
        shoulder: 'shoulders', shoulders: 'shoulders', deltoid: 'shoulders', deltoids: 'shoulders',
        bicep: 'biceps', biceps: 'biceps', tricep: 'triceps', triceps: 'triceps', quads: 'quads', quadriceps: 'quads',
        hamstring: 'hamstrings', hamstrings: 'hamstrings', glute: 'glutes', glutes: 'glutes', calf: 'calves', calves: 'calves'
      };
      return [...new Set(ex.highlightGroups.map(group => {
        const key = String(group).replace(/\s+/g, ''), normalized = key.toLowerCase();
        return aliases[normalized] || aliases[key];
      }).filter(Boolean))];
    }
    const byId = {
      rdl: ['hamstrings', 'glutes'], squat: ['quads'],
      pushup: ['chest','triceps'], row: ['back'],
      overhead: ['shoulders'], plank: ['core'], curl: ['biceps'],
      lunge: ['quads'], lateral: ['shoulders'],
      bridge: ['glutes'], calf: ['calves'], bench: ['chest', 'triceps'],
      shrug: ['traps'], superman: ['lowerBack']
    };
    if (byId[id]) return byId[id];
    const groups = new Set();
    const add = (group, pattern) => { if (pattern.test(muscles)) groups.add(group); };
    add('hamstrings', /腘绳|大腿后|hamstring/); add('glutes', /臀|glute/); add('back', /竖脊|背阔|菱形|斜方|背部|back|lat/);
    add('quads', /股四|大腿前|quad/); add('chest', /胸|chest|pectoral/); add('triceps', /三头|tricep/);
    add('shoulders', /三角肌|冈上|肩|shoulder|deltoid/); add('core', /核心|腹|core|ab/); add('biceps', /二头|肱肌|弯举|bicep/); add('calves', /腓肠|比目鱼|小腿|calf/);
    // Keep list data authoritative when a muscle group has no matching localized label.
    return [...groups];
  }

  const tissueRegions=new Set(['shoulders','biceps','triceps','chest','back','traps','lowerBack']);
  const skinMarks=new Map();
  function surfaceMask(active){
    const keys=active.filter(k=>tissueRegions.has(k)), key=keys.join('|');
    if(!skinMarks.has(key)){
      const mask=new Uint8Array(vertexCount);
      for(const group of keys)for(const i of indices[group] || [])mask[i]=255;
      if(keys.includes('shoulders')){
        // Connect the anterior, lateral and posterior heads to their shared
        // insertion on the outer upper arm, on the underlying body topology.
        for(const side of ['l','r']){
          const a=data.landmarks['joint-'+side+'-shoulder'],b=data.landmarks['joint-'+side+'-elbow'];
          const sign=side==='l'?1:-1, axis=norm(sub(b,a)), outer=norm(reject([sign,0,0],axis));
          for(let i=0;i<vertexCount;i++){
            const x=positions[i*3]*sign,y=positions[i*3+1];if(x<.145||x>.354||y<1.26||y>1.56)continue;
            const offset=[positions[3*i]-a[0],y-a[1],positions[3*i+2]-a[2]];
            const along=dot(offset,axis), depth=dot(offset,outer),front=Math.abs(offset[2]);
            const length=.131+.032*sm(.005,.067,depth)-.018*sm(.04,.10,front);
            const radial=Math.hypot(...reject(offset,axis));
            const cap=sm(-.073,-.025,along)*(1-sm(length-.041,length,along))*sm(-.039,.021,depth)*(1-sm(.094,.136,radial));
            mask[i]=Math.max(mask[i],Math.round(255*cap));
          }
        }
      }
      skinMarks.set(key,mask);
    }
    return skinMarks.get(key);
  }
  // Blending bone normals alone misses the curvature of the deltoid and of
  // the folding elbow. Accumulate the normals of the actual posed body faces.
  function prepareArmSurface(){
    const coverage=new Float32Array(vertexCount), vertices=new Set(), faces=[];
    for(let i=0;i<vertexCount;i++){
      const x=Math.abs(positions[3*i]), y=positions[3*i+1];
      coverage[i]=sm(.105,.206,x)*sm(1.10,1.19,y)*(1-sm(1.51,1.59,y))*(1-sm(.461,.515,x));
    }
    for(let i=0;i<indices.body.length;i+=3){
      const a=indices.body[i],b=indices.body[i+1],c=indices.body[i+2];
      if(coverage[a]+coverage[b]+coverage[c]===0)continue;
      faces.push(a,b,c);vertices.add(a);vertices.add(b);vertices.add(c);
    }
    return {coverage,vertices:Uint16Array.from(vertices),faces:Uint16Array.from(faces),
      points:new Float32Array(3*vertexCount), sums:new Float32Array(3*vertexCount), packed:new Int8Array(4*vertexCount)};
  }
  let armSurface;
  function armNormals(rig,skinned){
    const table=armSurface ||= prepareArmSurface();
    const {vertices,coverage,faces,sums,packed}=table,pts=skinned?.positions || table.points;
    if(!skinned)for(const i of vertices){
      const off=i*3,x=positions[off],y=positions[off+1],z=positions[off+2];
      let u=0,v=0,t=0;
      for(let k=0;k<4;k++){
        const j=i*4+k,w=weights[j]/255;if(!w)continue;
        const b=rig.cpu[joints[j]],m=b.lin,h=b.translation;
        u+=w*(m[0][0]*x+m[0][1]*y+m[0][2]*z+h[0]);
        v+=w*(m[1][0]*x+m[1][1]*y+m[1][2]*z+h[1]);
        t+=w*(m[2][0]*x+m[2][1]*y+m[2][2]*z+h[2]);
      }
      pts[off]=u;pts[off+1]=v;pts[off+2]=t;
    }
    sums.fill(0);
    for(let j=0;j<faces.length;j+=3){
      const a=3*faces[j],b=3*faces[j+1],c=3*faces[j+2];
      const ux=pts[b]-pts[a],uy=pts[b+1]-pts[a+1],uz=pts[b+2]-pts[a+2];
      const vx=pts[c]-pts[a],vy=pts[c+1]-pts[a+1],vz=pts[c+2]-pts[a+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      for(let k=j;k<j+3;k++){const off=faces[k]*3;sums[off]+=nx;sums[off+1]+=ny;sums[off+2]+=nz}
    }
    for(const i of vertices){
      const q=i*3,h=i*4,amp=Math.hypot(sums[q],sums[q+1],sums[q+2]);
      const w=amp>.000001?.86*coverage[i]:0;
      packed[h+3]=Math.round(w*127);
      for(let k=0;k<3;k++){
        const n=amp>.0000001?sums[q+k]/amp:0;
        packed[h+k]=Math.round(127*n);
        if(skinned)skinned.normals[q+k]+=(n-skinned.normals[q+k])*w;
      }
    }
    return packed;
  }
  let raisedShoulderMarks;
  function posedSurfaceMask(active,pose,rig,skinned){
    const base=surfaceMask(active);
    if(!active.includes('shoulders'))return base;
    const bodyUp=norm(pose.torso.axis),sideAxis=pose.torso.right;
    const sides=['Right','Left'].map((suffix,index)=>{
      const [a,b]=rig.targets['upperArm'+suffix],axis=norm(sub(b,a));
      return {a,axis,outer:norm(reject(mul(sideAxis,index?1:-1),axis)),raised:sm(-.07,.80,dot(axis,bodyUp))};
    });
    if(sides.every(side=>side.raised===0))return base;
    raisedShoulderMarks ||= new Uint8Array(vertexCount);raisedShoulderMarks.set(base);
    const pts=skinned || armSurface.points;
    for(const i of armSurface.vertices){
      const j=i*3,x=positions[j],y=positions[j+1];
      if(Math.abs(x)<.13||y<1.25||y>1.56)continue;
      const {a,axis,outer,raised}=sides[x>0?1:0];
      if(!raised)continue;
      const dx=pts[j]-a[0],dy=pts[j+1]-a[1],dz=pts[j+2]-a[2];
      const along=dx*axis[0]+dy*axis[1]+dz*axis[2],lateral=dx*outer[0]+dy*outer[1]+dz*outer[2];
      const dist=Math.sqrt(Math.max(0,dx*dx+dy*dy+dz*dz-along*along));
      // The deltoid wraps the raised humeral head, tapering toward the lateral
      // insertion. The correction keeps the exposed anterior head visible.
      const end=.10+.068*sm(-.026,.073,lateral);
      const head=raised*sm(-.051,.005,along)*(1-sm(end-.036,end,along))*sm(-.045,.005,lateral)*(1-sm(.112,.148,dist));
      raisedShoulderMarks[i]=Math.max(base[i],Math.round(255*head));
    }
    return raisedShoulderMarks;
  }
  const vertexShader = `
    attribute vec4 aArmNormal; attribute float aMark; varying float vMark; attribute vec3 aSurface; varying vec3 vAtlas; attribute vec3 aPosition; attribute vec3 aNormal; attribute vec4 aJoints; attribute vec4 aWeights;
    uniform vec4 uRows[${3*data.boneCount}]; uniform mat3 uCamera;
    uniform vec3 uFocus; uniform vec2 uScale,uCenter; uniform float uOffset;
    varying vec3 vWorld; varying vec3 vNormal; varying vec3 vRest;
    void main(){
      vec3 p=aPosition+aNormal*uOffset; vec4 world=vec4(0.0); vec3 n=vec3(0.0);
      for(int i=0;i<4;i++){
        float w=aWeights[i]; int j=int(aJoints[i]+0.5);
        int k=j*3; vec4 r0=uRows[k], r1=uRows[k+1], r2=uRows[k+2]; vec4 local=vec4(p,1.);
        world.xyz+=vec3(dot(r0,local),dot(r1,local),dot(r2,local))*w;
        vec3 c0=cross(r1.xyz,r2.xyz),c1=cross(r2.xyz,r0.xyz),c2=cross(r0.xyz,r1.xyz);
        n+=vec3(dot(c0,aNormal),dot(c1,aNormal),dot(c2,aNormal))*(w/max(.0001,dot(r0.xyz,c0)));
      }
      vMark=aMark; vAtlas=aSurface; vWorld=world.xyz; vNormal=normalize(mix(normalize(n),aArmNormal.xyz,aArmNormal.w)); vRest=aPosition;
      vec3 v=uCamera*(world.xyz-uFocus);
      gl_Position=vec4(v.xy*uScale,-v.z/5.3,1.0-v.z/12.8);gl_Position.xy+=uCenter*gl_Position.w;
    }`;
  const fragmentShader = `
    precision highp float;
    uniform vec3 uColor,uEye,uZones; uniform float uAlpha,uKind,uReady,uCore;
    uniform sampler2D uSheet,uTissue;
    varying vec3 vWorld,vNormal,vRest,vAtlas; varying float vMark;
    float ellipse(vec2 p){return 1.-dot(p,p);}
    void main(){
      vec3 n=normalize(vNormal),eye=normalize(uEye-vWorld);
      vec3 key=normalize(vec3(-.45,.86,.42)),fill=normalize(vec3(.54,.42,-.7));
      float side=smoothstep(.28,.72,vAtlas.z);
      float a=mix(texture2D(uSheet,vAtlas.xy+vec2(.5,0.)).r,texture2D(uSheet,vAtlas.xy).r,side);
      float soft=.5+.5*dot(n,key),rim=max(0.,dot(n,fill)),face=max(0.,dot(n,eye));
      float studio=.48+.48*soft*soft+.12*rim+.11*face+.05*(n.y+.45);
      float sheen=pow(max(dot(n,normalize(key+eye)),0.),24.);
      vec3 lit=uColor*studio+.07*sheen;
      if(uKind>0.5&&uKind<3.5){
        float texel=uKind<1.5?clamp(a,.32,.93):uKind<2.5?clamp(a,.17,.51):clamp(a,.21,.75);
        if(uKind>1.5&&uKind<2.5)texel=.22+.52*texel;
        vec3 pigment=vec3(texel*1.015,texel*1.009,texel*.993);
        lit=mix(lit,pigment*(.78+.24*soft+.085*face+.07*rim)+.035*sheen,uReady*(uKind<2.5?.94:.78));
      }
      float x=abs(vRest.x),y=vRest.y,z=vRest.z;
      // The front/back reference has baked studio shadows. The rotating limbs
      // need light from their current normals, especially along the inside arm.
      float arm=smoothstep(.134,.215,x)*smoothstep(.87,1.12,y);
      if(uKind==1.&&arm>0.){
        vec3 clay=vec3(.76,.764,.755)*(.56+.42*soft+.10*rim+.08*face);
        float relief=mix(.94,1.035,smoothstep(.18,.86,a));
        lit=mix(lit,clay*relief+.024*sheen,arm);
      }
      float glute=ellipse(vec2((x-.094-.08*(y-.94))/.111,(y-.932-.25*(x-.102))/.119));
      glute=min(glute,min((.044-z)/.035,(x-.005)/.011));
      float t=(.962-y)/.44, cx=.113+.045*t,cz=-.004+.036*t,dx=x-cx;
      float hm=ellipse(vec2((dx+.020+.008*t)/(.057-.020*clamp(t,0.,1.)),(t-.535)/.439));
      float hl=ellipse(vec2((dx-.032+.012*t)/(.049-.017*clamp(t,0.,1.)),(t-.537)/.446));
      float ham=min(max(hm,hl),(cz+.013-z)/.036);
      float quad=min(ellipse(vec2(dx/(.098-.034*clamp(t,0.,1.)),(t-.47)/.46)),(z-cz+.009)/.032);
      vec3 ant=texture2D(uTissue,vAtlas.xy).rgb,post=texture2D(uTissue,vAtlas.xy+vec2(.5,0.)).rgb;
      vec3 chart=mix(post,ant,side);
      float tone=dot(chart,vec3(.30,.55,.15));
      float backChrom=smoothstep(.055,.22,post.r-post.b);
      float frontChrom=smoothstep(.055,.22,ant.r-ant.b);
      float tail=1.-smoothstep(.80,.895,y+.22*(x-.12)),rear=1.-smoothstep(.39,.66,vAtlas.z);
      float posterior=backChrom*rear*max(uZones.x*(1.-tail),uZones.y*tail)*smoothstep(.49,.58,y)*(1.-smoothstep(1.02,1.08,y));
      float anterior=frontChrom*side*uZones.z*smoothstep(.49,.58,y)*(1.-smoothstep(.866,.94,y));
      float legacy=max(max(uZones.x*smoothstep(-.018,.012,glute),uZones.y*smoothstep(-.02,.012,ham)),uZones.z*smoothstep(-.02,.012,quad));
      float abdominal=uCore*frontChrom*smoothstep(.22,.61,vAtlas.z)*smoothstep(1.015,1.055,y)*(1.-smoothstep(1.265,1.325,y))*(1.-smoothstep(.146,.20,x));
      float upper=smoothstep(.28,.76,vMark); float span=max(upper,max(abdominal,max(posterior,anterior)));
      if(uKind>=3.5 || ((uKind==1.||uKind==2.)&&span>.001)){
        float anatomy=a>.46?clamp(.80+.34*a,.94,1.13):1.;
        float d=glute>.0&&uZones.x>.5?(x+.60*(y-.92)+.39*z+.40*(y-.92)*(y-.92)):(x+.08*sin(y*12.)+.16*z+.028*sin(15.*x+4.*y));
        float grain=.55*sin(880.*d)+.25*sin(1330.*d+.7)+.20*sin(530.*d);
        float tendon=1.-.13*exp(-pow((dx-.004+.016*t)/.009,2.))*smoothstep(.28,.74,t);
        vec3 fiber=vec3(.98,.495,.335)*(.49+.41*soft+.13*rim+.11*face+.034*grain)*anatomy;
        fiber*=uZones.y>.5&&ham>.0?tendon:1.;
        vec3 texChart=(uKind>=3.5||upper>.001)?chart:posterior>anterior?post:ant;
        float ink=smoothstep(.055,.23,texChart.r-texChart.b);
        float value=clamp(dot(texChart,vec3(.34,.52,.14)),.30,.86);
        vec3 rubbed=vec3(.98,.52,.345)*(.47+.75*value);
        vec3 tinted=mix(rubbed,texChart,ink);
        vec3 muscle=tinted*(.80+.21*soft+.05*face+.035*rim)+.037*sheen;
        lit=mix(lit,mix(fiber,muscle,.94),uKind>=3.5?1.:span);
      }
      gl_FragColor=vec4(lit,uAlpha);
    }`;
  const contexts = new WeakMap();
  function compile(gl, type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); }
    return shader;
  }
  function boot(gl) {
    const vs = compile(gl, gl.VERTEX_SHADER, vertexShader), fs = compile(gl, gl.FRAGMENT_SHADER, fragmentShader), program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const attributes = Object.fromEntries(['aPosition', 'aNormal', 'aJoints', 'aWeights','aSurface','aMark','aArmNormal'].map(name => [name, gl.getAttribLocation(program, name)]));
    const uniforms = Object.fromEntries(['uRows[0]', 'uCamera', 'uFocus', 'uScale','uCenter', 'uOffset', 'uColor', 'uEye', 'uAlpha','uSheet','uTissue','uZones','uReady','uKind','uCore'].map(name => [name, gl.getUniformLocation(program, name)]));
    const makeBuffer = (target, array) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, array, gl.STATIC_DRAW); return b; };
    const buffers = {
      armNormals:makeBuffer(gl.ARRAY_BUFFER,new Int8Array(vertexCount*4)), marks:makeBuffer(gl.ARRAY_BUFFER,new Uint8Array(vertexCount)), surface:makeBuffer(gl.ARRAY_BUFFER,atlasCoords), positions: makeBuffer(gl.ARRAY_BUFFER, positions), normals: makeBuffer(gl.ARRAY_BUFFER, normalsI8),
      joints: makeBuffer(gl.ARRAY_BUFFER, joints), weights: makeBuffer(gl.ARRAY_BUFFER, weights), groups: {}
    };
    for (const [name, array] of Object.entries(indices)) buffers.groups[name] = makeBuffer(gl.ELEMENT_ARRAY_BUFFER, array);
    return { gl, program, sheet:gl.createTexture(), tissue:gl.createTexture(), populated:false, shaders: [vs, fs], attributes, uniforms, buffers };
  }
  function draw(gl, pose, id, highlight, view) {
    let state = contexts.get(gl);
    if (!state) { state = boot(gl); contexts.set(gl, state); }
    const rig = buildRig(pose,id), handRange = updateHands(pose, id, rig), { attributes: a, uniforms: u, buffers: b, program } = state;
    const attrState = Object.values(a).map(index => ({ index, enabled: gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_ENABLED), buffer: gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING), size: gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_SIZE), type: gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_TYPE), normalized: gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED), stride: gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_STRIDE), offset: gl.getVertexAttribOffset(index, gl.VERTEX_ATTRIB_ARRAY_POINTER) }));
    const previous = {
      program: gl.getParameter(gl.CURRENT_PROGRAM), array: gl.getParameter(gl.ARRAY_BUFFER_BINDING), element: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
      blend: gl.isEnabled(gl.BLEND), cull: gl.isEnabled(gl.CULL_FACE), depth: gl.isEnabled(gl.DEPTH_TEST), depthMask: gl.getParameter(gl.DEPTH_WRITEMASK), depthFunc: gl.getParameter(gl.DEPTH_FUNC),
      blendSrcRGB: gl.getParameter(gl.BLEND_SRC_RGB), blendDstRGB: gl.getParameter(gl.BLEND_DST_RGB), blendSrcAlpha: gl.getParameter(gl.BLEND_SRC_ALPHA), blendDstAlpha: gl.getParameter(gl.BLEND_DST_ALPHA)
    };
    try {
      gl.useProgram(program);
      const assets=[[gl.TEXTURE0,state.sheet,plate],[gl.TEXTURE1,state.tissue,tissuePlate]];
      for(const [unit,texture,img] of assets){
        gl.activeTexture(unit);gl.bindTexture(gl.TEXTURE_2D,texture);
        if(!state.populated){
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          if(img.naturalWidth)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);
          else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([176,176,176]));
        }
      }
      state.populated=!!(plate.naturalWidth&&tissuePlate.naturalWidth);
      gl.activeTexture(gl.TEXTURE0);gl.uniform1i(u.uSheet,0);gl.uniform1i(u.uTissue,1);gl.uniform1f(u.uReady,state.populated?1:0);
      const active=activeGroups(id,highlight), posedNormals=armNormals(rig);
      const mask=posedSurfaceMask(active,pose,rig);
      if(mask!==state.mask||mask===raisedShoulderMarks){gl.bindBuffer(gl.ARRAY_BUFFER,b.marks);gl.bufferSubData(gl.ARRAY_BUFFER,0,mask);state.mask=mask}
      gl.uniform1f(u.uCore,active.includes('core')?1:0);
      gl.uniform3f(u.uZones,...['glutes','hamstrings','quads'].map(k=>Number(active.includes(k))));
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform4fv(u['uRows[0]'],new Float32Array(rig.cpu.flatMap(bone=>bone.lin.flatMap((r,k)=>[...r,bone.translation[k]]))));
      gl.uniformMatrix3fv(u.uCamera, false, view.camera); gl.uniform3fv(u.uFocus, view.focus); gl.uniform2fv(u.uScale, view.scale);gl.uniform2fv(u.uCenter,view.center||[0,0]); gl.uniform3fv(u.uEye, view.eye);
      if (handRange && Number.isInteger(handRange.first) && Number.isInteger(handRange.last) && handRange.last >= handRange.first) {
        const first = handRange.first, count = handRange.last - first + 1;
        gl.bindBuffer(gl.ARRAY_BUFFER, b.positions);
        gl.bufferSubData(gl.ARRAY_BUFFER, first * 12, positions.subarray(first * 3, (first + count) * 3));
        gl.bindBuffer(gl.ARRAY_BUFFER, b.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, first * 3, normalsI8.subarray(first * 3, (first + count) * 3));
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,b.armNormals);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,posedNormals);
      const bind = (name, size, type, normalized, stride = 0) => { gl.bindBuffer(gl.ARRAY_BUFFER, b[name]); const loc = a[{ positions: 'aPosition', normals: 'aNormal', joints: 'aJoints', weights: 'aWeights',surface:'aSurface',marks:'aMark',armNormals:'aArmNormal' }[name]]; gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, normalized, stride, 0); };
      bind('armNormals',4,gl.BYTE,true);bind('marks',1,gl.UNSIGNED_BYTE,true);bind('surface',3,gl.UNSIGNED_SHORT,true);bind('positions', 3, gl.FLOAT, false); bind('normals', 3, gl.BYTE, true); bind('joints', 4, gl.UNSIGNED_BYTE, false); bind('weights', 4, gl.UNSIGNED_BYTE, true);
      function part(name, color, offset = 0, alpha = 1) {
        const ib = b.groups[name]; if (!ib || !indices[name]?.length) return;
        const kind=name==='eyes'?1:name==='body'?1:name.startsWith('shorts')?2:name.startsWith('trainer')?3:4;
        gl.uniform1f(u.uKind,kind);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.uniform3fv(u.uColor, color); gl.uniform1f(u.uOffset, offset); gl.uniform1f(u.uAlpha, alpha);
        gl.drawElements(gl.TRIANGLES, indices[name].length, gl.UNSIGNED_SHORT, 0);
      }
      part('body', colors.skin);
      part('shorts', colors.shorts, .006); part('shortsTrim', colors.shortsTrim, .008);
      part('trainerSole', colors.trainerSole, .001); part('trainerUpper', colors.trainerUpper, .002); part('trainerTrim', colors.trainerTrim, .003);
      part('eyes', colors.skin, .001);
      for (const group of active) if(!tissueRegions.has(group)&&!['glutes','hamstrings','quads'].includes(group))part(group, colors[group], .004, 1);
    } finally {
      for (const item of attrState) {
        if (item.buffer) { gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer); gl.vertexAttribPointer(item.index, item.size, item.type, item.normalized, item.stride, item.offset); }
        if (item.enabled) gl.enableVertexAttribArray(item.index); else gl.disableVertexAttribArray(item.index);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, previous.array); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, previous.element); gl.useProgram(previous.program);
      (previous.blend ? gl.enable : gl.disable).call(gl, gl.BLEND); (previous.cull ? gl.enable : gl.disable).call(gl, gl.CULL_FACE); (previous.depth ? gl.enable : gl.disable).call(gl, gl.DEPTH_TEST);
      gl.depthMask(previous.depthMask); gl.depthFunc(previous.depthFunc); gl.blendFuncSeparate(previous.blendSrcRGB, previous.blendDstRGB, previous.blendSrcAlpha, previous.blendDstAlpha);
    }
  }

  const cssColors = {
    skin: '#d6d7d5', shirt: '#0e2129', shirtTrim: '#ef5239', shorts: '#7a807e', shortsTrim: '#949a98', shoes: '#d3d6c9', trainerUpper: '#858b89', trainerSole: '#555b59', trainerTrim: '#b0b6b4',
    eyes: '#b3b8b6', pupils: '#111111', hairScalp: '#121719', hairCap: '#121719', hairBun: '#121719', chest: '#ff4d34', core: '#ff5a3b', back: '#ff4e36', traps: '#ff4e36', lowerBack: '#ff5238', shoulders: '#ff5138',
    biceps: '#ff5238', triceps: '#ff5138', quads: '#ff5035', hamstrings: '#ff5539', glutes: '#ff4d33', calves: '#ff583d'
  };
  const light = norm([-.43, .81, .42]);
  function shadedCss(hex, normal) {
    const n = norm(normal), factor = .61 + .36 * Math.max(0, dot(n, light)) + .07 * Math.max(0, dot(n, norm([.64, .37, -.70])));
    const value = hex.match(/[a-f\d]{2}/gi).map(x => Math.round(clamp(parseInt(x, 16) * factor, 0, 255)));
    return `rgb(${value[0]},${value[1]},${value[2]})`;
  }
  const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
  let muscleSwatch;
  function muscleSamples(){
    if(muscleSwatch)return muscleSwatch;if(!tissuePlate.naturalWidth)return null;
    const c=document.createElement('canvas');c.width=tissuePlate.naturalWidth;c.height=tissuePlate.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(tissuePlate,0,0);
    const rgb=ctx.getImageData(0,0,c.width,c.height).data, out=new Float32Array(vertexCount*6);
    for(let i=0;i<vertexCount;i++){
      const xx=clamp(Math.round(c.width*atlasCoords[3*i]/65535),0,(c.width>>1)-1),
        yy=clamp(Math.round(c.height*atlasCoords[3*i+1]/65535),0,c.height-1),f=4*(yy*c.width+xx),b=f+4*(c.width>>1);
      for(let k=0;k<3;k++){out[i*6+k]=rgb[f+k]/255;out[i*6+3+k]=rgb[b+k]/255}
    }
    return muscleSwatch=out;
  }
  let cpuLook={};
  function pigments(id,highlight){
    const mat=muscleSamples();if(!mat)return null;const key=id+'|'+highlight;
    if(cpuLook[key])return cpuLook[key];
    const active=activeGroups(id,highlight),glute=+active.includes('glutes'),ham=+active.includes('hamstrings'),quad=+active.includes('quads');
    const shades=new Float32Array(vertexCount*7);
    for(let i=0;i<vertexCount;i++){
      const i6=i*6,i7=i*7,sideZ=atlasCoords[3*i+2]/65535,side=sm(.28,.72,sideZ),
        y=positions[i*3+1],x=Math.abs(positions[i*3]),tail=1-sm(.8,.895,y+.22*(x-.12)),
        post=sm(.055,.22,mat[i6+3]-mat[i6+5])*(1-sm(.39,.66,sideZ))*Math.max(glute*(1-tail),ham*tail)*sm(.49,.58,y)*(1-sm(1.02,1.08,y)),
        front=sm(.055,.22,mat[i6]-mat[i6+2])*side*quad*sm(.49,.58,y)*(1-sm(.866,.94,y));
      const chart=[0,1,2].map(k=>mat[i6+k+3]*(1-side)+mat[i6+k]*side),ink=sm(.055,.23,chart[0]-chart[2]);
      const val=.47+.75*clamp(dot(chart,[.34,.52,.14]),.30,.86);
      for(let k=0;k<3;k++){
        shades[i7+k]=[.98,.52,.345][k]*val*(1-ink)+chart[k]*ink;
        shades[i7+3+k]=mat[i6+k+(post>front?3:0)];
      }
      shades[i7+6]=Math.max(post,front);
    }
    cpuLook={};return cpuLook[key]=shades;
  }
  function triangles(pose, id, highlight, view, emitTriangle) {
    const rig = buildRig(pose,id); updateHands(pose, id, rig);
    const skinned = skinnedVertices(rig); armNormals(rig,skinned);
    const atlas=plate.naturalWidth?(data._grayAtlas ||= Float32Array.from({length:vertexCount},(_,i)=>sampleAtlas(i))):null;
    const pigment=pigments(id,highlight), marks=posedSurfaceMask(activeGroups(id,highlight),pose,rig,skinned.positions);const groups = [['body', 0]];
    for (const name of ['shorts', 'shortsTrim', 'trainerSole', 'trainerUpper', 'trainerTrim', 'eyes']) groups.push([name, name.startsWith('shorts') ? .007 : .002]);
    for (const name of activeGroups(id, highlight)) if(!pigment||!tissueRegions.has(name)&&!['glutes','hamstrings','quads'].includes(name))groups.push([name, .004]);
    for (const [name, offset] of groups) {
      const list = indices[name]; if (!list?.length) continue;
      const color = data.groupOrder.includes(name) ? '#f67b50' : cssColors[name === 'body' ? 'skin' : name];
      for (let k = 0; k < list.length; k += 3) {
        const ids = [list[k], list[k + 1], list[k + 2]], pts = [], ns = [];
        for (const vertex of ids) {
          const j = vertex * 3;
          const n = [skinned.normals[j], skinned.normals[j + 1], skinned.normals[j + 2]];
          const world = [skinned.positions[j] + n[0] * offset, skinned.positions[j + 1] + n[1] * offset, skinned.positions[j + 2] + n[2] * offset];
          pts.push(view.project(world)); ns.push(n);
        }
        const normal = norm(vec(vec(ns[0], ns[1]), ns[2]));
        const depth = (pts[0].depth + pts[1].depth + pts[2].depth) / 3;
        let tint=shadedCss(color,normal);
        if(atlas&&(name==='body'||name.startsWith('shorts')||name.startsWith('trainer')||name==='eyes')){
          const gray=(atlas[ids[0]]+atlas[ids[1]]+atlas[ids[2]])/3,cloth=name.startsWith('shorts'),shoe=name.startsWith('trainer');
          const pigment=cloth?.22+.52*clamp(gray,.17,.51):clamp(gray,shoe?.21:.32,shoe?.75:.93);
          const g=Math.round(clamp(pigment*(.85+.17*Math.max(0,dot(normal,light)))*255,0,255));tint='rgb('+g+','+g+','+Math.round(g*.989)+')';
        }
        if(name==='body' && atlas){
          const arm=ids.reduce((sum,i)=>sum+sm(.134,.215,Math.abs(positions[3*i]))*sm(.87,1.12,positions[3*i+1]),0)/3;
          if(arm>.001){
            const gray=ids.reduce((sum,i)=>sum+atlas[i],0)/3, soft=.5+.5*dot(normal,light);
            const g=194*(.60+.44*soft+.09*Math.max(0,dot(normal,[.6,.4,-.7])))*(.94+.095*sm(.18,.86,gray));
            const old=tint.match(/\d+/g).map(Number);
            tint='rgb('+old.map((x,k)=>Math.round(x*(1-arm)+g*(k===2?.989:1)*arm)).join(',')+')';
          }
        }
        if(pigment){
          const upper=name==='body'?sm(.28,.76,(marks[ids[0]]+marks[ids[1]]+marks[ids[2]])/765):0;
          const colored=data.groupOrder.includes(name), span=upper || (colored?1:(name==='body'||name.startsWith('shorts'))?(pigment[7*ids[0]+6]+pigment[7*ids[1]+6]+pigment[7*ids[2]+6])/3:0);
          if(span>.01){
            const f=(.86+.20*Math.max(0,dot(normal,light)))*255/3,of=colored||upper?0:3;
            const ground=colored?[0,0,0]:tint.match(/\d+/g).map(Number);
            const out=[0,1,2].map(k=>Math.round(clamp(ground[k]*(1-span)+span*f*(pigment[7*ids[0]+of+k]+pigment[7*ids[1]+of+k]+pigment[7*ids[2]+of+k]),0,255)));
            tint='rgb('+out.join(',')+')';
          }
        }
        emitTriangle(pts[0],pts[1],pts[2],tint,depth);
      }
    }
  }
  function drawCPU(canvas, pose, id, highlight, view) {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const list = [];
    triangles(pose, id, highlight, view, (a, b, c, color, depth) => list.push({ a, b, c, color, depth }));
    list.sort((a, b) => a.depth - b.depth);
    ctx.save();
    ctx.setTransform(view.pixelRatio || 1, 0, 0, view.pixelRatio || 1, 0, 0);
    for (const t of list) { ctx.beginPath(); ctx.moveTo(t.a.x, t.a.y); ctx.lineTo(t.b.x, t.b.y); ctx.lineTo(t.c.x, t.c.y); ctx.closePath(); ctx.fillStyle = t.color; ctx.fill(); }
    ctx.restore();
  }
  function release(gl) {
    const state = contexts.get(gl); if (!state) return;
    const { buffers } = state;
    Object.values(buffers.groups).forEach(buffer => gl.deleteBuffer(buffer));
    for (const key of ['positions', 'normals', 'joints', 'weights','surface','marks','armNormals']) gl.deleteBuffer(buffers[key]);
    gl.deleteTexture(state.sheet);gl.deleteTexture(state.tissue);state.shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(state.program); contexts.delete(gl);
  }
  function coverPoints(pose,id){
    const rig=buildRig(pose,id);updateHands(pose,id,rig);
    const skinned=skinnedVertices(rig).positions,points=[];
    for(let i=0;i<skinned.length;i+=33)points.push([skinned[i],skinned[i+1],skinned[i+2]]);
    return points;
  }
  window.AtlasAthlete = { coverPoints,ready,draw, triangles, drawCPU, release, data: { vertexCount: data.vertexCount, triangleCount: data.indexCounts.body / 3, boneCount: data.boneCount } };
})();
