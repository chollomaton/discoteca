import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {compareScreenshots} from './visual-compare.mjs';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  async function sample(changed=0,delta=0,width=10){
    return Buffer.from(await page.evaluate(({changed,delta,width})=>{
      const c=document.createElement('canvas');c.width=width;c.height=10;
      const ctx=c.getContext('2d');ctx.fillStyle='rgb(100,100,100)';ctx.fillRect(0,0,width,10);
      ctx.fillStyle=`rgb(${100+delta},100,100)`;ctx.fillRect(0,0,changed,1);
      return c.toDataURL().split(',')[1];
    },{changed,delta,width}),'base64');
  }
  const baseline=await sample();
  await compareScreenshots(page,baseline,baseline,'exact');
  await compareScreenshots(page,await sample(1,1),baseline,'one-level rounding');
  async function reject(changed,delta,width,label){
    const actual=await sample(changed,delta,width);
    await assert.rejects(()=>compareScreenshots(page,actual,baseline,label),assert.AssertionError);
  }
  await reject(6,1,10,'six changed pixels');
  await reject(1,2,10,'two-level change');
  await reject(0,0,11,'different dimensions');
  console.log('✓ Comparador rechaza cambios de tamaño, color >1 y más de 5 píxeles');
}finally{await browser.close();}
