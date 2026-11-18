/* Browser smoke test for seasonal preview; designed for CI, no admin login required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    fs.mkdirSync(path.join(process.cwd(),'artifacts'), { recursive:true });
    const page = await browser.newPage({ viewport:{width:1440,height:900}, deviceScaleFactor:1 });
    const errors = [];
    // Jump immediately for screenshots: sitewide smooth-scrolling is intentional,
    // but taking a screenshot mid-transition would capture the wrong section.
    async function jumpTo(target, offset=0, currentPage=page) {
      await currentPage.evaluate(({target, offset}) => {
        const el=document.querySelector(target);
        if (!el) throw new Error('Screenshot target missing: '+target);
        const top=el.getBoundingClientRect().top+window.scrollY+offset-85;
        window.scrollTo({top,behavior:'instant'});
      }, {target,offset});
      await currentPage.waitForTimeout(450);
    }
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/', {waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('.product-card').first().waitFor({timeout:35000});
    assert.match(await page.locator('.hero h1').innerText(),/gratitude/i);
    assert.equal(await page.locator('.harvest-feature').count(),1);
    assert.ok(await page.locator('.product-card').count()>0,'Products must render from existing catalog');
    assert.equal(await page.locator('link[href="/harvest-finale.css"]').count(),1);
    const titleColor = await page.locator('.product-title').first().evaluate(el=>getComputedStyle(el).color);
    const descriptionColor = await page.locator('.product-description').first().evaluate(el=>getComputedStyle(el).color);
    const priceColor = await page.locator('.product-price').first().evaluate(el=>getComputedStyle(el).color);
    assert.ok(titleColor&&descriptionColor&&priceColor);
    await page.screenshot({path:'artifacts/thanksgiving-desktop.png',fullPage:false,animations:'disabled'});
    await jumpTo('.harvest-gratitude');
    await page.screenshot({path:'artifacts/thanksgiving-gratitude.png',fullPage:false,animations:'disabled'});
    await jumpTo('#catalog');
    await page.screenshot({path:'artifacts/thanksgiving-catalog-desktop.png',fullPage:false,animations:'disabled'});
    await jumpTo('#catalog',360);
    await page.screenshot({path:'artifacts/thanksgiving-products-desktop.png',fullPage:false,animations:'disabled'});
    const initialText = await page.locator('#harvestGratitudeEnglish').innerText();
    await page.locator('#harvestNextNote').click();
    assert.notEqual(await page.locator('#harvestGratitudeEnglish').innerText(),initialText);
    assert.ok((await page.locator('#harvestGratitudeSpanish').innerText()).length>15);
    const firstProductName = await page.locator('.product-card .product-title').first().innerText();
    const searchTerm = firstProductName.split(/\s+/).find(x=>x.length>=3) || firstProductName;
    await page.locator('#harvestProductSearch').fill(searchTerm);
    assert.ok(await page.locator('.product-card:visible').count()>0,'Search should find product');
    await page.locator('#harvestClearSearch').click();
    assert.equal(await page.locator('#harvestProductSearch').inputValue(),'');
    await page.locator('.product-card').first().click();
    assert.ok(await page.locator('#productModal').evaluate(el=>el.classList.contains('show')),'Product modal should open');
    assert.ok(await page.locator('#modalBody .product-price').count());
    assert.ok(await page.locator('#modalBody a[href^="https://wa.me/"]').count());
    await page.locator('#closeModal').click();
    assert.equal(await page.locator('#productModal').evaluate(el=>el.classList.contains('show')),false);
    assert.equal(errors.length,0,'No uncaught browser errors: '+errors.join(' | '));
    console.log('PASS desktop: catalog, colors, gratitude, search, modal, contact options, no page errors');

    const mobile = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
    mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto('http://127.0.0.1:3000/',{waitUntil:'domcontentloaded',timeout:30000});
    await mobile.locator('.product-card').first().waitFor({timeout:35000});
    await mobile.screenshot({path:'artifacts/thanksgiving-mobile.png',fullPage:false,animations:'disabled'});
    const heroButtonHeight = await mobile.locator('.hero-copy .button').evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(heroButtonHeight<=56,'Mobile CTA text should stay on one line: '+heroButtonHeight);
    await jumpTo('#catalog',410,mobile);
    await mobile.screenshot({path:'artifacts/thanksgiving-catalog-mobile.png',fullPage:false,animations:'disabled'});
    const dimensions = await mobile.evaluate(()=>({body:document.documentElement.scrollWidth, viewport:window.innerWidth}));
    assert.ok(dimensions.body<=dimensions.viewport+3,'Mobile horizontal overflow: '+JSON.stringify(dimensions));
    await mobile.locator('#harvestProductSearch').fill('a');
    assert.ok(await mobile.locator('.product-card:visible').count()>0);
    console.log('PASS mobile: no horizontal overflow, products visible, search functional');

    const reduced = await browser.newPage({viewport:{width:800,height:700},reducedMotion:'reduce'});
    await reduced.goto('http://127.0.0.1:3000/',{waitUntil:'domcontentloaded',timeout:30000});
    await reduced.locator('.product-card').first().waitFor({timeout:35000});
    assert.equal(await reduced.locator('.harvest-ambient-toggle').count(),0,'Reduced-motion mode should not run ambient animations');
    await reduced.locator('#harvestProductSearch').fill('a');
    assert.ok(await reduced.locator('.product-card:visible').count()>0);
    console.log('PASS reduced motion: no ambient animation and catalog search remains functional');
    await mobile.close();await reduced.close();await page.close();
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
