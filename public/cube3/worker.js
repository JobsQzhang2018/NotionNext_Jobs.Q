import {solve} from './solver.js';
onmessage=e=>{try{postMessage({moves:solve(e.data)});}catch(e){postMessage({error:e.message});}};
