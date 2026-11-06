import {validate,stickers,names} from './cube.js';
import './vendor/solve.js';
let ready=false;
export function solve(state){
  const cube=new globalThis.Cube(validate(stickers(state)));
  if(cube.isSolved())return [];
  if(!ready){globalThis.Cube.initSolver();ready=true;}
  const formula=cube.solve();
  const moves=formula.trim()?formula.trim().split(/\s+/).map(s=>names.indexOf(s)):[];
  if(moves.some(m=>m<0)||!cube.move(moves).isSolved())throw Error('求解结果校验失败，请重试。');
  return moves;
}
