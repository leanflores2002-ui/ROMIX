const {chromium}=require('playwright');
const fs=require('node:fs');
const phase=process.argv[2]||'after';
const base='http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:width===390?844:width===768?1024:900}});
  page.on('dialog',d=>d.dismiss());
  const row={width,checks:{}};
  await page.goto(base,{waitUntil:'load'});
  await page.locator('a[href*="product.html?"]').first().waitFor();
  const link=await page.locator('a[href*="product.html?"]').first().getAttribute('href');
  if(width<1000){
   await page.locator('#toggle-mobile-nav').click();
   row.checks.menu=await page.locator('#toggle-mobile-nav').getAttribute('aria-expanded')==='true';
   await page.locator('#close-mobile-nav').click();
  } else {
   await page.locator('#mega-trigger-mujer').hover();
   await page.locator('#mega-panel-mujer').waitFor({state:'visible',timeout:5000});
   row.checks.menu=await page.locator('#mega-panel-mujer').isVisible();
   await page.mouse.move(0,0);
  }
  await page.locator('[data-search-toggle]:visible').first().click();
  await page.locator('input[type="search"]').fill('calza');
  await page.locator('#romix-search-results a').first().waitFor({timeout:10000});
  row.checks.search=(await page.locator('#romix-search-results a').count())>0;
  await page.goto(base+'/'+link,{waitUntil:'load'});
  await page.locator('#color-options button').first().waitFor();
  row.title=await page.locator('h1:visible').first().innerText();
  const colors=page.locator('#color-options button');
  row.colorCount=await colors.count();
  row.colorSelections=[];
  for(let i=0;i<Math.min(3,row.colorCount);i++){
   await colors.nth(i).click();
   const name=await page.locator('#selectedColorName').innerText();
   const visibleImages=await page.locator('#main-image').count();
   const state=visibleImages ? await page.locator('#main-image').evaluate(async img=>{await img.decode().catch(()=>{});return {src:img.currentSrc,loaded:img.naturalWidth>0};}) : await page.evaluate(()=>{const img=document.querySelector('.main-image img, .product-main-image, #product-main-image');return img?{src:img.currentSrc,loaded:img.naturalWidth>0}:null;});
   row.colorSelections.push({name,image:state});
  }
  const sizes=page.locator('#size-options button:not([disabled])');
  if(await sizes.count()) await sizes.first().click();
  await page.locator('#btn-add').click();
  row.cart=await page.evaluate(()=>window.romixCart.getCart());
  row.checks.colors=row.colorSelections.every(s=>s.image&&s.image.loaded)&&new Set(row.colorSelections.map(s=>s.image.src)).size>1;
  row.checks.cart=row.cart.length>0;
  await page.screenshot({path:`storage-product-${phase}-${width}.png`});
  await page.goto(base+'/cart.html',{waitUntil:'load'});
  row.checks.cartPage=(await page.locator('body').innerText()).includes(row.title);
  results.push(row);
  fs.writeFileSync(`storage-interactions-${phase}.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(row));
  if(Object.values(row.checks).some(v=>!v)) process.exitCode=1;
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
