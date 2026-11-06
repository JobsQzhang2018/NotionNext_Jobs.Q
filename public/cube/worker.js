import {solve} from './cube.js';
onmessage=e=>{try{postMessage({moves:solve(e.data)});}catch(e){postMessage({error:e.message});}};
