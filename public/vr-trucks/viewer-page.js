const models = {
  'howo-tx-dump': 'HOWO-TX 6×4 自卸车',
  'howo-nx-tractor': 'HOWO-NX 6×4 牵引车',
  'howo-t7h-tractor': 'HOWO-T7H 6×4 牵引车',
  'howo7-4x2-tractor': 'HOWO-7 4×2 牵引车',
  'howo7-6x4-tractor': 'HOWO-7 6×4 牵引车',
  'howo7-dump': 'HOWO-7 8×4 自卸车',
  'howo7-mixer': 'HOWO-7 6×4 搅拌车',
  'howo7-sprinkler': 'HOWO-7 6×4 洒水车',
  'howo-tx-mixer': 'HOWO-TX 6×4 搅拌车'
};
const model = new URLSearchParams(location.search).get('model') || 'howo7-dump';
const name = models[model];
if (!name) {
  document.querySelector('#status').textContent = '未找到该车型，请返回车型列表。';
} else {
  document.title = `${name} · VR 全景`;
  document.querySelector('#modelName').textContent = name;
  document.querySelector('#detailModelName').textContent = `${name} · 产品细节`;
  const data = document.createElement('script');
  data.src = model === 'howo7-dump' ? 'tour-data.js' : `tours/data/${model}.js`;
  data.onload = () => {
    const viewer = document.createElement('script');
    viewer.src = 'viewer.js';
    viewer.onerror = () => document.querySelector('#status').textContent = '全景播放器加载失败。';
    document.body.append(viewer);
  };
  data.onerror = () => document.querySelector('#status').textContent = '该车型的全景素材尚未就绪。';
  document.body.append(data);
}
