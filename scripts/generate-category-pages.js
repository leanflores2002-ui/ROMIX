const fs = require('node:fs');
const path = require('node:path');
const {categories, publicProducts} = require('../frontend/public/assets/js/catalog-sections');
const imageUtils = require('../frontend/public/assets/js/romix-image-utils');
const {productSlug, detailHref, escapeHtml} = require('./generate-share-pages');
const publicDir = path.resolve(__dirname, '../frontend/public');
const cardTemplate = fs.readFileSync(path.resolve(__dirname, '../frontend/src/templates/partials/category-card.html'), 'utf8');

function renderCategory(category, catalogHtml, products, origin) {
  const list = publicProducts(products, category.key);
  const cards = renderCards(list);
  const canonical = `${origin}/${category.key}/`;
  let html = catalogHtml.replace('<head>', '<head>\n  <base href="/" />')
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(category.title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, before, after) => before + canonical + after)
    .replace(/(<meta (?:name|property)="(description|og:title|og:description|og:url|twitter:title|twitter:description)" content=")[^"]*(")/g,
      (_, before, key, after) => before + escapeHtml(key.endsWith('title') ? category.title : key === 'og:url' ? canonical : category.description) + after)
    .replace('data-catalog-scope="catalogo"', `data-catalog-scope="${category.key}" data-category-page="${category.key}"`)
    .replace(/(<h1 id="page-title"[^>]*>)[\s\S]*?(<\/h1>)/, (_, before, after) => `${before}Ropa para ${escapeHtml(category.label.toLowerCase())} ROMIX${after}`)
    .replace('<!-- ROMIX:CATEGORY:INTRO -->', () => `<p class="catalog-intro">${escapeHtml(category.intro)}</p>`)
    .replace(/<!-- ROMIX:CATALOG:STATIC:START -->[\s\S]*?<!-- ROMIX:CATALOG:STATIC:END -->|<!-- ROMIX:CATEGORY:PRODUCTS -->/, () => cards)
    .replace('Cargando catálogo...', `${list.length} productos publicados`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, match => match.includes('catálogo interactivo')
      ? '<noscript><p class="catalog-noscript">Podés abrir cada producto del listado. Activá JavaScript para usar los filtros interactivos.</p></noscript>' : match);
  return html;
}

function renderCards(list) {
  return list.map(product => {
    const thumbnail = imageUtils.getThumbPath(product.image);
    const image = fs.existsSync(path.join(publicDir, thumbnail)) ? thumbnail : product.image;
    const priceValues = product.priceByGroup && typeof product.priceByGroup === 'object'
      ? Object.values(product.priceByGroup).map(Number).filter(value => Number.isFinite(value) && value > 0)
      : [];
    const uniquePrices = [...new Set(priceValues)].sort((a, b) => a - b);
    const price = uniquePrices.length > 1
      ? `Desde $${uniquePrices[0].toLocaleString('es-AR')}`
      : `$${Number(product.price || uniquePrices[0] || 0).toLocaleString('es-AR')}`;
    const priceEntries = product.priceByGroup && typeof product.priceByGroup === 'object'
      ? Object.entries(product.priceByGroup)
        .map(([key, value]) => ({key, value: Number(value)}))
        .filter(entry => Number.isFinite(entry.value) && entry.value > 0)
        .sort((a, b) => a.value - b.value)
      : [];
    const priceNote = uniquePrices.length > 1
      ? priceEntries.map(({key, value}) => {
        const secondSizes = Array.isArray(product.specialSizes2) && product.specialSizes2.length
          ? product.specialSizes2
          : product.superSpecialSizes;
        const special = key === 'special' ? product.specialSizes : key === 'special2' ? secondSizes : null;
        const sizes = Array.isArray(special)
          ? special.map(size => String(size && typeof size === 'object' ? size.size || size.label : size).trim()).filter(Boolean)
          : [];
        const sizeText = key === 'special2' && sizes.length > 1
          ? sizes.slice(0, -1).join(', ') + ' y ' + sizes[sizes.length - 1]
          : sizes.join(', ');
        const label = sizeText
          ? (key === 'special2' && sizes.length === 1 ? 'Talle ' : 'Talles ') + sizeText
          : key === 'common' ? 'Talles comunes'
            : key === 'special2' ? 'Otros talles'
              : key === 'special' ? 'Talles especiales' : key;
        return label + ': ' + String.fromCharCode(36) + value.toLocaleString('es-AR');
      }).join(' · ')
      : '';
    const variants = Array.isArray(product.colors)
      ? product.colors.slice(0, 4).map((color, index) => {
        const source = color && (color.thumb || color.thumbnail || color.image);
        const thumb = imageUtils.getThumbPath(source || product.image);
        const fallback = fs.existsSync(path.join(publicDir, thumb)) ? thumb : (color && color.image) || product.image;
        const label = escapeHtml((color && color.name) || `Variante ${index + 1}`);
        return `<button type="button" class="product-variant-thumb${index === 0 ? ' is-active' : ''}" data-variant-index="${index}" data-variant-src="${escapeHtml(fallback)}" aria-label="Ver variante ${label}" aria-pressed="${index === 0 ? 'true' : 'false'}" aria-current="${index === 0 ? 'true' : 'false'}"><img src="${escapeHtml(fallback)}" alt="${label}" width="96" height="128" loading="lazy" decoding="async" /></button>`;
      }).join('') : '';
    const more = Array.isArray(product.colors) && product.colors.length > 4
      ? `<span class="product-variant-more" aria-label="Hay ${product.colors.length - 4} variantes adicionales">+${product.colors.length - 4}</span>` : '';
    const colorCount = Array.isArray(product.colors) ? product.colors.length : 0;
    const colorCountMarkup = colorCount > 0
      ? `<p class="product-color-count"><span data-romix-icon="Palette" data-romix-icon-size="sm" aria-hidden="true"></span><span>${colorCount}${colorCount === 1 ? ' color disponible' : ' colores disponibles'}</span></p>`
      : '';
    const badgeLabel = String(product.badge || product.featuredBadge || '').trim();
    const fields = {
      DETAIL: detailHref(product, productSlug(product)),
      NAME: product.name, IMAGE: image, PRICE: price,
      BADGE: badgeLabel ? '<span class="product-tag">' + escapeHtml(badgeLabel) + '</span>' : '',
      VARIANTS: variants || more ? '<div class="product-variant-thumbs" aria-label="Variantes fotográficas">' + variants + more + '</div>' : '',
      PRICE_NOTE: priceNote ? '<span class="romix-price-range-note">' + escapeHtml(priceNote) + '</span>' : '',
      COLOR_COUNT: colorCountMarkup
    };
    return cardTemplate.replace(/%%([A-Z_]+)%%/g, (_, key) => ['BADGE', 'VARIANTS', 'PRICE_NOTE', 'COLOR_COUNT'].includes(key) ? fields[key] : escapeHtml(fields[key] || ''));
  }).join('\n');
}
function renderCatalog(html) {
  const products = require('../frontend/public/assets/data/products.json');
  return html.replace('<!-- ROMIX:CATEGORY:PRODUCTS -->', () => '<!-- ROMIX:CATALOG:STATIC:START -->' + renderCards(publicProducts(products)) + '<!-- ROMIX:CATALOG:STATIC:END -->')
    .replace('Cargando catálogo...', `${publicProducts(products).length} productos publicados`)
    .replace('El catálogo interactivo necesita JavaScript. También podés consultar productos y disponibilidad por WhatsApp desde el pie de página.', 'Podés abrir cada producto del listado. Activá JavaScript para usar los filtros interactivos.');
}

function main(catalogHtml, origin) {
  const products = JSON.parse(fs.readFileSync(path.join(publicDir, 'assets/data/products.json'), 'utf8'));
  const rendered = categories.map(category => ({category, html: renderCategory(category, catalogHtml, products, origin)}));
  for (const {category, html} of rendered) {
    const dir = path.join(publicDir, category.key);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }
  console.log('Category pages generated: ' + rendered.length);
}

module.exports = {renderCategory, renderCatalog, main, categories};
