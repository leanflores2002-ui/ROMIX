const {chromium}=require('playwright');
const fs=require('node:fs');
const phase=process.argv[2]||'before';
const base='http://127.0.0.1:8765';
(async()=>{
 console.log('Launching Chromium');
 const browser=await chromium.launch({headless:true,timeout:30000});
 console.log('Chromium ready');
 const results=[];
 for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  const context=await browser.newContext({viewport});
  for(const route of ['/','/index.html','/catalogo.html','/mujer.html','/hombre.html','/ninos.html','/novedades.html','/product.html','/cart.html']){
   const page=await context.newPage(),errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
   console.log('Checking',viewport.width,route);
   await page.goto(base+route,{waitUntil:'load',timeout:30000});
   await page.evaluate(async()=>{await Promise.all([...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0;}).map(img=>Promise.race([img.decode().catch(()=>{}),new Promise(r=>setTimeout(r,5000))])));});
   const state=await page.evaluate(()=>({title:document.title,textLength:document.body.innerText.length,overflow:document.documentElement.scrollWidth>innerWidth+1,brokenVisibleImages:[...document.images].filter(i=>i.getBoundingClientRect().width>0&&i.getBoundingClientRect().top<innerHeight&&i.complete&&!i.naturalWidth).map(i=>i.currentSrc)}));
   await page.addScriptTag({path:require.resolve('axe-core')});
   const accessibility=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,count:v.nodes.length}));});
   if(route==='/'){
    await page.screenshot({path:`storage-${phase}-${viewport.width}.png`});
    state.productLink=await page.locator('a[href*="product.html?"]').first().getAttribute('href').catch(()=>null);
   }
   results.push({route,viewport,state,errors,failed,accessibility});
   fs.writeFileSync(`storage-browser-${phase}.json`,JSON.stringify(results,null,2));
   await page.close();
  }
  await context.close();
 }
 await browser.close();
 fs.writeFileSync(`storage-browser-${phase}.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(r=>({route:r.route,width:r.viewport.width,overflow:r.state.overflow,errors:r.errors.length,failed:r.failed.length,broken:r.state.brokenVisibleImages.length,axe:r.accessibility})),null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
