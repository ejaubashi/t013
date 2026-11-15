import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.use({ trace: "off", reducedMotion: "no-preference" });
const ready = async page => {
  await page.goto('/?view=motion&autoplay=0');
  await expect(page.getByRole('button', {name:'Play motion study',exact:true})).toBeEnabled({timeout:60000});
  return page.locator('.motion-viewport canvas');
};
const seek = async (page, value) => {
  await page.getByRole('slider',{name:'Transition progress'}).evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await expect(page.locator('canvas')).toHaveAttribute('data-progress',(value/1000).toFixed(4));
};
const storyboard = async (page, info) => {
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download Figma storyboard',exact:true}).click();
  const download=await pending, path=info.outputPath(download.suggestedFilename());await download.saveAs(path);
  const svg=await readFile(path,'utf8');
  expect(svg).toContain('<svg');expect(svg).toContain('Figma import:');
  const frames=[...svg.matchAll(/href="(data:image\/jpeg;base64,[^"]+)"/g)].map(match=>match[1]);
  expect(frames).toHaveLength(5); expect(new Set(frames).size).toBeGreaterThanOrEqual(4);
  return {svg,frames};
};

test('renders both sculpture studies, selects rooms, and exports real Figma storyboard frames',async({page},info)=>{
  test.setTimeout(180000);const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const canvas=await ready(page);await expect(canvas).toHaveAttribute('data-backend',/webgpu|webgl2/);
  await seek(page,500);await expect(page.locator('.motion-study-copy')).toContainText('Möbius');
  const first=await storyboard(page,info);expect(first.svg).toContain('Continuum');
  await page.getByRole('tab',{name:/Lamina/}).click();await expect(canvas).toHaveAttribute('data-study','lamina');
  await seek(page,500);const second=await storyboard(page,info);expect(second.svg).toContain('Lamina');
  // Decode the exported previews. White/empty readbacks or incorrect final
  // mapping must not pass just because a canvas and an SVG were produced.
  const samples=await page.evaluate(async frames=>{
    const result=[];
    for(const data of frames){
      const image=await createImageBitmap(await(await fetch(data)).blob()), c=document.createElement('canvas');c.width=24;c.height=16;
      const ctx=c.getContext('2d');ctx.drawImage(image,0,0,24,16);result.push([...ctx.getImageData(0,0,24,16).data]);image.close();
    }
    return result;
  },[first.frames[0],second.frames[0],first.frames[4],second.frames[4]]);
  const meanDifference=(a,b)=>a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0)/a.length;
  expect(meanDifference(samples[0],samples[1])).toBeLessThan(3);
  expect(meanDifference(samples[2],samples[3])).toBeLessThan(3);
  expect(meanDifference(samples[0],samples[2])).toBeGreaterThan(2);
  await page.getByLabel('Destination room',{exact:true}).selectOption('prism');
  await expect(canvas).toHaveAttribute('data-progress','0.0000');const changed=await storyboard(page,info);
  expect(changed.frames[0]).toBe(second.frames[0]);expect(changed.frames[4]).not.toBe(second.frames[4]);
  // Both endpoints and the complete path are still available after export.
  await seek(page,1000);await page.getByRole('button',{name:'Restart motion study'}).click();await expect(canvas).toHaveAttribute('data-progress','0.0000');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('plays, pauses and scrubs by keyboard, with an immediate reduced-motion endpoint',async({page})=>{
  test.setTimeout(120000);const canvas=await ready(page);
  await page.getByRole('button',{name:'Play motion study',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-progress'))).toBeGreaterThan(.1);
  await page.getByRole('button',{name:'Pause motion study',exact:true}).click();
  const paused=await canvas.getAttribute('data-progress');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
  await expect(canvas).toHaveAttribute('data-progress',paused);
  const slider=page.getByRole('slider',{name:'Transition progress'});await slider.focus();await page.keyboard.press('End');await expect(canvas).toHaveAttribute('data-progress','1.0000');
  await page.getByRole('button',{name:'Restart motion study'}).click();await expect(canvas).toHaveAttribute('data-progress','0.0000');
  await page.getByRole('tab',{name:/Continuum/}).focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('tab',{name:/Lamina/})).toBeFocused();await expect(canvas).toHaveAttribute('data-study','lamina');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.motion-scrub-hint')).toContainText('Reduced motion');
  await page.getByRole('button',{name:'Play motion study',exact:true}).click();await expect(canvas).toHaveAttribute('data-progress','1.0000');
  await expect(page.getByRole('button',{name:'Play motion study',exact:true})).toBeVisible();await seek(page,400);
  await page.getByRole('link',{name:'Back to the gallery'}).click();await expect(page.getByRole('button',{name:'Open gallery atlas'})).toBeEnabled({timeout:60000});
  await expect(page.locator('.motion-lab')).toHaveCount(0);
});
