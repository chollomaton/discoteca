import assert from 'node:assert/strict';

// Chromium can quantize a few antialiased/blurred edge pixels one level apart.
// Keep geometry and every larger color change strict; never use a percentage tolerance.
export async function compareScreenshots(page, actual, expected, label){
  if(actual.equals(expected)) return;
  const result=await page.evaluate(async images=>{
    const pixels=await Promise.all(images.map(async src=>{
      const img=new Image();img.src=src;await img.decode();
      const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
      return {width:img.width,height:img.height,data:ctx.getImageData(0,0,img.width,img.height).data};
    }));
    const [a,b]=pixels;
    if(a.width!==b.width||a.height!==b.height)return {dimensions:false};
    let changed=0,maxDelta=0;
    for(let i=0;i<a.data.length;i+=4){
      let delta=0;
      for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(a.data[i+c]-b.data[i+c]));
      if(delta)changed++;
      maxDelta=Math.max(maxDelta,delta);
    }
    return {dimensions:true,changed,maxDelta};
  },[actual,expected].map(png=>'data:image/png;base64,'+png.toString('base64')));
  assert(result.dimensions&&result.changed<=5&&result.maxDelta<=1,`${label}: ${JSON.stringify(result)}`);
  console.log(`  ${label}: ${result.changed} píxeles con diferencia máxima ${result.maxDelta}/255`);
}
