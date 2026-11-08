/* Equipment, studio camera and drawing order. Both renderers use the same
   world coordinates and projection, including the floating form cue. */
(() => {
  'use strict';
  const contexts = new WeakMap();
  const X=[1,0,0], Y=[0,1,0], Z=[0,0,1];
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const mul=(a,n)=>a.map(x=>x*n);
  const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>mul(a,1/(Math.hypot(...a)||1));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
  function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}

  const coverClouds=new Map();
  function coverCloud(id,p){
    if(coverClouds.has(id))return coverClouds.get(id);
    const pts=window.AtlasAthlete.coverPoints(p,id),items=equipment(id==='squat'?{...p,rack:null}:p,id,true);
    for(const {shape,center,axes,size} of items){
      const vert=geometry[shape].v,n=vert.length/3,step=Math.max(1,Math.floor(n/50));
      for(let i=0;i<n;i+=step){
        const pt=center.slice();for(let j=0;j<3;j++)for(let k=0;k<3;k++)pt[k]+=vert[3*i+j]*size[j]*axes[j][k];
        pts.push(pt);
      }
    }
    coverClouds.set(id,pts);return pts;
  }
  function makeView(canvas,id,o,p) {
    const width=canvas.clientWidth||320, height=canvas.clientHeight||350;
    const pixelRatio=Math.min(devicePixelRatio||1,2);
    const handed=id==='row'?-1:1;
    const yaw=handed*(o.yaw??42)*Math.PI/180, pitch=(o.pitch??9)*Math.PI/180;
    const dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
    const horizontal=[Math.cos(yaw),0,-Math.sin(yaw)],up=cross(dir,horizontal),right=mul(horizontal,handed);
    const floor=Boolean(p.mat);
    const fraction=o.phase??0;
    const inPosition=smooth(.12,.4,fraction)*(1-smooth(.78,.985,fraction));
    const bench=p.bench!=null;
    const targetHeight=floor?1.21:id==='row'||id==='dbrow'?1.78:bench?1.85:id==='overhead'?2.68:2.27;
    const targetY=floor?.41:id==='row'||id==='dbrow'?.74:bench?.78:id==='overhead'?1.07:.93;
    const cameraHeight=lerp(2.32,targetHeight,inPosition);
    const y=lerp(.92,targetY,inPosition);
    const focus=[p.torso.hip[0]*.56,y,p.torso.hip[2]*(floor||bench?.44:.24)];
    const fieldWidth=p.bar?Math.max(1.66,2.53*Math.abs(Math.cos(yaw))+.55*Math.abs(Math.sin(yaw))):
      floor||p.bench?Math.max(1.5,2.45*Math.abs(Math.sin(yaw))+.85*Math.abs(Math.cos(yaw))):
      id==='lateral'?2.22:1.58;
    let pixels=Math.min(height/cameraHeight,width/fieldWidth);
    // During entry, include the body and the stationary equipment beside it.
    // Keep a fixed scale throughout the working rep, except for a safety margin
    // at unusual camera angles or on an especially narrow viewport.
    const bounds=[p.head,...p.feet,...p.wrists,...p.knees,...p.elbows];
    if(p.bar)bounds.push(p.bar.a,p.bar.b);
    for(const pt of bounds){
      const delta=sub(pt,focus),depthFactor=1-dot(delta,dir)/12.8;
      const u=Math.abs(dot(delta,right))/depthFactor, v=Math.abs(dot(delta,up))/depthFactor;
      pixels=Math.min(pixels,width*.46/(u+.063),height*.45/(v+.10));
    }
    let offX=0,offY=0;
    if(o.atCover){
      let left=1e3,rightEdge=-1e3,top=1e3,bottom=-1e3;
      for(const wp of coverCloud(id,p)){
        const d=sub(wp,focus),f=1-dot(d,dir)/12.8,xx=dot(d,right)/f,yy=-dot(d,up)/f;
        left=Math.min(left,xx);rightEdge=Math.max(rightEdge,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);
      }
      pixels=Math.min(width*.85/(rightEdge-left),height*.80/(bottom-top));
      const z=o.zoom??1;
      offX=-(left+rightEdge)*.5*pixels*z;
      offY=-(top+bottom)*.5*pixels*z;
    }
    pixels*=o.zoom??1;
    const camera=new Float32Array([right[0],up[0],dir[0],right[1],up[1],dir[1],right[2],up[2],dir[2]]);
    const scale=[2*pixels/width,2*pixels/height];
    function project(point){
      const delta=sub(point,focus),depth=dot(delta,dir),factor=pixels/(1-depth/12.8);
      return {x:width*.5+offX+dot(delta,right)*factor,y:height*.5+offY-dot(delta,up)*factor,depth};
    }
    return {camera,focus,scale,center:[2*offX/width,-2*offY/height],eye:add(focus,mul(dir,12.8)),project,width,height,pixelRatio,pixels};
  }

  function shapeLibrary() {
    function prism(sides,round) {
      const v=[],n=[],idx=[];
      const profile=round?[[-1,.89],[-.84,1],[.84,1],[1,.89]]:[[-1,1],[1,1]];
      for(let k=0;k<profile.length-1;k++){
        const [y0,r0]=profile[k], [y1,r1]=profile[k+1];
        for(let i=0;i<sides;i++){
          const start=v.length/3,a=2*Math.PI*i/sides,b=2*Math.PI*(i+1)/sides,m=(a+b)/2;
          for(const [angle,y,r] of [[a,y0,r0],[b,y0,r0],[b,y1,r1],[a,y1,r1]]){
            v.push(Math.cos(angle)*r,y,Math.sin(angle)*r);
            const na=sides>8?angle:m;n.push(...unit([Math.cos(na),(r0-r1)/(y1-y0),Math.sin(na)]));
          }
          idx.push(start,start+1,start+2,start,start+2,start+3);
        }
      }
      for(const sign of [-1,1]){
        const start=v.length/3;v.push(0,sign,0);n.push(0,sign,0);
        for(let j=0;j<=sides;j++){
          const a=2*Math.PI*j/sides,r=round?.89:1;
          v.push(r*Math.cos(a),sign,r*Math.sin(a));n.push(0,sign,0);
          if(j)idx.push(start,start+j,start+j+1);
        }
      }
      return {v,n,idx};
    }
    function box(){
      const v=[],n=[],idx=[];
      for(const axis of [X,Y,Z])for(const s of [-1,1]){
        const normal=mul(axis,s),a=axis===Y?X:Y,b=cross(normal,a),start=v.length/3;
        for(const [u,w] of [[-1,-1],[1,-1],[1,1],[-1,1]]){v.push(...add(normal,add(mul(a,u),mul(b,w))));n.push(...normal)}
        idx.push(start,start+1,start+2,start,start+2,start+3);
      }
      return {v,n,idx};
    }
    function weight(low=false){
      // Cast iron plate with a rounded rim, a recessed spoke-free face and
      // raised concentric hub. Local Y is the bar sleeve axis.
      const ringProfile=[
        [-1,.145],[-1,.82],[-.99,.92],[-.94,.976],[-.91,1],
        [-.86,1],[-.84,.96],[-.82,.94],[-.80,.965],
        [-.74,.965],[-.72,.94],[-.70,.94],[-.68,.965],
        [-.62,.965],[-.60,.94],[-.58,.94],[-.56,.965],
        [-.49,.965],[-.43,.86],[-.40,.78],[-.38,.77],
        [-.36,.62],[-.34,.60],[-.32,.52],[-.29,.50],[-.25,.45],
        [-.23,.33],[-.19,.30],[-.14,.30],[-.12,.19],[-.105,.145],
        [.105,.145],[.12,.19],[.14,.30],[.19,.30],[.23,.33],
        [.25,.45],[.29,.50],[.32,.52],[.34,.60],[.36,.62],
        [.38,.77],[.40,.78],[.43,.86],[.49,.965],
        [.56,.965],[.58,.94],[.60,.94],[.62,.965],
        [.68,.965],[.70,.94],[.72,.94],[.74,.965],
        [.80,.965],[.82,.94],[.84,.96],[.86,1],
        [.91,1],[.94,.976],[.99,.92],[1,.82],[1,.145]
      ];
      if(low)ringProfile.splice(0,ringProfile.length,...ringProfile.filter((p,i)=>[0,1,4,9,21,28,30,32,39,52,55,58,ringProfile.length-1].includes(i)));
      const sides=low?18:64,v=[],n=[],idx=[];
      for(let row=0;row<ringProfile.length;row++){
        const [y,r]=ringProfile[row],last=ringProfile[Math.max(0,row-1)],next=ringProfile[Math.min(ringProfile.length-1,row+1)];
        const drdy=(next[1]-last[1])/Math.max(.0001,next[0]-last[0]);
        for(let j=0;j<sides;j++){
          const a=2*Math.PI*j/sides,c=Math.cos(a),z=Math.sin(a);
          v.push(c*r,y,z*r);n.push(...unit([c,-drdy,z]));
          if(row){const lo=(row-1)*sides+j,hi=row*sides+j,off=(j+1)%sides-j;idx.push(lo,hi,hi+off,lo,hi+off,lo+off)}
        }
      }
      // The flattened profile covers each plate face and forms a real center bore.
      return {v,n,idx};
    }
    function bellBody(){
      const v=[],n=[],idx=[],sides=32;
      const outline=[[.60,-.90],[.80,-.86],[.96,-.48],[1,-.08],[.94,.35],[.74,.73],[.47,.95],[.28,1.0]];
      outline.forEach(([radius,y],row)=>{
        const prev=outline[Math.max(row-1,0)],next=outline[Math.min(row+1,outline.length-1)];
        const slope=(prev[0]-next[0])/Math.max(.001,next[1]-prev[1]);
        for(let j=0;j<sides;j++){
          const a=2*Math.PI*j/sides,x=Math.cos(a),z=Math.sin(a);
          v.push(radius*x,y,radius*z);n.push(...unit([x,slope,z]));
          if(row){const lo=(row-1)*sides+j,hi=row*sides+j,off=(j+1)%sides-j;idx.push(lo,hi,hi+off,lo,hi+off,lo+off)}
        }
      });
      for(const row of [0,outline.length-1]){
        const center=v.length/3;v.push(0,outline[row][1],0);n.push(0,row?1:-1,0);
        for(let j=0;j<sides;j++)idx.push(center,row*sides+j,row*sides+(j+1)%sides);
      }
      return {v,n,idx};
    }
    return {box:box(),disk:prism(40,true),hex:prism(6,true),weight:weight(),weightLow:weight(true),bell:bellBody()};
  }
  const geometry=shapeLibrary();
  const charcoal=[.23,.25,.24],iron=[.35,.375,.355],silver=[.69,.71,.69],rubber=[.16,.18,.17];
  function equipment(p,id,visible) {
    const items=[];
    if(!visible)return items;
    function part(shape,center,axes,size,color){items.push({shape,center,axes,size,color})}
    const box=(c,size,col)=>part('box',c,[X,Y,Z],size,col);
    function tube(a,b,r,color,hex=false){
      const axis=unit(sub(b,a)),ref=Math.abs(axis[2])>.96?X:Z;
      const right=unit(cross(axis,ref)),front=cross(right,axis);
      part(hex?'hex':'disk',mix(a,b,.5),[right,axis,front],[r,Math.hypot(...sub(b,a))/2,r],color);
    }
    function orientedDisc(center,axis,radius,halfDepth,color,shape='weight'){
      const ref=Math.abs(axis[2])>.96?X:Z;
      const radial=unit(cross(axis,ref)),tangent=cross(radial,axis);
      part(shape,center,[radial,axis,tangent],[radius,halfDepth,radius],color);
    }
    if(p.mat){
      const mat=[.53,.62,.54],edge=[.45,.53,.46],line=[.67,.73,.65];
      box([0,.005,0],[.405,.005,1.125],edge);
      box([0,.0105,0],[.40,.001,1.12],mat);
      for(const z of [-1.045,1.045])box([0,.0117,z],[.34,.0003,.003],line);
    }
    if(p.bench){
      const {a,b,width}=p.bench,c=mix(a,b,.5),delta=sub(b,a),len=Math.hypot(delta[0],delta[2]),w=width/2;
      const along=unit([delta[0],0,delta[2]]),across=[along[2],0,-along[0]];
      const block=(center,size,col)=>part('box',center,[across,Y,along],size,col);
      const long=mix(a,b,.375),short=mix(a,b,.881);
      block(add(long,[0,-.03,0]),[w,.03,len*.370],charcoal);
      block(add(short,[0,-.03,0]),[w,.03,len*.114],charcoal);
      block(add(c,[0,-.081,0]),[.031,.026,len*.46],iron);
      for(const t of [.16,.84]){
        const k=mix(a,b,t),h=(k[1]-.1)/2;
        block([k[0],h+.012,k[2]],[.028,h,.029],iron);
        block([k[0],.024,k[2]],[width*.69,.022,.038],charcoal);
        for(const sign of [-1,1])block(add([k[0],.025,k[2]],mul(across,width*.66*sign)),[.017,.024,.046],rubber);
      }
    }
    if(p.rack){
      const {x,y,z,cx=0}=p.rack;
      for(const sign of [-1,1]){
        const xx=cx+sign*x, forward=id==='squat'?-1:1;
        box([xx,.025,z-.08*forward],[.055,.023,.245],rubber);
        box([xx,(y+.10)/2,z-.071*forward],[.025,(y+.10)/2,.024],iron);
        box([xx,y-.031,z],[.029,.015,.087],charcoal);
        box([xx,y-.011,z+.068*forward],[.03,.022,.012],rubber);
      }
    }
    if(p.bar){
      const a=p.bar.a,b=p.bar.b,axis=unit(sub(b,a));
      // The reference uses a bright steel bar with visible, lightly knurled grips.
      tube(a,b,.0145,silver);
      for(const s of [-1,1]){
        const end=s<0?a:b, inward=d=>add(end,mul(axis,-s*d));
        // Olympic sleeve and its smooth outer lip.
        tube(end,inward(.31),.024,silver);
        tube(inward(.018),inward(.035),.034,silver);
        // Thick, black cast plate; the radial groove, beveled rim and center
        // hub are built into the mesh so they catch light at any camera angle.
        orientedDisc(inward(.133),axis,.207,.051,charcoal);
        // Bright inner collar. Ring depth is narrow enough to read as metal.
        tube(inward(.065),inward(.078),.058,silver);
        tube(inward(.188),inward(.199),.052,iron);
        // Fine transverse knurl marks across each hand-width.
        for(let k=0;k<11;k++){
          const d=.345+k*.0115;
          tube(inward(d),inward(d+.0013),.0148,iron);
        }
      }
    }
    for(const [i,center] of (p.dumbbells||[]).entries()){
      const axis=unit(p.dumbbellAxes?.[i] || (id==='row'?Z:X)),pos=d=>add(center,mul(axis,d));
      tube(pos(-.135),pos(.135),.014,silver);
      for(const sign of [-1,1]){
        const face=pos(sign*.145);
        orientedDisc(face,axis,.080,.042,charcoal,'weight');
        // Stainless steel hub caps and slim edge collars make the heads round,
        // metallic and distinct from plain six-sided dark blocks.
        orientedDisc(pos(sign*.188),axis,.026,.0025,silver,'disk');
        tube(pos(sign*.100),pos(sign*.108),.026,iron);
      }
    }
    if(p.kettlebell){
      const {center,handles}=p.kettlebell,r=.11;
      part('bell',center,[X,Y,Z],[r,r,r*.94],charcoal);
      const [a,b]=handles,top=Math.max(a[1],b[1])+.052;
      const path=[
        add(center,[-r*.55,r*.66,0]), a,
        [a[0]+.012,top-.012,a[2]],[a[0]+.032,top,a[2]],
        [b[0]-.032,top,b[2]],[b[0]-.012,top-.012,b[2]], b,
        add(center,[r*.55,r*.66,0])
      ];
      for(let i=1;i<path.length;i++)tube(path[i-1],path[i],.017,iron);
    }
    return items;
  }

  const vertex=`
    attribute vec3 pos,normal;
    uniform mat4 model; uniform mat3 normals,camera;
    uniform vec3 focus; uniform vec2 scale,frameCenter;
    varying vec3 N,W,local;
    void main() {
      vec3 w=(model*vec4(pos,1.)).xyz, v=camera*(w-focus);
      gl_Position=vec4(v.xy*scale,-v.z/5.3,1.-v.z/12.8);gl_Position.xy+=frameCenter*gl_Position.w;
      N=normalize(normals*normal);W=w;local=pos;
    }`;
  const fragment=`
    precision mediump float;
    uniform vec3 color,eye;uniform float shadow,plateFace;
    varying vec3 N,W,local;
    void main() {
      if(shadow>0.){
        float v=clamp(1.-dot(local.xz,local.xz),0.,1.);
        gl_FragColor=vec4(.14,.18,.14,v*v*shadow);return;
      }
      vec3 n=normalize(N), l=normalize(vec3(-.48,.84,.52)), v=normalize(eye-W);
      float key=max(dot(n,l),0.), rim=max(dot(n,normalize(vec3(.64,.37,-.7))),0.);
      float spec=pow(max(dot(n,normalize(l+v)),0.),28.);
      vec3 paint=color*(.63+.38*key+.13*rim)+vec3(.10*spec);
      if(plateFace>.5){
        float r=length(local.xz);
        float bevel=exp(-pow((r-.927)/.011,2.))+.75*exp(-pow((r-.377)/.013,2.));
        float recess=exp(-pow((r-.906)/.014,2.))+.8*exp(-pow((r-.40)/.018,2.));
        float grain=sin(dot(local.xz,vec2(313.,421.)))*.004;
        paint+=vec3(.042*bevel-.053*recess+grain+.036*abs(dot(n,v))+.038*max(0.,n.y));
      }
      gl_FragColor=vec4(paint,1.);
    }`;
  function boot(gl) {
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
    const shaders=[shader(gl.VERTEX_SHADER,vertex),shader(gl.FRAGMENT_SHADER,fragment)];
    const prog=gl.createProgram();for(const s of shaders)gl.attachShader(prog,s);
    gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
    const att=['pos','normal'].map(k=>gl.getAttribLocation(prog,k));
    const u=Object.fromEntries(['model','normals','camera','focus','scale','color','eye','shadow','plateFace','frameCenter'].map(k=>[k,gl.getUniformLocation(prog,k)]));
    const meshes={};
    for(const [name,{v,n,idx}] of Object.entries(geometry)){
      const data=new Float32Array(v.length*2);
      for(let j=0;j<v.length/3;j++){data.set(v.slice(3*j,3*j+3),6*j);data.set(n.slice(3*j,3*j+3),6*j+3)}
      const buffer=gl.createBuffer(),index=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
      meshes[name]={buffer,index,count:idx.length};
    }
    return {gl,prog,shaders,u,meshes,att};
  }
  function gpuDraw(state,view,sample,id,o,items){
    const {gl,u,prog,att,meshes}=state,canvas=gl.canvas;
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);
    gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(prog);
    for(const a of att)gl.enableVertexAttribArray(a);
    gl.uniformMatrix3fv(u.camera,false,view.camera);gl.uniform3fv(u.focus,view.focus);
    gl.uniform2fv(u.scale,view.scale);gl.uniform2fv(u.frameCenter,view.center);gl.uniform3fv(u.eye,view.eye);
    function drawPart({shape,center,axes,size,color}){
      gl.uniform1f(u.plateFace,shape==='weight'?1:0);const m=meshes[shape],cols=axes.map((v,i)=>mul(v,size[i]));
      gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.index);
      gl.vertexAttribPointer(att[0],3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(att[1],3,gl.FLOAT,false,24,12);
      gl.uniformMatrix4fv(u.model,false,[...cols[0],0,...cols[1],0,...cols[2],0,...center,1]);
      gl.uniformMatrix3fv(u.normals,false,axes.flatMap((v,i)=>mul(v,1/size[i])));gl.uniform3fv(u.color,color);
      gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
    }
    gl.depthMask(false);gl.uniform1f(u.shadow,.23);
    drawPart({shape:'box',axes:[X,Y,Z],center:[sample.torso.hip[0],-.006,sample.torso.hip[2]],size:[.70,.0002,.93],color:charcoal});
    gl.uniform1f(u.shadow,.40);
    for(const pt of sample.feet)if(pt[1]<.24)drawPart({shape:'box',axes:[X,Y,Z],center:[pt[0],-.003,pt[2]],size:[.143,.0002,.23],color:charcoal});
    gl.uniform1f(u.shadow,0);gl.depthMask(true);
    for(const item of items)drawPart(item);
    for(const a of att)gl.disableVertexAttribArray(a);
    window.AtlasAthlete.draw(gl,sample,id,o.highlight!==false,view);
  }
  function collectEquipment(view,items){
    const triangles=[];
    for(const part of items){
      const {v,n,idx}=geometry[part.shape==='weight'?'weightLow':part.shape],pts=[],worldNormals=[];
      for(let i=0;i<v.length;i+=3){
        let pt=part.center.slice(),normal=[0,0,0];
        for(let k=0;k<3;k++){
          pt=add(pt,mul(part.axes[k],v[i+k]*part.size[k]));
          normal=add(normal,mul(part.axes[k],n[i+k]/part.size[k]));
        }
        pts.push(view.project(pt));worldNormals.push(unit(normal));
      }
      for(let i=0;i<idx.length;i+=3){
        const [ia,ib,ic]=idx.slice(i,i+3),a=pts[ia],b=pts[ib],c=pts[ic];
        const light=.65+.37*Math.max(0,dot(worldNormals[ia],[-.43,.81,.42]));
        triangles.push({a,b,c,depth:(a.depth+b.depth+c.depth)/3,color:'rgb('+part.color.map(v=>Math.round(v*255*light)).join(',')+')'});
      }
    }
    return triangles;
  }
  function paintTriangles(ctx,triangles){
    for(const t of triangles){
      ctx.beginPath();ctx.moveTo(t.a.x,t.a.y);ctx.lineTo(t.b.x,t.b.y);ctx.lineTo(t.c.x,t.c.y);ctx.closePath();
      ctx.fillStyle=t.color;ctx.fill();
    }
  }
  function cpuDraw(canvas,view,p,id,o,items){
    const ctx=canvas.getContext('2d');ctx.setTransform(view.pixelRatio,0,0,view.pixelRatio,0,0);ctx.clearRect(0,0,view.width,view.height);
    const foot=view.project([p.torso.hip[0],0,p.torso.hip[2]]);
    ctx.fillStyle='rgba(73,85,65,.08)';ctx.beginPath();ctx.ellipse(foot.x,foot.y,view.pixels*.46,view.pixels*.095,0,0,Math.PI*2);ctx.fill();
    const triangles=collectEquipment(view,items);
    if(window.AtlasAthlete.triangles){
      window.AtlasAthlete.triangles(p,id,o.highlight!==false,view,(a,b,c,color,depth)=>triangles.push({a,b,c,color,depth}));
      triangles.sort((a,b)=>a.depth-b.depth);paintTriangles(ctx,triangles);
    }else{
      triangles.sort((a,b)=>a.depth-b.depth);paintTriangles(ctx,triangles);
      window.AtlasAthlete.drawCPU(canvas,p,id,o.highlight!==false,view);
    }
  }
  function draw(canvas,id,options={}){
    const p=options.pose||window.AtlasMotion.sample(options.phase??0,id).pose;
    const view=makeView(canvas,id,options,p);
    const w=Math.max(1,Math.round(view.width*view.pixelRatio)),h=Math.max(1,Math.round(view.height*view.pixelRatio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    if(!contexts.has(canvas)){
      const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
      contexts.set(canvas,gl?boot(gl):null);
    }
    const state=contexts.get(canvas), items=equipment(options.atCover&&id==='squat'?{...p,rack:null}:p,id,options.equipment!==false);
    if(state)gpuDraw(state,view,p,id,options,items);else cpuDraw(canvas,view,p,id,options,items);
    return view;
  }
  function release(canvas){
    const state=contexts.get(canvas);contexts.delete(canvas);if(!state)return;
    const {gl,shaders,prog,meshes}=state;window.AtlasAthlete.release?.(gl);
    Object.values(meshes).forEach(m=>{gl.deleteBuffer(m.buffer);gl.deleteBuffer(m.index)});
    shaders.forEach(s=>gl.deleteShader(s));gl.deleteProgram(prog);gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  window.FormFigure={draw,release};
})();
