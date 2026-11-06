// Corner coordinates follow the standard URF/UFL/ULB/UBR/DFR/DLF/DBL/DRB convention.
export const faces=['U','R','F','D','L','B'];
export const corners=[[0,1,2],[0,2,4],[0,4,5],[0,5,1],[3,2,1],[3,4,2],[3,5,4],[3,1,5]];
export const positions=[[1,1,1],[-1,1,1],[-1,1,-1],[1,1,-1],[1,-1,1],[-1,-1,1],[-1,-1,-1],[1,-1,-1]];
const perm=[[3,0,1,2,4,5,6,7],[4,1,2,0,7,5,6,3],[1,5,2,3,0,4,6,7],[0,1,2,3,5,6,7,4],[0,2,6,3,4,1,5,7],[0,1,3,7,4,5,2,6]];
const ori=[[0,0,0,0,0,0,0,0],[2,0,0,1,1,0,0,2],[1,2,0,0,2,1,0,0],[0,0,0,0,0,0,0,0],[0,1,2,0,0,2,1,0],[0,0,1,2,0,0,2,1]];
export const solved=()=>({cp:[0,1,2,3,4,5,6,7],co:Array(8).fill(0)});
export function move(s,m){let f=Math.floor(m/3),n=m%3+1;for(let k=0;k<n;k++)s={cp:perm[f].map(i=>s.cp[i]),co:perm[f].map((i,j)=>(s.co[i]+ori[f][j])%3)};return s;}
export const names=faces.flatMap(f=>[f,f+'2',f+"'"]);
export const stickers=s=>corners.map((_,i)=>[0,1,2].map(j=>corners[s.cp[i]][(j-s.co[i]+3)%3]));
export function validate(a){if(!Array.isArray(a)||a.length!==8||a.some(r=>r.length!==3||r.some(c=>!Number.isInteger(c)||c<0||c>5)))throw Error('请为全部 24 个色块选择颜色。');for(let c=0;c<6;c++)if(a.flat().filter(x=>x===c).length!==4)throw Error('每种颜色需要恰好 4 块，请检查色块数量。');let s=solved();for(let i=0;i<8;i++){let o=a[i].findIndex(c=>c===0||c===3);if(o<0)throw Error('角块颜色组合不正确：每个角块都应有白色或黄色。');let id=corners.findIndex(c=>c.every((v,k)=>v===a[i][(k+o)%3]));if(id<0)throw Error('存在不可能的角块组合，请检查相邻颜色或镜像标色。');s.cp[i]=id;s.co[i]=o;}if(new Set(s.cp).size!==8)throw Error('出现重复角块，请核对 8 个角块的颜色。');if(s.co.reduce((a,b)=>a+b,0)%3)throw Error('角块扭转不合法：可能有单个角块标反或被扭动。');return s;}
export function pRank(a){let n=0;for(let i=0;i<7;i++){let k=0;for(let j=i+1;j<8;j++)if(a[j]<a[i])k++;n=n*(8-i)+k;}return n;}
function pUnrank(n){let digits=Array(8).fill(0);for(let i=6;i>=0;i--){digits[i]=n%(8-i);n=Math.floor(n/(8-i));}let pool=[0,1,2,3,4,5,6,7];return digits.map(x=>pool.splice(x,1)[0]);}
export const oRank=a=>a.slice(0,7).reduce((n,x)=>n*3+x,0);
function oUnrank(n){let a=Array(8).fill(0),sum=0;for(let i=6;i>=0;i--){a[i]=n%3;sum+=a[i];n=Math.floor(n/3);}a[7]=(3-sum%3)%3;return a;}
let tables;
function build(){let pt=new Uint16Array(40320*18),ot=new Uint16Array(2187*18);for(let i=0;i<40320;i++){let a=pUnrank(i);for(let f=0;f<6;f++){let b=a;for(let p=0;p<3;p++){b=perm[f].map(j=>b[j]);pt[i*18+f*3+p]=pRank(b);}}}for(let i=0;i<2187;i++){let a=oUnrank(i);for(let f=0;f<6;f++){let b=a;for(let p=0;p<3;p++){b=perm[f].map((j,k)=>(b[j]+ori[f][k])%3);ot[i*18+f*3+p]=oRank(b);}}}function bfs(t,size){let d=new Int8Array(size).fill(-1),q=new Uint16Array(size),h=0,e=1;d[0]=0;while(h<e){let x=q[h++];for(let m=0;m<18;m++){let y=t[x*18+m];if(d[y]<0){d[y]=d[x]+1;q[e++]=y;}}}return d;}return {pt,ot,pd:bfs(pt,40320),od:bfs(ot,2187)};}
export function solve(s){tables??=build();const {pt,ot,pd,od}=tables;let path=[];function dfs(p,o,d,last){if(Math.max(pd[p],od[o])>d)return false;if(!d)return p===0&&o===0;for(let f=0;f<6;f++){if(f===last||(last>=3&&f===last-3))continue;for(let k=0;k<3;k++){let m=f*3+k;path.push(m);if(dfs(pt[p*18+m],ot[o*18+m],d-1,f))return true;path.pop();}}return false;}let p=pRank(s.cp),o=oRank(s.co);for(let d=Math.max(pd[p],od[o]);d<=14;d++)if(dfs(p,o,d,-1))return path.slice();throw Error('求解未完成，请检查输入状态。');}
