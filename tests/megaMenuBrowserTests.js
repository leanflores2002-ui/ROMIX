const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE_URL = process.env.ROMIX_TEST_URL || 'http://127.0.0.1:4173/index.html';
const SCREENSHOT_DIR = process.env.ROMIX_SCREENSHOTS || '';
if (SCREENSHOT_DIR) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function isOpen(page, key) {
  return page.locator(`#mega-panel-${key}`).getAttribute('aria-hidden').then((value) => value === 'false');
}

async function testDesktop(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('header.site-header.romix-shared-header');

  const mujer = page.locator('#mega-trigger-mujer');
  const mujerPanel = page.locator('#mega-panel-mujer');
  await mujer.hover();
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), true, `Mujer should open at ${width}px`);
  if (SCREENSHOT_DIR && width === 1440) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'romix-mega-desktop.png') });
  }

  const panelBox = await mujerPanel.boundingBox();
  assert.ok(panelBox && panelBox.height <= 320, `Mujer panel should stay compact at ${width}px (got ${panelBox ? panelBox.height : 'none'}px)`);
  assert.equal(await page.locator('.mega-panel-link .mega-link-icon').count(), 0, 'Mega links should not render icons');
  assert.equal(await page.locator('.mega-panel-link .mega-link-badge').count(), 0, 'Mega links should not render badges');

  await mujerPanel.hover();
  await wait(140);
  assert.equal(await isOpen(page, 'mujer'), true, 'Panel should remain open while pointer is inside it');

  await page.locator('#mega-trigger-hombre').hover();
  await wait(120);
  assert.equal(await isOpen(page, 'hombre'), true, 'Hombre should switch directly from Mujer');
  assert.equal(await isOpen(page, 'mujer'), false, 'Mujer should close when Hombre opens');

  await page.keyboard.press('Escape');
  await wait(30);
  assert.equal(await isOpen(page, 'hombre'), false, 'Escape should close the mega menu');

  await page.locator('#mega-trigger-mujer').hover();
  await wait(120);
  await page.mouse.click(12, Math.min(height - 20, 500));
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), false, 'Clicking outside should close the mega menu');

  await page.locator('#mega-trigger-mujer').hover();
  await wait(120);
  await page.locator('[data-search-toggle="true"]').first().click();
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), false, 'Opening search should close the mega menu');

  await page.locator('[data-search-toggle="true"]').first().click();
  await page.locator('#mega-trigger-mujer').hover();
  await wait(120);
  await page.locator('#toggle-utility-menu').click();
  await wait(120);
  assert.equal(await isOpen(page, 'mujer'), false, 'Opening utilities should close the mega menu');
  assert.equal(await page.locator('#header-utility-panel').getAttribute('aria-hidden'), 'false');
}

async function testMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('header.site-header.romix-shared-header');

  assert.equal(await page.locator('.mega-promo').first().isVisible(), false, 'Desktop promo should be hidden in mobile drawer');
  await page.locator('#toggle-mobile-nav').click();
  await wait(80);
  assert.equal(await page.locator('body').evaluate((node) => node.classList.contains('mobile-nav-open')), true);
  await page.locator('#mega-trigger-mujer').click();
  await wait(80);
  assert.equal(await isOpen(page, 'mujer'), true, 'Mobile Mujer accordion should still open');
  if (SCREENSHOT_DIR) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'romix-mega-mobile.png') });
  }
  assert.equal(await page.locator('.mega-promo').first().isVisible(), false, 'Mobile accordion should not show promo media');
  assert.ok(await page.locator('body').evaluate((node) => node.scrollWidth <= window.innerWidth), 'Mobile page should not overflow horizontally');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await testDesktop(page, 1366, 768);
  await testDesktop(page, 1440, 900);
  await testDesktop(page, 1920, 1080);
  await testMobile(page);
  assert.deepEqual(errors, [], `Browser page errors: ${errors.join('; ')}`);
  await browser.close();
  console.log('megaMenuBrowserTests: ok');
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
