const groups = {
  exterior: { name: '整车外观', scenes: [
    [3716, '斜前方 · 整车视角', '45° 视角展示驾驶室、货箱与三轴布局。'],
    [3714, '前侧 · 车身姿态', '车头、驾驶室与货箱在同一画面中呈现。'],
    [3713, '正面 · 驾驶室前脸', '正面实拍，观察车头格栅与灯组布局。'],
    [3715, '侧前方 · 全车轮廓', '从另一侧观察驾驶室、底盘与货箱比例。'],
    ['gen-side', '正侧面 · 全车轮廓', '根据实拍补全的侧面参考视角；具体细节以实车为准。'],
    [3724, '侧面 · 货箱', '平视货箱侧板、后轮组与侧防护结构。'],
    [3723, '后侧 · 货箱轮廓', '观察货箱尾部与车身后段的连接关系。'],
    ['gen-rear', '正后方 · 货箱尾门', '根据实拍尾门补全的后方参考视角；具体细节以实车为准。'],
    [3725, '尾部 · 后门结构', '货箱尾门及后部轮廓的近距离实拍。'],
    ['gen-bed', '俯视 · 货箱内部', '根据货箱外观生成的内部参考视角，并非实车内部照片。']
  ]},
  cab: { name: '驾驶室', scenes: [
    [3706, '驾驶室 · 入口', '打开车门后，可见登车踏步与驾驶区。'],
    ['gen-cab', '驾驶室 · 宽视角', '依据实拍驾驶台与座椅生成的参考视角；具体细节以实车为准。'],
    [3707, '驾驶区 · 操作台', '方向盘、仪表台与操作区的实拍视角。'],
    [3708, '座椅 · 车内侧面', '从车门侧观察座椅与驾驶室内部空间。'],
    [3703, '登车踏步', '驾驶室侧面的登车踏步与扶手。']
  ]},
  details: { name: '车身细节', scenes: [
    [3702, '前照灯', '车头灯组与保险杠局部。'],
    [3698, '双后轴轮组', '货箱下方的双后轴与轮胎。'],
    [3704, '侧防护与底盘', '车身侧部防护栏和底盘部件。'],
    [3705, '车门把手', '橘色车门外板与门把手。'],
    [3700, '货箱后侧', '从后侧观察货箱、底盘与车轮。']
  ]},
  service: { name: '检修记录', scenes: [
    [3693, '前脸拆开状态', '拍摄时的检修状态，前脸部件尚未装回。'],
    [3711, '底盘机械局部', '车身底部机械结构的近距离照片。']
  ]}
};

const $ = selector => document.querySelector(selector);
let group = 'exterior';
let index = 0;
let startX = null;
let dragged = false;
const sceneImage = $('#scene');
const filmstrip = $('#filmstrip');
const lightbox = $('#lightbox');

function render() {
  const selected = groups[group];
  const [id, title, description] = selected.scenes[index];
  const generated = String(id).startsWith('gen-');
  sceneImage.src = `assets/${id}.webp`;
  sceneImage.alt = `${selected.name}：${title}${generated ? '生成补充图' : '实拍'}`;
  $('#view-index').textContent = String(index + 1).padStart(2, '0');
  $('#view-group').textContent = selected.name;
  $('#view-title').textContent = title;
  $('#view-source').textContent = generated ? 'AI 生成补充图' : '原始实拍';
  $('#view-source').classList.toggle('generated', generated);
  $('#view-description').textContent = description;
  $('#chapter-number').textContent = `${String(Object.keys(groups).indexOf(group) + 1).padStart(2, '0')} / 04`;
  document.querySelectorAll('.chapter-nav button').forEach(button =>
    button.setAttribute('aria-current', String(button.dataset.group === group)));
  filmstrip.replaceChildren();
  selected.scenes.forEach(([photo, label], position) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `查看${label}`);
    button.setAttribute('aria-current', String(position === index));
    const thumbnail = document.createElement('img');
    thumbnail.src = `assets/${photo}.webp`;
    thumbnail.alt = '';
    thumbnail.loading = position > 2 ? 'lazy' : 'eager';
    const number = document.createElement('span');
    number.textContent = String(position + 1).padStart(2, '0');
    button.append(thumbnail, number);
    if (String(photo).startsWith('gen-')) {
      const badge = document.createElement('b');
      badge.textContent = '生成';
      button.append(badge);
    }
    button.addEventListener('click', () => { index = position; render(); });
    filmstrip.append(button);
  });
  const active = filmstrip.children[index];
  if (active) filmstrip.scrollLeft = Math.max(0, active.offsetLeft - filmstrip.offsetLeft - 12);
}

function step(direction) {
  index = (index + direction + groups[group].scenes.length) % groups[group].scenes.length;
  render();
}

document.querySelectorAll('.chapter-nav button').forEach(button => button.addEventListener('click', () => {
  group = button.dataset.group;
  index = 0;
  render();
}));
$('#previous').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
$('#start').addEventListener('click', () => {
  $('.tour').classList.add('exploring');
});
$('.brand').addEventListener('click', () => $('.tour').classList.remove('exploring'));
$('#fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});
function openImage() {
  if (dragged) { dragged = false; return; }
  const [, title] = groups[group].scenes[index];
  $('#large-image').src = sceneImage.src;
  $('#large-image').alt = sceneImage.alt;
  $('#large-caption').textContent = `${groups[group].name} / ${title} / ${sceneImage.alt.endsWith('生成补充图') ? 'AI 生成补充图' : '原始实拍'}`;
  lightbox.showModal();
}
sceneImage.addEventListener('click', openImage);
$('#open-image').addEventListener('click', openImage);
$('#close-lightbox').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
document.addEventListener('keydown', event => {
  if (lightbox.open) return;
  if (event.key === 'ArrowLeft') step(-1);
  if (event.key === 'ArrowRight') step(1);
});
sceneImage.addEventListener('pointerdown', event => { startX = event.clientX; dragged = false; });
sceneImage.addEventListener('pointerup', event => {
  if (startX !== null && Math.abs(event.clientX - startX) > 45) {
    dragged = true;
    step(event.clientX < startX ? 1 : -1);
  }
  startX = null;
});
render();
