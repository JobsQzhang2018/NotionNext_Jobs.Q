(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const canvas = $('#view'), overlay = $('#hotspots'), status = $('#status'), dialog = $('#detail');
  const { camera, project, clamp } = PanoMath;
  const descriptions = {
    13262684: ['两级登车踏板', '两级踏板便于上下驾驶室，踏面布局方便踩踏。'],
    13262685: ['驾驶室结构', '经典前脸与三层格栅设计；整体钢框架驾驶室强调结构强度和抗冲击能力。'],
    13262680: ['前桥与承载', '前桥采用非对称结构，兼顾承载、抗扭和抗疲劳性能；说明中还介绍了轻量化设计及可选制动配置。'],
    13262676: ['液压举升系统', '液压举升机构兼顾举升能力、工作效率和运行稳定性。系列可提供前举、中举、侧翻及三面翻等方案。'],
    13262675: ['货箱结构与耐磨材料', '货箱可采用 Hardox 钢板，兼顾耐磨、抗冲击与减重；系列提供矩形、斗形、U 形及船形等结构。'],
    13262677: ['底盘布局与稳定性', '轴荷分配适应不同工况，低重心布局有助于提升行驶和卸料过程的稳定性。'],
    13262678: ['后桥与差速锁', '后桥设计强调承载能力；轮间、轴间差速锁用于提升困难路况下的牵引能力。'],
    13262682: ['WP10 / WP12 发动机', '原站介绍的 WP10 / WP12 系列强调低速大扭矩、零件通用性和维护便利性；系列功率范围为 266–430 PS，排放配置覆盖欧 II 至欧 V。'],
    13262681: ['HW 系列变速箱', 'HW 系列提供 10 挡、12 挡方案，采用主副箱结构，兼顾承载能力和换挡操作；说明中还介绍了可选同步器变速箱。'],
    13262683: ['环绕式中控台', '中控台围绕驾驶员布置，各功能按键分区排列，便于触及和操作。']
  };
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  function fail(error) { status.hidden = false; status.textContent = `全景加载失败：${error.message || error}。请刷新重试。`; console.error(error); }
  if (!gl) { fail('浏览器未启用 WebGL'); return; }
  const vertex = `attribute vec2 position; varying vec2 screen;
    void main(){screen=position;gl_Position=vec4(position,0.0,1.0);}`;
  const fragment = `precision highp float;
    varying vec2 screen;
    uniform vec2 span;
    uniform vec3 rightAxis, downAxis, forwardAxis;
    uniform sampler2D frontFace, rightFace, backFace, leftFace, upFace, downFace;
    void main(){
      vec3 d=forwardAxis+rightAxis*screen.x*span.x-downAxis*screen.y*span.y;
      vec3 a=abs(d); vec2 uv;
      if(a.z>=a.x && a.z>=a.y){
        if(d.z>0.0){uv=vec2(d.x,d.y)/a.z*.5+.5;gl_FragColor=texture2D(frontFace,uv);}
        else{uv=vec2(-d.x,d.y)/a.z*.5+.5;gl_FragColor=texture2D(backFace,uv);}
      }else if(a.x>=a.y){
        if(d.x>0.0){uv=vec2(-d.z,d.y)/a.x*.5+.5;gl_FragColor=texture2D(rightFace,uv);}
        else{uv=vec2(d.z,d.y)/a.x*.5+.5;gl_FragColor=texture2D(leftFace,uv);}
      }else{
        if(d.y<0.0){uv=vec2(d.x,d.z)/a.y*.5+.5;gl_FragColor=texture2D(upFace,uv);}
        else{uv=vec2(d.x,-d.z)/a.y*.5+.5;gl_FragColor=texture2D(downFace,uv);}
      }
    }`;
  function shader(type, source) {
    const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
  } catch (error) { fail(error); return; }
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['span','rightAxis','downAxis','forwardAxis'].map(key => [key,gl.getUniformLocation(program,key)]));
  ['frontFace','rightFace','backFace','leftFace','upFace','downFace'].forEach((name,i) => gl.uniform1i(gl.getUniformLocation(program,name),i));
  let current, yaw=0, pitch=0, fov=95, textures=[], hotspots=[], generation=0, dirty=true, auto=false, autoDirection=1, previousTime=0;
  const scripts = new Map(), pointers = new Map();
  let pinchDistance=0;
  for (const scene of TOUR) {
    const button=document.createElement('button'); button.type='button'; button.dataset.scene=scene.id;
    button.setAttribute('aria-label', `进入${scene.name}全景`);
    const thumb=new Image(); thumb.src=scene.thumb; thumb.alt='';
    const label=document.createElement('span'); label.textContent=scene.name;
    button.append(thumb,label); button.addEventListener('click',()=>showScene(scene.id)); $('#views').append(button);
  }
  function stopAuto() { auto=false; $('#rotate').setAttribute('aria-pressed','false'); }
  function resetView() { if(!current)return; yaw=current.view.hLookAt; pitch=current.view.vLookAt; fov=current.view.fov; dirty=true; }
  function constrain() {
    if(!current)return;
    const v=current.view;
    yaw=v.hLookAtMax-v.hLookAtMin>=360 ? ((yaw+180)%360+360)%360-180 : clamp(yaw,v.hLookAtMin,v.hLookAtMax);
    pitch=clamp(pitch,v.vLookAtMin,v.vLookAtMax); fov=clamp(fov,v.fovMin,v.fovMax); dirty=true;
  }
  function loadSceneData(id) {
    if(PANO_FACES[id])return Promise.resolve(PANO_FACES[id]);
    if(!scripts.has(id))scripts.set(id,new Promise((resolve,reject)=>{
      const script=document.createElement('script'); script.src=`assets/panorama/${id}.js?v=6`;
      script.onload=()=>resolve(PANO_FACES[id]); script.onerror=()=>{scripts.delete(id);script.remove();reject(new Error('场景素材未找到'));};
      document.head.append(script);
    }));
    return scripts.get(id);
  }
  async function showScene(id) {
    const next=TOUR.find(scene=>scene.id===id); if(!next)return;
    if(current?.id===id&&status.hidden)return;
    const token=++generation; status.textContent='正在加载全景…'; status.hidden=false; overlay.hidden=true;
    try {
      const faces=await loadSceneData(id);
      const images=await Promise.all([... 'frblud'].map(face=>new Promise((resolve,reject)=>{
        const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('全景图像无法解码')); img.src=faces[face];
      })));
      if(token!==generation)return;
      const newTextures=[];
      for(const [i,image] of images.entries()) {
        let source=image;
        const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if(image.width>max){source=document.createElement('canvas');source.width=source.height=max;source.getContext('2d').drawImage(image,0,0,max,max);}
        const texture=gl.createTexture(); newTextures.push(texture); gl.activeTexture(gl.TEXTURE0+i); gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,source);
      }
      if(gl.getError()!==gl.NO_ERROR){newTextures.forEach(t=>gl.deleteTexture(t));throw new Error('显卡无法加载全景纹理');}
      textures.forEach(t=>gl.deleteTexture(t)); textures=newTextures; current=next; resetView(); buildHotspots();
      document.querySelectorAll('#views button').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.scene)===id)));
      $('#sceneName').textContent=current.name; status.hidden=true; overlay.hidden=false; canvas.focus({preventScroll:true});
    }catch(error){if(token===generation)fail(error);}
  }
  function feature(h) { const id=Number(h.images[0].file.match(/\d+/)[0]);return descriptions[id]||[h.title||'产品细节',h.summary||h.images[0].caption||'查看原始产品说明图片。']; }
  function openDetail(h) {
    const [title,text]=feature(h); $('#detailTitle').textContent=title; $('#detailText').textContent=text;
    const images=$('#detailImages');images.replaceChildren();
    for(const item of h.images){const img=document.createElement('img');img.src=item.src;img.alt=`${title}：参考展示的产品说明图`;images.append(img);}
    stopAuto(); dialog.showModal(); dialog.scrollTop=0;
  }
  function buildHotspots() {
    overlay.replaceChildren(); hotspots=[];
    for(const h of current.hotspots){
      const button=document.createElement('button');button.type='button';button.className=`hotspot ${h.target?'scene':'detail'}`;
      const title=h.target?h.title:feature(h)[0];button.setAttribute('aria-label',h.target?`进入 ${title}`:`查看${title}`);
      button.innerHTML=h.target?'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 18 16 10 29 18M3 26 16 18 29 26"/></svg>':'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="14" cy="14" r="8"/><path d="m20 20 8 8M14 10v8M10 14h8"/></svg>';
      const label=document.createElement('span');label.className='label';label.textContent=title;button.append(label);
      button.addEventListener('click',()=>h.target?showScene(h.target):openDetail(h));overlay.append(button);hotspots.push({h,button});
    }
  }
  function draw() {
    if(!current)return;
    const width=canvas.clientWidth,height=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
    const view=camera(yaw,pitch,fov,width,height);
    if(current.id!==900107)view.focal*=Math.min(1,width/height*1.5);
    gl.uniform2f(uniforms.span,width/(2*view.focal),height/(2*view.focal));
    gl.uniform3fv(uniforms.rightAxis,view.right);gl.uniform3fv(uniforms.downAxis,view.down);gl.uniform3fv(uniforms.forwardAxis,view.forward);
    gl.drawArrays(gl.TRIANGLES,0,6);
    for(const {h,button} of hotspots){const point=project(h.yaw,h.pitch,view,width,height);const visible=point&&point.x>-40&&point.x<width+40&&point.y>-40&&point.y<height+40;button.hidden=!visible;if(visible)button.style.transform=`translate(${clamp(point.x-23,0,width-46)}px,${clamp(point.y-23,0,height-46)}px)`;}
    // Expose current camera on the canvas for accessible diagnostics and verification.
    canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.pitch=pitch.toFixed(3);canvas.dataset.fov=fov.toFixed(3);canvas.dataset.scene=current.id;
  }
  function frame(time){
    const dt=Math.min((time-previousTime)/1000,.05);previousTime=time;
    if(auto&&current&&!dialog.open){yaw+=dt*4*autoDirection;if(current.view.hLookAtMax-current.view.hLookAtMin<360&&(yaw>=current.view.hLookAtMax||yaw<=current.view.hLookAtMin))autoDirection*=-1;constrain();}
    if(dirty){draw();dirty=false;}requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;stopAuto();canvas.focus();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.setPointerCapture(event.pointerId);pinchDistance=0;});
  canvas.addEventListener('pointermove',event=>{
    const previous=pointers.get(event.pointerId);if(!previous||!current)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()];const distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0&&distance>0)fov*=pinchDistance/distance;pinchDistance=distance;}
    else{const speed=fov/Math.max(canvas.clientWidth,canvas.clientHeight*4/3);yaw-=(event.clientX-previous.x)*speed;pitch-=(event.clientY-previous.y)*speed;}
    constrain();
  });
  function endPointer(event){pointers.delete(event.pointerId);pinchDistance=0;}
  canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
  canvas.addEventListener('wheel',event=>{event.preventDefault();stopAuto();fov+=event.deltaY*.04;constrain();},{passive:false});
  canvas.addEventListener('keydown',event=>{
    const actions={ArrowLeft:()=>yaw-=3,ArrowRight:()=>yaw+=3,ArrowUp:()=>pitch-=3,ArrowDown:()=>pitch+=3,'+':()=>fov-=5,'=':()=>fov-=5,'-':()=>fov+=5,Home:resetView};
    if(actions[event.key]){event.preventDefault();stopAuto();actions[event.key]();constrain();}
  });
  $('#zoomIn').onclick=()=>{fov-=5;constrain();};$('#zoomOut').onclick=()=>{fov+=5;constrain();};$('#reset').onclick=()=>{stopAuto();resetView();};
  $('#rotate').onclick=()=>{auto=!auto;$('#rotate').setAttribute('aria-pressed',String(auto));};
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){console.warn('Fullscreen unavailable',error);}};
  $('#toggleViews').onclick=()=>{$('#views').hidden=!$('#views').hidden;$('#toggleViews').setAttribute('aria-expanded',String(!$('#views').hidden));};
  $('#closeDetail').onclick=()=>dialog.close();dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  window.addEventListener('resize',()=>{dirty=true;});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail('图形上下文已中断');});
  requestAnimationFrame(frame);showScene(TOUR[0].id);
})();
