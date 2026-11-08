(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const icons = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.5m-.5 6h.5m-.5 6h.5"/>',
    bookmark:'<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5v16L12 17l-6 3.5z"/>',
    eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    'eye-off':'<path d="m3 3 18 18M4.5 8A18 18 0 0 0 2 12s3.6 7 10 7a12 12 0 0 0 5.1-1.4M9 5.4c.9-.3 1.9-.4 3-.4 6.4 0 10 7 10 7a16 16 0 0 1-2.3 3.1"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    dumbbell:'<g transform="rotate(-35 12 12)"><rect x="3" y="7" width="4" height="10" rx="1"/><rect x="17" y="7" width="4" height="10" rx="1"/><path d="M7 11h10m-10 2h10M1 10v4m22-4v4"/></g>',
    target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    bars:'<path d="M4 20v-5h3v5zM10.5 20V10h3v10zm6.5 0V4h3v16z"/>',
    orbit:'<circle cx="12" cy="11" r="3.2"/><path d="M8 7.2c-4.1.8-6.4 3.3-5.8 5.6.8 3.1 6.1 4.9 11.8 4 5.6-1 9.5-4.3 8.5-7-.5-1.7-2.5-2.8-5.1-3.2"/><path d="m6.8 4.7 2.1 2.7-3 1.8"/>',
    'arrow-up-right':'<path d="M6 18 18 6M7 6h11v11"/>',
    'arrow-right':'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    'arrow-left':'<path d="M20 12H5m6-6-6 6 6 6"/>',
    sliders:'<path d="M3 6h6m4 0h8M3 12h11m4 0h3M3 18h3m4 0h11"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    sort:'<path d="M4 5h16M4 10h12M4 15h8M4 20h4"/>',
    'chevron-down':'<path d="m6 9 6 6 6-6"/>','chevron-right':'<path d="m9 6 6 6-6 6"/>',
    x:'<path d="m6 6 12 12M18 6 6 18"/>', plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
    reset:'<path d="M4 10a8 8 0 1 1 .6 6M4 4v6h6"/>',
    play:'<path d="m7 4 12 8-12 8z"/>',pause:'<rect x="6" y="4" width="4" height="16" rx=".7"/><rect x="14" y="4" width="4" height="16" rx=".7"/>',
    check:'<path d="m5 12 4.5 4.5L19 7"/>',alert:'<path d="M12 7v6m0 3v.5"/><circle cx="12" cy="12" r="9"/>',
    book:'<path d="M12 5c-3.5-2-7-2-10-1v15c3-1 6.5-1 10 1 3.5-2 7-2 10-1V4c-3-1-6.5-1-10 1zm0 0v15"/>',
    muscle:'<path d="M4 18c1.5-2 1.8-4.8 2.5-8 .5-3.3 1.6-5.8 4.5-6.3 1.8-.3 3 .5 3 1.9 0 1.5-1.4 1.9-3 2.2L10 13c1.8-1.6 4.6-2.2 6.8-.9 2.3 1.3 3.7 3.3 3.2 5.3-2.6 3.5-11.3 4.8-16 .6z"/>'
  };
  function icon(key) {return '<svg aria-hidden="true" focusable="false" class="icon" viewBox="0 0 24 24">'+(icons[key]||'')+'</svg>'}
  const I = key => '<i data-icon="'+key+'">'+icon(key)+'</i>';
  document.querySelectorAll('i[data-icon]').forEach(el => el.innerHTML=icon(el.dataset.icon));
  const data = window.EXERCISES;
  const byId = new Map(data.map(ex => [ex.id,ex]));
  const groups = [
    {key:'equipment',name:'所需器械',icon:'dumbbell',values:['杠铃','哑铃','壶铃','哑铃凳','瑜伽垫','自重']},
    {key:'region',name:'训练部位',icon:'target',values:['臀腿','胸部','背部','肩部','手臂','核心']},
    {key:'level',name:'训练难度',icon:'bars',values:['初级','中级']}
  ];
  const filters = {equipment:'',region:'',level:''};
  let favorites;
  try { const raw=JSON.parse(localStorage.getItem('formlab.saved')||'[]'); favorites=new Set(Array.isArray(raw)?raw.filter(id=>byId.has(id)):[]); } catch {favorites=new Set()}
  let layout='grid', section='library', current=null, libraryScroll=0, releaseModel=()=>{}, toastTimer;
  const aliases={rdl:'rdl 罗硬 硬拉 腿后侧 后链 大腿后侧',squat:'深蹲 杠铃深蹲 背蹲 腿前侧',pushup:'俯卧撑 伏地挺身 pushup',row:'划船 上背 单手 训练凳 长凳',overhead:'肩推 推肩 推举 ohp',plank:'平板 核心 腹肌',curl:'二头 肱二头肌 弯举',lunge:'弓箭步 弓步蹲 反向箭步蹲',lateral:'肩部 中束 三角肌',bridge:'桥式 臀桥 臀部',calf:'提踵 小腿',bench:'平板卧推 胸推 训练凳 长凳 卧推凳'};
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),1350)}
  function updateFavorite(id){
    const isNew=!favorites.has(id);
    if(isNew)favorites.add(id);else favorites.delete(id);
    let persisted=true;
    try{localStorage.setItem('formlab.saved',JSON.stringify([...favorites]))}catch{persisted=false}
    if(current){const btn=$('detail-save');btn.setAttribute('aria-pressed',String(isNew));btn.innerHTML=I('bookmark')+(isNew?'已收藏':'收藏动作')}
    else if(section==='saved'){renderCards()}else{
      const btn=document.querySelector('[data-save="'+id+'"]');
      if(btn){btn.setAttribute('aria-pressed',String(isNew));btn.setAttribute('aria-label',(isNew?'取消收藏':'收藏')+byId.get(id).name);btn.title=isNew?'取消收藏':'收藏动作'}
    }
    toast(persisted?(isNew?'已加入我的收藏':'已取消收藏'):'当前浏览器仅能在本次浏览中保存收藏');
  }
  function renderFilters(){
    $('filter-groups').innerHTML=groups.map(g=>'<div class="filter-group" role="group" aria-label="'+g.name+'"><div class="group-label">'+I(g.icon)+g.name+'</div><div class="chips">'+['',...g.values].map(v=>'<button class="chip" type="button" data-group="'+g.key+'" data-value="'+v+'" aria-pressed="'+(filters[g.key]===v)+'">'+(v||'全部')+'</button>').join('')+'</div></div>').join('');
  }
  function meter(level){const n=level==='初级'?1:level==='中级'?2:3;return '<span class="meter '+(['','easy','medium','hard'][n])+'" aria-hidden="true">'+[1,2,3].map(i=>'<i class="'+(i<=n?'on':'')+'"></i>').join('')+'</span>'}
  function matches(ex,q){
    if(section==='saved'&&!favorites.has(ex.id))return false;
    if(filters.equipment&&!ex.equipment.includes(filters.equipment))return false;
    if(filters.region&&ex.region!==filters.region)return false;
    if(filters.level&&ex.level!==filters.level)return false;
    return !q||q.every(term=>[ex.name,ex.en,ex.id,aliases[ex.id],ex.region,ex.level,...ex.muscles,...ex.equipment].join(' ').toLowerCase().includes(term));
  }
  function makeCard(ex){
    const saved=favorites.has(ex.id);
    return '<article class="card"><a href="#exercise/'+ex.id+'" aria-label="观察'+ex.name+'"><div class="card-stage"><img class="thumb" src="'+thumb(ex)+'" alt="" loading="lazy" decoding="async"><span class="level">'+meter(ex.level)+ex.level+'</span><span class="orbit-badge">'+I('orbit')+'360°</span></div><div class="card-content"><div class="card-title"><h3>'+ex.name+'</h3>'+I('arrow-up-right')+'</div><div class="card-en" lang="en">'+ex.en+'</div><div class="card-meta"><span>'+I('dumbbell')+ex.equipment.join('、')+'</span><span class="rule"></span><span>'+I('target')+ex.region+'</span></div></div></a><button class="fav" data-save="'+ex.id+'" aria-label="'+(saved?'取消收藏':'收藏')+ex.name+'" title="'+(saved?'取消收藏':'收藏动作')+'" aria-pressed="'+saved+'">'+I('bookmark')+'</button></article>';
  }
  function renderCards(){
    const q=$('search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const items=data.filter(ex=>matches(ex,q));
    if($('sort').value==='easy')items.sort((a,b)=>['初级','中级','进阶'].indexOf(a.level)-['初级','中级','进阶'].indexOf(b.level));
    if($('sort').value==='name')items.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
    $('results-count').innerHTML='共 <strong>'+items.length+'</strong> 个动作';
    $('filter-apply').textContent='查看 '+items.length+' 个动作';
    const savedEmpty=section==='saved'&&!favorites.size;
    $('cards').innerHTML=items.length?items.map(makeCard).join(''):'<div class="empty">'+I(savedEmpty?'bookmark':'search')+'<h3>'+(savedEmpty?'还没有收藏动作':'没有找到匹配的动作')+'</h3><p>'+(savedEmpty?'点击动作卡右上角的书签，即可在这里找到它。':'试试其他关键词，或清除已选条件。')+'</p><button id="empty-action">'+(savedEmpty?'浏览动作库':'清除搜索与筛选')+'</button></div>';
    if(!items.length)$('empty-action').onclick=()=>{clearFilters(true);if(savedEmpty)location.hash='library'};
  }
  function clearFilters(includeSearch=false){Object.keys(filters).forEach(k=>filters[k]='');if(includeSearch)$('search').value='';renderFilters();renderCards()}
  function closeFilters(restore=false){if(!document.body.classList.contains('filters-open'))return;document.body.classList.remove('filters-open');$('filter-scrim').hidden=true;$('filters').removeAttribute('role');$('filters').removeAttribute('aria-modal');if(restore)$('mobile-filter').focus()}
  function openFilters(){document.body.classList.add('filters-open');$('filter-scrim').hidden=false;$('filters').setAttribute('role','dialog');$('filters').setAttribute('aria-modal','true');$('filter-x').focus()}
  $('mobile-filter').onclick=openFilters;
  [$('filter-x'),$('filter-scrim'),$('filter-apply')].forEach(el=>el.onclick=()=>closeFilters(true));
  $('reset').onclick=()=>clearFilters();
  $('filter-groups').onclick=e=>{const b=e.target.closest('[data-group]');if(!b)return;filters[b.dataset.group]=b.dataset.value;renderFilters();renderCards();$('filter-groups').querySelector('[data-group="'+b.dataset.group+'"][data-value="'+b.dataset.value+'"]').focus({preventScroll:true})};
  $('sort').onchange=renderCards;
  $('cards').onclick=e=>{const b=e.target.closest('[data-save]');if(b)updateFavorite(b.dataset.save)};
  for(const mode of ['grid','list'])$(mode+'-view').onclick=()=>{layout=mode;$('cards').classList.toggle('list',layout==='list');['grid','list'].forEach(v=>$(v+'-view').setAttribute('aria-pressed',String(v===layout)))};
  $('search-form').onsubmit=e=>{e.preventDefault();if(current)location.hash='library';else $('catalog').scrollIntoView({block:'start'})};
  $('search').oninput=()=>{if(current)location.hash='library';else renderCards()};
  document.addEventListener('keydown',e=>{
    if(e.key==='/'&&!e.metaKey&&!e.ctrlKey&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();$('search').focus()}
    if(e.key==='Escape')closeFilters(true);
    if(e.key==='Tab'&&document.body.classList.contains('filters-open')){
      const buttons=Array.from($('filters').querySelectorAll('button')).filter(b=>b.offsetWidth);
      if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus()}
    }
  });
  function renderTips(ex,key){
    const symbols={checks:'check',mistakes:'alert'};
    $('tips').innerHTML=ex[key].map((tip,n)=>'<li><span class="tip-index">'+(symbols[key]?I(symbols[key]):String(n+1).padStart(2,'0'))+'</span>'+tip+'</li>').join('');
    $('tips').setAttribute('aria-labelledby','tab-'+key);
    document.querySelectorAll('[data-tip]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tip===key));b.tabIndex=b.dataset.tip===key?0:-1});
  }
  let viewerLoading;
  function loadViewer() {
    if(window.AtlasMotion && window.FormCoaching && window.AtlasAthlete && window.FormFigure) return window.AtlasAthlete.ready;
    if(!viewerLoading) {
      const files=JSON.parse($('viewer-assets').textContent);
      viewerLoading=Promise.all(files.map(src=>new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.async=false;script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error(src));
        document.head.append(script);
      }))).then(()=>window.AtlasAthlete.ready).catch(err=>{viewerLoading=null;throw err});
    }
    return viewerLoading;
  }
  // Camera and timestamp are authored together against each exercise's cover.
  const coverFrames={
    rdl:[219,-1,.59],squat:[341,4,.592],pushup:[291,7,.59],row:[296,7,.59],overhead:[350,3,.59],plank:[279,3,.52],
    curl:[344,3,.51],lunge:[295,3,.585],lateral:[353,3,.59],bridge:[278,3,.59],calf:[207,2,.59],bench:[339,5,.595],
    hammer:[36,10,.582],frontraise:[53,10,.497],shrug:[147,8,.586],dbrow:[115,13,.59],floorpress:[47,22,.59],
    dbfly:[33,32,.593],goblet:[42,11,.584],dbsquat:[49,10,.583],airsquat:[41,9,.58],inclinepush:[104,16,.535],
    crunch:[59,17,.59],deadbug:[62,21,.497],climber:[75,16,.590],singlebridge:[51,18,.59],superman:[80,16,.59],benchleg:[82,16,.528]
  };
  const stageStops = [
    {id:'stand', text:'站立', at:0, inspect:.045},
    {id:'setup', text:'进入起始姿势', at:.10, inspect:.29},
    {id:'rep', text:'完成一次', at:.40, inspect:.59},
    {id:'reset', text:'回到站立', at:.78, inspect:.89}
  ];
  const viewSettings = {equipment:true, cues:true, highlight:true};
  try {
    const saved = JSON.parse(localStorage.getItem('formlab.viewer') || '{}');
    for (const k of Object.keys(viewSettings)) if (typeof saved?.[k] === 'boolean') viewSettings[k]=saved[k];
  } catch {}
  function stageControls(ex) {
    return stageStops.map(stop => '<button type="button" class="phase-stop" data-stage="'+stop.id+'">'+(ex.id==='plank'&&stop.id==='rep'?'静态保持':stop.text)+'</button>').join('');
  }
  function thumb(ex){return window.FormThumbnails?.[ex.id]||'assets/thumbs/'+ex.id+'.webp?v=5'}
  function showObserver(ex) {
    const saved=favorites.has(ex.id);
    const setup=ex.setupPoints;
    const hasEquipment=ex.equipment.some(e=>e!=='自重');
    $('observer').innerHTML=`
      <div class="obs-crumb"><a href="#${section}">${I('arrow-left')}${section==='saved'?'我的收藏':'动作库'}</a>${I('chevron-right')}<span>动作观察</span></div>
      <div class="obs-heading"><div><h1>${ex.name}</h1><div class="obs-en" lang="en">${ex.en}</div></div><button class="detail-save" id="detail-save" aria-pressed="${saved}">${I('bookmark')}${saved?'已收藏':'收藏动作'}</button></div>
      <div class="obs-grid">
        <section class="model-box" aria-label="三维动作演示">
          <div class="studio-head"><div class="studio-name"><h2>${I('orbit')}动作演示</h2><span>拖动旋转 360°</span></div>${hasEquipment?'<button class="gear-toggle" type="button" id="gear-toggle"></button>':''}</div>
          <div class="model-stage">
            <canvas id="model" tabindex="0" aria-describedby="setup-list" aria-label="${ex.name}可旋转模型，方向键旋转，空格播放或暂停"></canvas>
            <div class="pose-label"><span class="pose-light"></span><span id="pose-label">载入模型…</span></div>
            <div class="stage-topright">
              <button id="zoom-out" class="stage-btn" aria-label="缩小模型" title="缩小">${I('minus')}</button>
              <button id="zoom-in" class="stage-btn" aria-label="放大模型" title="放大">${I('plus')}</button>
              <button id="camera-reset" class="stage-btn" aria-label="还原视角" title="还原视角">${I('reset')}</button>
            </div>
            <div id="setup-layer" aria-hidden="true" hidden>
              <svg class="setup-wires">${setup.map((_,i)=>'<g data-wire="'+i+'"><path/><circle class="pin-glow" r="6"/><circle class="pin-dot" r="2.2"/></g>').join('')}</svg>
              ${setup.map((item,i)=>'<span class="setup-pin"><b>'+(i+1)+'</b>'+item.label+'</span>').join('')}
            </div>
            <div id="cue-layer" hidden>
              <svg id="cue-wire" aria-hidden="true"><path id="cue-path"></path><circle class="cue-ring" id="cue-ring" r="8"></circle><circle class="cue-center" id="cue-center" r="3"></circle></svg>
              <div class="cue-text" id="cue-text"><b id="cue-name">姿势要点</b><span id="cue-copy"></span></div>
            </div>
          </div>
          <div class="player">
            <div class="phase-strip" role="group" aria-label="跳转动作阶段">${stageControls(ex)}</div>
            <div class="control-line"><button class="play-toggle" id="play-toggle"></button><input class="timeline" id="timeline" type="range" min="0" max="1000" value="0" aria-label="动作进度"><select class="speed" id="speed" aria-label="播放速度"><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1" selected>1.0×</option></select></div>
            <div class="view-controls">
              <div class="view-control-group" aria-label="模型视角"><button class="control-button cover-return" id="cover-return" type="button">封面姿势</button><button class="control-button" data-camera="front">正面</button><button class="control-button" data-camera="side">侧面</button><button class="control-button" data-camera="back">背面</button></div>
              <div class="display-controls"><button class="control-button" id="highlight"><span class="highlight-dot"></span>肌群高亮</button><button class="control-button" id="cue-toggle">${I('target')}姿势要点</button></div>
            </div>
          </div>
        </section>
        <section class="instruction"><div class="panel-header"><h2>动作指南</h2>${I('book')}</div>
          <div class="pills"><span>${I('dumbbell')}${ex.equipment.map(item=>item==='瑜伽垫'?'瑜伽垫（可选）':item).join('、')}</span><span>${I('target')}${ex.region}</span><span>${meter(ex.level)}${ex.level}</span></div><p class="summary">${ex.summary}</p>
          <div class="muscle-list"><h3>训练肌群</h3>${ex.muscles.map((m,i)=>'<span class="muscle-chip'+(i===0?' primary':'')+'">'+m+'</span>').join('')}</div>
          <section class="setup-guide" aria-labelledby="setup-heading">
            <div class="setup-title"><h3 id="setup-heading">起始姿势要点</h3><button id="inspect-setup" type="button">${I('eye')}定格查看</button></div>
            <ol id="setup-list">${setup.map((item,i)=>'<li><span class="setup-index">'+(i+1)+'</span><div><strong>'+item.label+'</strong><p>'+item.text+'</p></div></li>').join('')}</ol>
          </section>
          <div class="tabs" role="tablist" aria-label="动作指导">${[['steps','动作步骤'],['checks','标准自查'],['mistakes','常见错误']].map(([k,v])=>'<button role="tab" id="tab-'+k+'" aria-controls="tips" data-tip="'+k+'">'+v+'</button>').join('')}</div>
          <ol class="tips" role="tabpanel" id="tips"></ol>
          ${ex.sources.map(s=>'<a class="source-link" href="'+s.url+'" target="_blank" rel="noopener noreferrer">'+I('book')+s.label+I('arrow-up-right')+'</a>').join('')}
        </section>
      </div>`;
    $('detail-save').onclick=()=>updateFavorite(ex.id);
    renderTips(ex,'steps');
    const tabs=Array.from(document.querySelectorAll('[data-tip]'));
    tabs.forEach((b,i)=>{b.onclick=()=>renderTips(ex,b.dataset.tip);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];next.click();next.focus()}});
    releaseModel=mountModel(ex);
  }
  function placeCue(view, sample) {
    const layer=$('cue-layer');
    layer.hidden=!viewSettings.cues;
    if(layer.hidden)return;
    const point=view.project(sample.anchor);
    const label=$('cue-text'), copy=$('cue-copy');
    if(copy.textContent!==sample.cue) copy.textContent=sample.cue;
    if($('cue-name').textContent!==sample.title)$('cue-name').textContent=sample.title;
    const width=view.width,height=view.height;
    const labelWidth=label.offsetWidth, labelHeight=label.offsetHeight;
    const isRight=point.x>width*.50;
    const x=isRight?width-labelWidth-12:12;
    const y=width<490?height-labelHeight-12:Math.min(height-labelHeight-15, Math.max(60,point.y-labelHeight-23));
    label.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
    const edgeX=isRight?x:x+labelWidth, edgeY=y+labelHeight*.48;
    const elbowX=edgeX+(isRight?-10:10);
    $('cue-path').setAttribute('d','M '+point.x+' '+point.y+' L '+elbowX+' '+edgeY+' H '+edgeX);
    for(const marker of [$('cue-center'),$('cue-ring')]){marker.setAttribute('cx',point.x);marker.setAttribute('cy',point.y)}
  }
  function setupOverlay(ex){
    const layer=$('setup-layer');
    const pins=Array.from(layer.querySelectorAll('.setup-pin'));
    const wires=Array.from(layer.querySelectorAll('[data-wire]'));
    return function drawSetup(view,sample,yaw){
      const visible=viewSettings.cues && (sample.stage==='stand' || sample.stage==='setup' || (sample.stage==='rep' && sample.repPhase<.055));
      layer.hidden=!visible;
      if(!visible)return false;
      const near=Math.sin(yaw*Math.PI/180)>=0?1:0;
      const tags=ex.setupPoints.map((item,i)=>({
        i, pt:view.project(window.FormCoaching.point(sample.pose,item.joint,near))
      })).sort((a,b)=>a.pt.y-b.pt.y);
      const gap=37, margin=54, last=view.height-29;
      // Maintain space between labels even when two joints project to the same pixel.
      tags.forEach((t,n)=>{t.y=Math.min(last-(tags.length-1-n)*gap,Math.max(margin+n*gap,t.pt.y));if(n)t.y=Math.max(t.y,tags[n-1].y+gap)});
      for(const {i,pt,y} of tags){
        const pin=pins[i],wire=wires[i],left=10,right=left+pin.offsetWidth;
        pin.style.transform='translate('+left+'px,'+Math.round(y-pin.offsetHeight/2)+'px)';
        const from=pt.x<left?left:right,elbow=from+(pt.x<from?-7:7);
        wire.querySelector('path').setAttribute('d','M'+from+' '+y+'H'+elbow+'L'+pt.x+' '+pt.y);
        for(const dot of wire.querySelectorAll('circle')){dot.setAttribute('cx',pt.x);dot.setAttribute('cy',pt.y)}
      }
      return true;
    };
  }
  function mountModel(ex) {
    const model=$('model'),timeline=$('timeline'),toggle=$('play-toggle'),speed=$('speed');
    const [coverYaw,coverPitch,coverPhase]=coverFrames[ex.id];
    const defaults=[coverYaw,coverPitch];
    const supported=ex.equipment.some(item=>item==='哑铃凳'||item==='瑜伽垫');
    const duration=supported?15500:11400;
    let [yaw,pitch]=defaults,zoom=1,phase=coverPhase;
    let playing=false,atCover=true;
    let timer=0,last=0,lastDraw=0,dead=false,needsDraw=true,ready=false,lastStage='';
    const showSetup=setupOverlay(ex);
    const phaseButtons=Array.from(document.querySelectorAll('[data-stage]'));
    function render(){
      if(dead||!model.clientWidth)return;
      // Leave a short hold at the completed setup so the three points can be compared.
      const sampleTime=phase>=.1 && phase<.4 ? Math.min(.399999,.10+(phase-.10)*.30/.235) : phase;
      const sample=window.AtlasMotion.sample(sampleTime,ex.id);
      const view=window.FormFigure.draw(model,ex.id,{yaw,pitch,zoom,phase,atCover,highlight:viewSettings.highlight,equipment:viewSettings.equipment,pose:sample.pose});
      if(view){
        if(atCover){$('cue-layer').hidden=true;$('setup-layer').hidden=true}
        else if(showSetup(view,sample,yaw))$('cue-layer').hidden=true;
        else placeCue(view,window.FormCoaching.cue(sample,ex.id,yaw,viewSettings.equipment));
      }
      const stageLabel=atCover?'封面姿势 · 3D':phase>=.335 && phase<.4?'起始姿势':sample.label;
      if($('pose-label').textContent!==stageLabel)$('pose-label').textContent=stageLabel;
      if(lastStage!==sample.stage){
        for(const b of phaseButtons)b.setAttribute('aria-current',b.dataset.stage===sample.stage?'step':'false');
        lastStage=sample.stage;
      }
      timeline.value=String(Math.round(phase*1000));
      timeline.setAttribute('aria-valuetext',sample.label+'，'+Math.round(phase*100)+'%');
      needsDraw=false;
    }
    function tick(now){
      timer=0;if(dead||document.hidden)return;
      if(playing&&last)phase=(phase+Math.min(now-last,200)*Number(speed.value)/duration)%1;
      last=now;
      if(needsDraw||(playing&&now-lastDraw>=32)){render();lastDraw=now}
      if(playing)timer=requestAnimationFrame(tick);
    }
    function schedule(){needsDraw=true;if(ready&&!timer&&!dead)timer=requestAnimationFrame(tick)}
    function playButton(){const label=playing?'暂停演示':atCover?'从站立开始播放':'播放演示';toggle.innerHTML=I(playing?'pause':'play')+'<span>'+(playing?'暂停':atCover?'播放完整动作':'播放')+'</span>';toggle.title=label;toggle.setAttribute('aria-label',label)}
    function play(){if(atCover){atCover=false;phase=0}playing=!playing;last=0;playButton();schedule()}
    toggle.onclick=play;playButton();
    timeline.oninput=()=>{atCover=false;playing=false;phase=Number(timeline.value)/1000;playButton();schedule()};
    function inspectSetup(){
      atCover=false;playing=false;phase=.368;last=0;viewSettings.cues=true;syncOptions();playButton();schedule();
    }
    $('inspect-setup').onclick=()=>{inspectSetup();if(innerWidth<850)$('model').scrollIntoView({block:'center'})};
    phaseButtons.forEach((b,i)=>b.onclick=()=>{
      if(b.dataset.stage==='setup'){inspectSetup();return}
      atCover=false;playButton();phase=playing?stageStops[i].at:stageStops[i].inspect;last=0;schedule();
    });
    function syncOptions() {
      $('highlight').setAttribute('aria-pressed',String(viewSettings.highlight));
      $('cue-toggle').setAttribute('aria-pressed',String(viewSettings.cues));
      if($('gear-toggle')){
        const visible=viewSettings.equipment;
        $('gear-toggle').innerHTML=I(visible?'eye-off':'eye')+(visible?'隐藏器械':'显示器械');
        $('gear-toggle').classList.toggle('hidden-gear',!visible);
      }
    }
    function flip(key){
      viewSettings[key]=!viewSettings[key];
      try{localStorage.setItem('formlab.viewer',JSON.stringify(viewSettings))}catch{}
      syncOptions();schedule();
    }
    syncOptions();
    $('highlight').onclick=()=>flip('highlight');$('cue-toggle').onclick=()=>flip('cues');
    if($('gear-toggle'))$('gear-toggle').onclick=()=>flip('equipment');
    const views=Array.from(document.querySelectorAll('[data-camera]'));
    function selectCamera(value){views.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===value)))}
    selectCamera(null);
    views.forEach(b=>b.onclick=()=>{const v=b.dataset.camera;yaw={front:0,side:90,back:180}[v];pitch=6;selectCamera(v);schedule()});
    function cover(){
      atCover=true;playing=false;phase=coverPhase;last=0;[yaw,pitch]=defaults;zoom=1;selectCamera(null);playButton();schedule();
    }
    $('cover-return').onclick=cover;
    $('camera-reset').onclick=()=>{[yaw,pitch]=defaults;zoom=1;selectCamera(null);schedule()};
    const zoomBy=d=>{zoom=Math.max(.7,Math.min(1.7,zoom+d));schedule()};
    $('zoom-in').onclick=()=>zoomBy(.12);$('zoom-out').onclick=()=>zoomBy(-.12);
    let dragging=null;
    model.onpointerdown=e=>{if(dragging!==null||e.button!==0)return;dragging={id:e.pointerId,x:e.clientX,y:e.clientY};model.setPointerCapture(e.pointerId);model.classList.add('dragging')};
    function rotate(dx,dy){yaw=(yaw-dx+360)%360;pitch=Math.max(-33,Math.min(68,pitch+dy));selectCamera(null);schedule()}
    model.onpointermove=e=>{if(dragging?.id!==e.pointerId)return;rotate((e.clientX-dragging.x)*.55,(e.clientY-dragging.y)*.35);dragging.x=e.clientX;dragging.y=e.clientY};
    model.onlostpointercapture=model.onpointercancel=model.onpointerup=e=>{if(dragging?.id===e.pointerId){dragging=null;model.classList.remove('dragging')}};
    model.onkeydown=e=>{const motion={ArrowLeft:[12,0],ArrowRight:[-12,0],ArrowUp:[0,7],ArrowDown:[0,-7]};if(motion[e.key]){e.preventDefault();rotate(...motion[e.key])}if(e.key===' '){e.preventDefault();play()}};
    const ro=new ResizeObserver(schedule);ro.observe(model);
    const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(timer);timer=0}else schedule()};
    document.addEventListener('visibilitychange',visibility);
    function prepare(){
      $('pose-label').textContent='载入模型…';
      loadViewer().then(()=>{
        if(dead)return;
        ready=true;last=0;schedule();
      }).catch(()=>{
        if(dead)return;
        const retry=document.createElement('button');
        retry.textContent='模型载入失败，点此重试';retry.onclick=prepare;
        $('pose-label').replaceChildren(retry);
      });
    }
    prepare();
    return ()=>{dead=true;cancelAnimationFrame(timer);ro.disconnect();window.FormFigure?.release?.(model);document.removeEventListener('visibilitychange',visibility)};
  }
  function route(){
    const key=location.hash.slice(1),id=key.startsWith('exercise/')?key.slice(9):null,ex=byId.get(id);
    const previous=current;
    releaseModel();releaseModel=()=>{};
    closeFilters();
    if(ex){
      if(!current)libraryScroll=window.scrollY;
      current=ex;$('library').hidden=true;$('observer').hidden=false;
      document.title=ex.name+' · FormLab 动作观察';showObserver(ex);window.scrollTo(0,0);
      $('observer').setAttribute('tabindex','-1');$('observer').focus({preventScroll:true});
    }else{
      const nextSection=key==='saved'?'saved':'library';
      if(nextSection!==section){Object.keys(filters).forEach(k=>filters[k]='');$('search').value='';libraryScroll=0}
      section=nextSection;current=null;$('observer').hidden=true;$('observer').innerHTML='';$('library').hidden=false;
      $('catalog-title').textContent=section==='saved'?'我的收藏':'动作库';
      $('catalog-en').textContent=section==='saved'?'SAVED EXERCISES':'EXERCISE LIBRARY';
      document.title='FormLab · '+(section==='saved'?'我的收藏':'健身动作图鉴');
      renderFilters();renderCards();
      if(previous)window.scrollTo(0,libraryScroll);else window.scrollTo(0,0);
    }
    for(const n of ['library','saved']){const link=$('nav-'+n);link.classList.toggle('active',section===n);if(section===n)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')}
  }
  matchMedia('(min-width:661px)').addEventListener('change',e=>{if(e.matches)closeFilters()});
  window.addEventListener('hashchange',route);route();
})();
