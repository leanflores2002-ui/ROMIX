const fs = require('node:fs');
const path = require('node:path');

const templateDir = path.join(__dirname, '..', 'frontend', 'src', 'templates');
const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const pages = ['index.html', 'catalogo.html', 'product.html', 'cart.html', 'ayuda.html', 'privacidad.html', 'terminos.html', '404.html'];
const generatedPages = [...pages, ...require('../frontend/public/assets/js/catalog-sections').categories.map(category => `${category.key}/index.html`)];
const partials = ['header', 'footer'];

function renderPage(page, sourceDir = templateDir) {
  if (!pages.includes(page)) throw new Error('Unknown storefront page');
  let html = fs.readFileSync(path.join(sourceDir, page), 'utf8');
  for (const kind of partials) {
    const marker = '<!-- ROMIX:INCLUDE:' + kind.toUpperCase() + ' -->';
    if (html.split(marker).length !== 2) throw new Error(page + ': expected exactly one ' + kind + ' include');
    const partial = fs.readFileSync(path.join(sourceDir, 'partials', kind + '.html'), 'utf8');
    html = html.replace(marker, () => partial);
  }
  if (html.includes('<!-- ROMIX:INCLUDE:')) throw new Error(page + ': unresolved include');
  const origin = require('./generate-share-pages').deploymentSiteUrl();
  html = html.replaceAll('%%ROMIX_SITE_ORIGIN%%', origin);
  html = html.replace('<head>', '<head>\n  <link rel="stylesheet" href="/assets/css/romix-assistant.css?v=1">\n  <script src="/assets/js/product-url.js?v=1"></script>');
  if (page === 'catalogo.html') html = require('./generate-category-pages').renderCatalog(html);
  return html;
}

function main() {
  const {detailHref} = require('./generate-share-pages');
  const {sharePrices} = require('./share-prices');
  const products = JSON.parse(fs.readFileSync(path.join(publicDir, 'assets/data/products.json'), 'utf8'));
  const assistantCatalog = products.filter(p => p && p.visible !== false).map(p => ({name:p.name, type:p.type, section:p.section, href:detailHref(p), priceText:sharePrices(p), sizes:(p.sizes || []).map(s => String(typeof s === 'object' ? s.size || s.label || '' : s)), colors:(p.colors || []).map(c => String(typeof c === 'object' ? c.name || '' : c))}));
  fs.writeFileSync(path.join(publicDir, 'assets/data/assistant-catalog.json'), JSON.stringify(assistantCatalog));
  const cssDir = path.join(publicDir, "assets", "css");
  const homeStyles = ["romix-design-system.css", "romix-home-pro.css", "romix-minimal-theme.css", "romix-pricing.css", "romix-header.css"];
  fs.writeFileSync(path.join(cssDir, "romix-home-bundle.css"), homeStyles.map(file => fs.readFileSync(path.join(cssDir, file), "utf8")).join("\n"));
  // Render every page before writing, so invalid templates leave the output intact.
  const rendered = pages.map(page => ({page, html: renderPage(page)}));
  for (const {page, html} of rendered) fs.writeFileSync(path.join(publicDir, page), html, 'utf8');
  require('./generate-category-pages').main(renderPage('catalogo.html'),
    require('./generate-share-pages').deploymentSiteUrl());
  console.log('Storefront pages generated: ' + rendered.length);
}

if (require.main === module) main();
module.exports = {main, renderPage, pages, generatedPages};
