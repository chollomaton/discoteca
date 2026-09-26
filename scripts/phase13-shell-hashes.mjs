import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const path='sw.js';
let sw=fs.readFileSync(path,'utf8');
const assets=vm.runInNewContext(sw.match(/var SHELL = (\[[^;]+\])/)[1]);
const hashes=Object.fromEntries(assets.map(asset=>[asset,createHash('sha256').update(fs.readFileSync(asset)).digest('hex')]));
const declaration='var SHELL_HASHES = '+JSON.stringify(hashes)+';';
if(process.argv.includes('--check')){
 const actual=sw.match(/var SHELL_HASHES = (.*);/);
 if(!actual || JSON.stringify(JSON.parse(actual[1]))!==JSON.stringify(hashes)) throw Error('Hashes del shell desactualizados');
 console.log('✓ integridad de todos los assets del shell');
}else{
 sw=sw.replace(/var SHELL_HASHES = .*;\n/,'');
 fs.writeFileSync(path,sw.replace('var SHELL_PATHS =',declaration+'\nvar SHELL_PATHS ='));
}
