const ATLAS = new URL('./assets/whale-atlas.png', import.meta.url).href
const cuteFont = new FontFace('Whale Cute', `url(${new URL('./assets/ZCOOLKuaiLe-Regular.ttf', import.meta.url).href})`)
document.fonts.add(cuteFont)
cuteFont.load().catch(() => {})
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

export class WhaleMascot extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host{display:block;width:var(--mascot-width,280px);aspect-ratio:2/3;position:relative;pointer-events:none;user-select:none;-webkit-user-select:none}
        .body{position:relative;width:100%;height:100%;transform-origin:50% 84%}
        canvas{width:100%;height:100%;display:block;pointer-events:none}
        button{position:absolute;background:transparent;border:0;padding:0;pointer-events:auto;cursor:pointer;border-radius:50%;-webkit-tap-highlight-color:transparent}
        button:focus-visible{outline:2px dashed #65bad9;outline-offset:3px;background:#8edff422}
        .head{left:19%;top:9%;width:62%;height:35%}.face{left:22%;top:43%;width:56%;height:13%}
        .tummy{left:28%;top:57%;width:43%;height:25%}.tail{left:73%;top:73%;width:25%;height:20%}
        .speech{position:absolute;bottom:91%;left:50%;transform:translateX(-50%);width:max-content;max-width:210px;box-sizing:border-box;padding:12px 20px;border:2px solid #fff;background:linear-gradient(145deg,#f3fcff,#dff5ff);color:#49759c;font:400 17px/1.5 'Whale Cute','Yuanti SC','PingFang SC',sans-serif;letter-spacing:.6px;border-radius:24px 24px 24px 10px;box-shadow:0 0 0 1.5px #b9e2f1,0 7px 0 #bddfeb45,0 12px 25px #376b8b12;pointer-events:none;animation:speech-pop .32s cubic-bezier(.2,1.6,.5,1) both}
        .speech:before{content:'';position:absolute;bottom:-7px;left:43%;width:12px;height:12px;background:#e6f8ff;border-right:2px solid #fff;border-bottom:2px solid #fff;border-radius:0 0 5px 0;transform:rotate(45deg);box-shadow:1px 1px 0 1px #b9e2f1}
        .speech:after{content:'♥';position:absolute;top:-10px;right:9px;color:#ef9fba;font:14px/1 sans-serif;transform:rotate(12deg);text-shadow:0 1px #fff}
        @keyframes speech-pop{from{opacity:0;transform:translateX(-50%) translateY(7px) scale(.8) rotate(-3deg)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1) rotate(0)}}
        .speech[hidden]{display:none}.effects{position:absolute;inset:0;pointer-events:none;overflow:visible}
        .particle{position:absolute;width:9px;height:9px;opacity:0;animation:float-up 1.1s ease-out forwards}
        .bubble{border:1.5px solid #71cbe5;border-radius:50%;box-shadow:inset 2px 2px 0 #ffffffb0;background:#bceffc40}
        .heart{background:#78c7e6;rotate:-45deg;border-radius:2px}.heart:before,.heart:after{content:'';position:absolute;width:9px;height:9px;background:inherit;border-radius:50%}.heart:before{top:-4px;left:0}.heart:after{left:4px;top:0}
        @keyframes float-up{15%{opacity:1}100%{translate:var(--drift) -64px;opacity:0;scale:.6}}
        :host([data-state=happy]) .body{animation:happy .6s ease-in-out 2}
        :host([data-state=pout]) .body{animation:shake .36s ease-in-out 2}
        :host([data-state=surprise]) .body{animation:hop .6s ease-out}
        @keyframes happy{50%{transform:translateY(-6px) rotate(-2deg)}}
        @keyframes shake{25%{transform:translateX(-3px) rotate(-1.5deg)}75%{transform:translateX(3px) rotate(1.5deg)}}
        @keyframes hop{40%{transform:translateY(-12px) rotate(2deg)}}
        @media(prefers-reduced-motion:reduce){.body,.particle,.speech{animation:none!important}.particle{display:none}}
      </style>
      <div class="body">
        <canvas role="img" aria-label="蓝发全身Q版鲸鱼娘"></canvas>
        <button class="head" aria-label="摸摸鲸鱼娘的头" data-action="head"></button>
        <button class="face" aria-label="轻捏鲸鱼娘的脸" data-action="face"></button>
        <button class="tummy" aria-label="轻戳鲸鱼娘的围裙" data-action="body"></button>
        <button class="tail" aria-label="碰一下鲸鱼娘的尾鳍" data-action="tail"></button>
        <div class="effects" aria-hidden="true"></div>
      </div>
      <div class="speech" role="status" aria-live="polite" hidden></div>`
    this.frame = 0
    this.pose = 'idle'
    this.counts = { head: 0, face: 0, body: 0, tail: 0 }
    this.lastAction = performance.now()
    this.nextBlink = this.lastAction + 3400
    this.blinkEnd = 0
    this.canvas = this.shadowRoot.querySelector('canvas')
    this.bubble = this.shadowRoot.querySelector('.speech')
    this.shadowRoot.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.interact(button.dataset.action))
    })
    this.image = new Image()
    this.image.onload = () => {
      if (!this.isConnected) return
      this.setupRenderer()
      this.dataset.ready = 'true'
      this.dispatchEvent(new CustomEvent('mascot-ready', { bubbles: true }))
      this.tick(performance.now())
    }
    this.image.onerror = () => {
      this.dataset.ready = 'error'
      this.bubble.textContent = '角色加载失败，请刷新重试。'
      this.bubble.hidden = false
    }
    this.image.src = ATLAS
    this.dataset.state = 'idle'
    this.setAttribute('aria-label', '可以摸头、捏脸、碰尾鳍的鲸鱼娘')
  }

  setupRenderer() {
    this.canvas.width = 724
    this.canvas.height = 1086
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true })
    if (!gl) { this.ctx = this.canvas.getContext('2d'); return }
    this.gl = gl
    const compile = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
      return shader
    }
    const vertex = compile(gl.VERTEX_SHADER, `
      attribute vec2 uv; varying vec2 tex; uniform vec2 cell; uniform float time; uniform float energy;
      void main(){
        vec2 p=uv;
        float hair=smoothstep(.20,.34,abs(p.x-.5))*smoothstep(.42,.57,p.y)*(1.-smoothstep(.79,.91,p.y));
        float tail=smoothstep(.64,.84,p.x)*smoothstep(.72,.83,p.y);
        p.x+=hair*sin(time*1.7+p.y*5.)*.006+tail*sin(time*3.2)*(.006+energy*.012);
        p.y+=tail*cos(time*3.2)*(.003+energy*.008);
        p.y=.84+(p.y-.84)*(1.+sin(time*1.5)*.003);
        gl_Position=vec4((p.x*2.-1.)*.96,(1.-p.y*2.)*.96,0.,1.);
        tex=(uv+cell)/vec2(4.,2.);
      }`)
    const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float;varying vec2 tex;uniform sampler2D atlas;void main(){gl_FragColor=texture2D(atlas,tex);}`)
    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    const vertices = [], indices = [], columns = 32, rows = 48
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) vertices.push(x / columns, y / rows)
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const i = y * (columns + 1) + x
      indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1)
    }
    const buffer = gl.createBuffer(), indexBuffer = gl.createBuffer(), texture = gl.createTexture()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    const attribute = gl.getAttribLocation(program, 'uv')
    gl.enableVertexAttribArray(attribute)
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.clearColor(0, 0, 0, 0)
    this.uniforms = { cell: gl.getUniformLocation(program, 'cell'), time: gl.getUniformLocation(program, 'time'), energy: gl.getUniformLocation(program, 'energy') }
    this.resources = { program, buffer, indexBuffer, texture }
    this.indexCount = indices.length
  }

  tick(now) {
    if (!this.isConnected) return
    if (this.pose === 'idle') {
      if (now - this.lastAction > 35000) this.frame = 7
      else if (now >= this.nextBlink) { this.blinkEnd = now + 140; this.nextBlink = now + 3400 + Math.random() * 1800 }
      if (now - this.lastAction <= 35000) this.frame = now < this.blinkEnd ? 1 : 0
    } else if (this.pose === 'wave') this.frame = 5 + Math.floor((now - this.lastAction) / 220) % 2
    if (this.gl) {
      const gl = this.gl
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(this.uniforms.cell, this.frame % 4, Math.floor(this.frame / 4))
      gl.uniform1f(this.uniforms.time, reducedMotion.matches ? 0 : now / 1000)
      gl.uniform1f(this.uniforms.energy, !reducedMotion.matches && this.pose === 'surprise' ? 1 : 0)
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0)
    } else if (this.ctx) {
      const w = this.image.width / 4, h = this.image.height / 2
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.drawImage(this.image, this.frame % 4 * w, Math.floor(this.frame / 4) * h, w, h, 0, 0, this.canvas.width, this.canvas.height)
    }
    this.dataset.frame = this.frame
    this.raf = requestAnimationFrame(time => this.tick(time))
  }

  interact(action) {
    if (this.dataset.ready !== 'true') return
    clearTimeout(this.poseTimer)
    clearTimeout(this.speechTimer)
    this.lastAction = performance.now()
    this.nextBlink = this.lastAction + 3400
    this.blinkEnd = 0
    this.bubble.hidden = true
    let text = ''
    if (action === 'head') {
      this.pose = 'happy'; this.frame = 2
      if (++this.counts.head % 3 === 0) text = '摸摸就乖啦～'
      this.particles('heart', 50, 18)
    } else if (action === 'face' || action === 'body') {
      this.pose = 'pout'; this.frame = 3
      if (++this.counts[action] % 2 === 1) text = action === 'face' ? '呜～脸要变圆啦' : '肚肚会害羞～'
    } else if (action === 'tail') {
      this.pose = 'surprise'; this.frame = 4
      if (++this.counts.tail % 3 === 1) text = '尾鳍怕痒呀～'
      this.particles('bubble', 84, 76)
    } else if (action === 'wave') {
      this.pose = 'wave'; this.frame = 5
    } else if (action === 'sleep') {
      this.pose = 'sleep'; this.frame = 7
    } else if (action === 'reset') {
      this.pose = 'idle'; this.frame = 0
    } else return
    this.dataset.state = this.pose
    if (text) {
      this.bubble.textContent = text
      this.bubble.hidden = false
      this.speechTimer = setTimeout(() => { this.bubble.hidden = true }, 2500)
    }
    const state = this.pose
    this.dispatchEvent(new CustomEvent('mascot-interaction', { detail: { action, state }, bubbles: true }))
    this.poseTimer = setTimeout(() => { this.pose = 'idle'; this.frame = 0; this.dataset.state = 'idle' }, action === 'wave' ? 2300 : action === 'sleep' ? 5000 : 1750)
  }

  particles(type, x, y) {
    const container = this.shadowRoot.querySelector('.effects')
    container.replaceChildren()
    for (let i = 0; i < 5; i++) {
      const particle = document.createElement('i')
      particle.className = `particle ${type}`
      particle.style.cssText = `left:${x + (i - 2) * 5}%;top:${y + i % 2 * 4}%;--drift:${(i - 2) * 12}px;animation-delay:${i * 70}ms`
      particle.addEventListener('animationend', () => particle.remove(), { once: true })
      container.append(particle)
    }
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf)
    clearTimeout(this.poseTimer)
    clearTimeout(this.speechTimer)
    if (this.gl && this.resources) {
      const { program, buffer, indexBuffer, texture } = this.resources
      this.gl.deleteProgram(program); this.gl.deleteBuffer(buffer); this.gl.deleteBuffer(indexBuffer); this.gl.deleteTexture(texture)
    }
  }
}
customElements.define('whale-mascot', WhaleMascot)
