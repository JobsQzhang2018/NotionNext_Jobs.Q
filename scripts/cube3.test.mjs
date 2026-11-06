import assert from 'node:assert/strict';
import {faces,pieces,positions,solved,move,stickers,validate} from '../public/cube3/cube.js';
import {solve} from '../public/cube3/solver.js';
const Cube=globalThis.Cube;
for(let m=0;m<18;m++){
  const s=move(solved(),m);
  assert.deepEqual(validate(stickers(s)),s);
  assert.deepEqual(move(s,Math.floor(m/3)*3+2-m%3),solved());
}
for(let f=0;f<6;f++){
  let s=solved();for(let j=0;j<4;j++)s=move(s,f*3);assert.deepEqual(s,solved());
  // Independently rotate sticker coordinates/normals to verify rendered layer geometry matches moves.
  const axis=[1,0,2,1,0,2][f],sign=f<3?1:-1;
  const rotate=p=>{const [x,y,z]=p,d=[-1,-1,-1,1,1,1][f];return axis===0?[x,-d*z,d*y]:axis===1?[d*z,y,-d*x]:[-d*y,d*x,z];};
  const normals=[[0,1,0],[1,0,0],[0,0,1],[0,-1,0],[-1,0,0],[0,0,-1]];
  const expected=pieces.map(p=>p.slice());
  pieces.forEach((p,i)=>p.forEach((color,j)=>{
    let pos=positions[i],normal=normals[color];
    if(pos[axis]===sign){pos=rotate(pos);normal=rotate(normal);}
    const target=positions.findIndex(v=>v.every((x,k)=>x===pos[k]));
    const face=normals.findIndex(v=>v.every((x,k)=>x===normal[k]));
    expected[target][pieces[target].indexOf(face)]=color;
  }));
  assert.deepEqual(stickers(move(solved(),f*3)),expected,faces[f]+' animation geometry');
}
let a=stickers(solved());[a[0][0],a[0][1],a[0][2]]=[a[0][2],a[0][0],a[0][1]];assert.throws(()=>validate(a),/扭转/);
a=stickers(solved());a[8].reverse();assert.throws(()=>validate(a),/翻转/);
a=stickers(solved());[a[8],a[9]]=[a[9],a[8]];assert.throws(()=>validate(a),/排列/);
a=stickers(solved());[a[0][1],a[0][2]]=[a[0][2],a[0][1]];assert.throws(()=>validate(a),/角块颜色/);
a=stickers(solved());a[0][0]=1;assert.throws(()=>validate(a),/9 块/);
assert.throws(()=>validate(null),/54/);assert.throws(()=>validate(Array(26).fill(null)),/54/);
console.time('solver initialization');Cube.initSolver();console.timeEnd('solver initialization');
for(let i=0;i<12;i++){
  const c=Cube.random(),state=c.toJSON();assert.deepEqual(validate(stickers(state)),state);
  const formula=solve(state);assert.ok(new Cube(state).move(formula).isSolved());
  console.log(`Random state ${i+1}: ${formula.length} moves`);
}
assert.deepEqual(solve(solved()),[]);
console.log('PASS: turns, inverse moves, 3D geometry, 54-sticker validation, random full-state solves');
