const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const {
  buildSharePage,
  productDescription,
  productImage,
  productSlug
} = require('../scripts/generate-share-pages');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'frontend', 'public');
const siteUrl = 'https://romix.example';

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function meta(document, selector) {
  const element = document.querySelector(selector);
  return element ? element.getAttribute('content') || '' : '';
}

function visibleProductFor(products, section) {
  return products.find((product) => product && product.visible !== false && product.section === section);
}

function checkGeneratedPreview(product, section) {
  assert(product, `Missing visible ${section} product fixture`);
  const page = buildSharePage(product, siteUrl);
  const dom = new JSDOM(page.html);
  const document = dom.window.document;
  const expectedUrl = `${siteUrl}/share/${productSlug(product)}/`;
  const expectedImage = new URL(productImage(product).replace(/^\/+/, ''), `${siteUrl}/`).href;

  assert(meta(document, 'meta[property="og:type"]') === 'product', `${section}: og:type must be product`);
  assert(meta(document, 'meta[property="og:site_name"]') === 'ROMIX', `${section}: site name missing`);
  assert(meta(document, 'meta[property="og:title"]') === `${product.name} | ROMIX`, `${section}: product title mismatch`);
  assert(meta(document, 'meta[property="og:description"]') === productDescription(product), `${section}: description mismatch`);
  assert(meta(document, 'meta[property="og:image"]') === expectedImage, `${section}: primary image mismatch`);
  assert(/^https:\/\//.test(meta(document, 'meta[property="og:image"]')), `${section}: image must be absolute HTTPS`);
  assert(meta(document, 'meta[property="og:url"]') === expectedUrl, `${section}: canonical OG URL mismatch`);
  assert(document.querySelector('link[rel="canonical"]')?.href === expectedUrl, `${section}: canonical link mismatch`);
  assert(meta(document, 'meta[name="twitter:card"]') === 'summary_large_image', `${section}: Twitter card missing`);
  assert(meta(document, 'meta[name="twitter:title"]') === `${product.name} | ROMIX`, `${section}: Twitter title mismatch`);
  assert(meta(document, 'meta[name="twitter:image"]') === expectedImage, `${section}: Twitter image mismatch`);
  dom.window.close();
}

function checkSingleClientShareUrl() {
  const productHtml = read('frontend/public/product.html');
  const shareFunction = productHtml.match(/function buildShareUrl\(product\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '';
  assert(shareFunction.includes('share/${encodeURIComponent(slug)}/'), 'Client share URL must target the generated OG page');
  assert(/waBtn\.href\s*=\s*`https:\/\/wa\.me\/\?text=\$\{encodeURIComponent\(shareText\)\}`/.test(productHtml), 'WhatsApp must use the shared URL text');
  assert(/navigator\.share\(\{[\s\S]*?url:\s*shareUrl/.test(productHtml), 'Native share must use shareUrl');
  assert(/clipboard\.writeText\(shareUrl\)/.test(productHtml), 'Copy link must use shareUrl');
  assert(!/document\.querySelector\(['"]meta\[property=['"]og:image/.test(productHtml), 'Preview must not depend on client-side OG mutation');
}

function checkCanonicalConfiguration() {
  const generator = read('scripts/generate-share-pages.js');
  const backend = read('backend/app/main.py');
  assert(!/romi-damas\.netlify\.app|romix-ropas\.vercel\.app/.test(generator), 'Generator must not hardcode a deployment domain');
  assert(!/romi-damas\.netlify\.app|romix-ropas\.vercel\.app/.test(backend), 'Backend must not hardcode a deployment domain');
  assert(generator.includes('ROMIX_SITE_URL'), 'Generator must honor ROMIX_SITE_URL');
  assert(backend.includes('ROMIX_SITE_URL'), 'Backend must honor ROMIX_SITE_URL');
}

const products = JSON.parse(read('frontend/public/assets/data/products.json').replace(/^\uFEFF/, ''));
['mujer', 'hombre', 'ninos'].forEach((section) => checkGeneratedPreview(visibleProductFor(products, section), section));
checkSingleClientShareUrl();
checkCanonicalConfiguration();
console.log('sharePreviewTests: passed');
