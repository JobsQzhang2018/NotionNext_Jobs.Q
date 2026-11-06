import './vendor/cube.js';
export const faces=['U','R','F','D','L','B'];
const corners=[[0,1,2],[0,2,4],[0,4,5],[0,5,1],[3,2,1],[3,4,2],[3,5,4],[3,1,5]];
const edges=[[0,1],[0,2],[0,4],[0,5],[3,1],[3,2],[3,4],[3,5],[2,1],[2,4],[5,4],[5,1]];
export const pieces=[...corners,...edges,...faces.map((_,f)=>[f])];
export const positions=pieces.map(p=>[Number(p.includes(1))-Number(p.includes(4)),Number(p.includes(0))-Number(p.includes(3)),Number(p.includes(2))-Number(p.includes(5))]);
export const names=faces.flatMap(f=>[f,f+'2',f+"'"]);
export const solved=()=>new globalThis.Cube().toJSON();
export const move=(s,m)=>new globalThis.Cube(s).move(m).toJSON();
export const stickers=s=>[
  ...corners.map((_,i)=>[0,1,2].map(j=>corners[s.cp[i]][(j-s.co[i]+3)%3])),
  ...edges.map((_,i)=>[0,1].map(j=>edges[s.ep[i]][(j-s.eo[i]+2)%2])),
  ...faces.map((_,f)=>[f])
];
const parity=a=>a.reduce((p,x,i)=>p+a.slice(i+1).filter(y=>y<x).length,0)%2;
export function validate(a){
  if(!Array.isArray(a)||a.length!==26||a.some((r,i)=>!Array.isArray(r)||r.length!==pieces[i].length||r.some(c=>!Number.isInteger(c)||c<0||c>5)))throw Error('请为全部 54 个色块选择颜色。');
  for(let c=0;c<6;c++)if(a.flat().filter(x=>x===c).length!==9)throw Error('每种颜色需要恰好 9 块，请检查色块数量。');
  if(a.slice(20).some((r,i)=>r[0]!==i))throw Error('中心颜色固定，请按上白、下黄、前绿、后蓝、右红、左橙摆好实物。');
  const s=solved();
  for(let i=0;i<8;i++){
    const o=a[i].findIndex(c=>c===0||c===3);
    const id=o<0?-1:corners.findIndex(c=>c.every((v,k)=>v===a[i][(k+o)%3]));
    if(id<0)throw Error('角块颜色组合不正确，请检查相邻颜色或镜像标色。');
    s.cp[i]=id;s.co[i]=o;
  }
  for(let i=0;i<12;i++){
    const row=a[i+8],id=edges.findIndex(c=>c.every(v=>row.includes(v)));
    if(id<0)throw Error('棱块颜色组合不正确，请检查相邻颜色。');
    s.ep[i]=id;s.eo[i]=row[0]===edges[id][0]?0:1;
  }
  if(new Set(s.cp).size!==8||new Set(s.ep).size!==12)throw Error('出现重复角块或棱块，请核对全部色块。');
  if(s.co.reduce((a,b)=>a+b,0)%3)throw Error('角块扭转不合法：可能有单个角块被扭动或标色错误。');
  if(s.eo.reduce((a,b)=>a+b,0)%2)throw Error('棱块翻转不合法：可能有单个棱块被翻转或标色错误。');
  if(parity(s.cp)!==parity(s.ep))throw Error('排列不合法：可能有两个角块或两个棱块被单独交换，请重新检查标色。');
  return s;
}
