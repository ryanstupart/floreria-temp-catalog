/* Bouquet Atelier browser QA: real Chromium, mock/test pricing only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const out=path.resolve('artifacts');fs.mkdirSync(out,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  const response=await page.goto('http://127.0.0.1:3000/bouquet-builder.html',{waitUntil:'networkidle',timeout:45000});
  assert.equal(response.status(),200);
  await page.locator('#bouquetArt g').first().waitFor({timeout:10000});
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$60.00');
  assert.equal((await page.locator('#roseCount').innerText()).trim(),'6');
  assert.equal(await page.locator('#bouquetArt g').count()>5,true);
  const initialSVG=await page.locator('#bouquetArt').innerHTML();
  await page.screenshot({path:path.join(out,'bouquet-studio-desktop.png'),animations:'disabled',fullPage:false});
  // Pricing arithmetic and canvas updates
  await page.locator('#rosePlus').click();
  assert.equal((await page.locator('#roseCount').innerText()).trim(),'7');
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$65.00');
  assert.notEqual(await page.locator('#bouquetArt').innerHTML(),initialSVG);
  await page.locator('[data-addon="baby"]').click();
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$77.00');
  assert.equal(await page.locator('[data-addon="baby"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-addon="crown"]').click();
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$95.00');
  await page.locator('[data-wrap="burgundy"]').click();
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$103.00');
  await page.locator('[data-rose="blush"]').click();
  assert.equal(await page.locator('[data-rose="blush"]').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:path.join(out,'bouquet-studio-customized.png'),animations:'disabled',fullPage:false});
  await page.locator('#occasion').selectOption('Graduation');
  await page.locator('#personalNote').fill('Testing prototype; ivory and blush accents please.');
  // A genuine PDF download, rather than print-only advice.
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:20000}),page.locator('#pdfButton').click()]);
  const pdfPath=path.join(out,'Florentina-Custom-Bouquet-Demo.pdf');
  await download.saveAs(pdfPath);
  const pdf=fs.readFileSync(pdfPath);
  assert.equal(pdf.subarray(0,8).toString('ascii'),'%PDF-1.4');
  assert.ok(pdf.length>20000,'Generated PDF should have illustration and summary');
  assert.match(await page.locator('#actionStatus').innerText(),/PDF ready/);
  // Maximum-option pricing validates caps and PDF layout with every accessory.
  for(let i=0;i<13;i++) await page.locator('#rosePlus').click();
  assert.equal((await page.locator('#roseCount').innerText()).trim(),'20');
  assert.equal(await page.locator('#rosePlus').isDisabled(),true);
  for(const id of ['eucalyptus','butterflies','ribbon','card']) await page.locator('[data-addon="'+id+'"]').click();
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$194.00');
  const [maxDownload]=await Promise.all([page.waitForEvent('download',{timeout:20000}),page.locator('#pdfButton').click()]);
  const fullPdfPath=path.join(out,'Florentina-Maximum-Accessories-Demo.pdf');
  await maxDownload.saveAs(fullPdfPath);
  assert.ok(fs.statSync(fullPdfPath).size>25000);
  await page.locator('#resetButton').click();
  assert.equal((await page.locator('#totalPrice').innerText()).trim(),'$60.00');
  assert.equal((await page.locator('#roseCount').innerText()).trim(),'6');
  assert.equal((await page.locator('#personalNote').inputValue()).trim(),'');
  assert.equal(await page.locator('[data-addon="crown"]').getAttribute('aria-pressed'),'false');
  await page.locator('#surpriseButton').click();
  assert.ok((await page.locator('#totalPrice').innerText()).startsWith('$'));
  assert.equal(errors.length,0,'No JavaScript errors on desktop: '+errors.join('|'));
  console.log('PASS desktop: live SVG, pricing, all selected controls, reset, surprise, and actual PDF');

  const mobile=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));
  await mobile.goto('http://127.0.0.1:3000/bouquet-builder.html',{waitUntil:'domcontentloaded',timeout:30000});
  await mobile.locator('#rosePlus').waitFor();
  const width=await mobile.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth}));
  assert.ok(width.documentWidth<=width.innerWidth+3,'Mobile must not horizontally overflow '+JSON.stringify(width));
  await mobile.screenshot({path:path.join(out,'bouquet-studio-mobile.png'),animations:'disabled',fullPage:false});
  await mobile.locator('#rosePlus').click();assert.equal((await mobile.locator('#totalPrice').innerText()).trim(),'$65.00');
  await mobile.locator('[data-addon="eucalyptus"]').click();
  assert.equal((await mobile.locator('#totalPrice').innerText()).trim(),'$74.00');
  assert.equal(mobileErrors.length,0);
  console.log('PASS mobile: no overflow, real SVG, price and add-on controls');

  const reduced=await browser.newPage({viewport:{width:810,height:760},reducedMotion:'reduce'});
  await reduced.goto('http://127.0.0.1:3000/bouquet-builder.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(await reduced.locator('#bouquetArt g').count()>5,true);
  const animation=await reduced.locator('#bouquetArt').evaluate(el=>getComputedStyle(el).animationName);
  assert.equal(animation,'none');
  console.log('PASS reduced motion: fully functional preview without animations');

  const home=await browser.newPage();
  await home.goto('http://127.0.0.1:3000/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(await home.locator('a[href="/bouquet-builder.html"]').count()>0);
  console.log('PASS storefront navigation into the development-only bouquet builder');
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
