const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://projecto-gray.vercel.app';

const TEMPLATE_CANDIDATES = [
  path.join(__dirname, '..', 'frontend', 'public', 'product.html'),
  path.join(__dirname, '..', 'product.html'),
  path.join(process.cwd(), 'frontend', 'public', 'product.html'),
  path.join(process.cwd(), 'product.html')
];

const PRODUCTS_CANDIDATES = [
  path.join(__dirname, '..', 'frontend', 'public', 'assets', 'data', 'products.json'),
  path.join(__dirname, '..', 'assets', 'data', 'products.json'),
  path.join(process.cwd(), 'frontend', 'public', 'assets', 'data', 'products.json'),
  path.join(process.cwd(), 'assets', 'data', 'products.json')
];

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`No se encontro ningun archivo valido: ${candidates.join(', ')}`);
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceMetaContent(html, attrName, attrValue, content) {
  const pattern = new RegExp(
    `(<meta\\s+${attrName}="${escapeRegExp(attrValue)}"\\s+content=")[^"]*(")`,
    'i'
  );
  return html.replace(pattern, `$1${escapeAttr(content)}$2`);
}

function fixUtf8(value) {
  if (!value || typeof value !== 'string') return value;

  let output = value;
  const map = {
    'Ï‰': 'Ãº',
    'â–‹': 'Ã³',
    'Â½': 'Ã³',
    'Ã¯': 'Ã­',
    'Ã‚Â·': 'Â·',
    'Ã‚ ': '',
    'Ã‚': '',
    'ÃƒÂ¡': 'Ã¡',
    'ÃƒÂ©': 'Ã©',
    'ÃƒÃ­': 'Ã­',
    'ÃƒÂ­': 'Ã­',
    'ÃƒÂ³': 'Ã³',
    'ÃƒÂº': 'Ãº',
    'ÃƒÃ±': 'Ã±',
    'ÃƒÂ¼': 'Ã¼'
  };

  try {
    output = decodeURIComponent(escape(output));
  } catch {}

  Object.keys(map).forEach((key) => {
    output = output.split(key).join(map[key]);
  });

  return output;
}

function slugify(value) {
  const clean = fixUtf8(String(value || '')).trim();
  try {
    return clean
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  } catch {
    return clean
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

function normalizeSeason(value) {
  const raw = fixUtf8(String(value || '')).trim().toLowerCase();
  if (!raw) return '';
  try {
    return raw.normalize('NFD').replace(/\p{Diacritic}+/gu, '').replace(/[^a-z0-9]+/g, '');
  } catch {
    return raw.replace(/[^a-z0-9]+/g, '');
  }
}

function shouldHideProduct(product) {
  if (!product || typeof product !== 'object') return false;
  if (product.hidden === true || product.hide === true || product.oculto === true) return true;

  if (Object.prototype.hasOwnProperty.call(product, 'visible')) {
    const visible = String(product.visible).toLowerCase().trim();
    if (visible === 'false' || visible === '0' || visible === 'no') return true;
  }

  if (Object.prototype.hasOwnProperty.call(product, 'active')) {
    const active = String(product.active).toLowerCase().trim();
    if (active === 'false' || active === '0' || active === 'no') return true;
  }

  const state = String(product.visibility || product.state || product.publish || '').toLowerCase().trim();
  if (['hidden', 'oculto', 'draft', 'archived', 'inactive', 'inactivo'].includes(state)) {
    return true;
  }

  return normalizeSeason(product.season || product.seasonKey).includes('verano');
}

function sanitizeProduct(product) {
  if (!product) return product;

  const copy = { ...product };
  ['name', 'type', 'section', 'badge', 'description'].forEach((key) => {
    if (copy[key]) copy[key] = fixUtf8(String(copy[key]));
  });

  if (Array.isArray(copy.colors)) {
    copy.colors = copy.colors.map((color) => ({
      ...color,
      name: fixUtf8(color && color.name)
    }));
  }

  return copy;
}

function sanitizeList(list) {
  return (Array.isArray(list) ? list.map(sanitizeProduct) : []).filter((item) => !shouldHideProduct(item));
}

function loadProducts() {
  const productsPath = resolveExistingPath(PRODUCTS_CANDIDATES);
  const parsed = JSON.parse(readUtf8(productsPath));
  return sanitizeList(parsed);
}

function resolveProductImage(product) {
  if (typeof product.image === 'string' && product.image.trim()) return product.image.trim();

  if (product.images && typeof product.images === 'object') {
    const image = Object.values(product.images).find((value) => typeof value === 'string' && value.trim());
    if (image) return image.trim();
  }

  if (product.designs && typeof product.designs === 'object') {
    const design = Object.values(product.designs).find((value) => typeof value === 'string' && value.trim());
    if (design) return design.trim();
  }

  return '';
}

function toAbsoluteUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(String(value).replace(/^\/+/, ''), `${SITE_ORIGIN}/`).href;
}

function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
}

function capitalize(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildTitle(product) {
  return fixUtf8(product.name || 'Producto ROMIX').trim();
}

function buildDescription(product) {
  const name = fixUtf8(product.name || 'Producto ROMIX').trim();
  const type = capitalize(fixUtf8(product.type || ''));
  const section = fixUtf8(product.section || '').trim();
  const price = formatPrice(product.price);
  const details = [];

  if (type && section) details.push(`${type} para ${section}`);
  else if (type) details.push(type);
  else if (section) details.push(`Seccion ${section}`);

  if (price) details.push(`Precio ${price}`);

  return details.length ? `${name} en ROMIX. ${details.join('. ')}.` : `${name} en ROMIX.`;
}

function buildProductUrl(product) {
  const productId = String(product.id || slugify(product.name || '')).trim();
  const productSlug = String(product.slug || slugify(product.name || '')).trim();
  const params = new URLSearchParams();

  if (productId) params.set('id', productId);
  if (productSlug) params.set('slug', productSlug);

  return `${SITE_ORIGIN}/product.html?${params.toString()}`;
}

function findProduct(products, query) {
  const idParam = String(firstQueryValue(query.id)).trim();
  const slugParam = String(firstQueryValue(query.slug)).trim().toLowerCase();
  const rawName = String(firstQueryValue(query.name)).trim();
  const nameParam = fixUtf8(rawName).toLowerCase();

  let product = null;

  if (idParam) {
    const loweredId = idParam.toLowerCase();
    product = products.find((item) => {
      if (item.id != null) return String(item.id).trim() === idParam;
      return slugify(item.slug || item.name || '') === loweredId;
    });
  }

  if (!product && slugParam) {
    product = products.find((item) => slugify(item.slug || item.name || '') === slugParam);
  }

  if (!product && nameParam) {
    product = products.find((item) => fixUtf8(String(item.name || '')).toLowerCase() === nameParam);
  }

  return product || null;
}

module.exports = function handler(req, res) {
  let html;

  try {
    html = readUtf8(resolveExistingPath(TEMPLATE_CANDIDATES));
  } catch (error) {
    console.error('[api/product] No se pudo cargar product.html', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('No se pudo cargar product.html');
    return;
  }

  try {
    const products = loadProducts();
    const product = findProduct(products, req.query || {});

    if (product) {
      const title = buildTitle(product);
      const description = buildDescription(product);
      const url = buildProductUrl(product);
      const image = toAbsoluteUrl(resolveProductImage(product));

      html = replaceMetaContent(html, 'property', 'og:title', title);
      html = replaceMetaContent(html, 'property', 'og:description', description);
      html = replaceMetaContent(html, 'property', 'og:url', url);
      html = replaceMetaContent(html, 'name', 'twitter:title', title);

      if (image) {
        html = replaceMetaContent(html, 'property', 'og:image', image);
        html = replaceMetaContent(html, 'name', 'twitter:image', image);
      }
    }
  } catch (error) {
    console.error('[api/product] Error generando metadatos OG', error);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
};
