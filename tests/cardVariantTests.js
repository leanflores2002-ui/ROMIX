const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function readPublic(relativePath) {
  return fs.readFileSync(path.join(PUBLIC_DIR, ...relativePath.split('/')), 'utf8');
}

function wait(window, ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function main() {
  const catalogSource = readPublic('assets/js/romix-catalog-pages.js');
  const homeSource = readPublic('index.html');
  const catalogCss = readPublic('assets/css/romix-catalog-pages.css');
  const imageUtilsSource = readPublic('assets/js/romix-image-utils.js');

  assert(catalogSource.includes('colorOption && colorOption.image'), 'Catálogo debe priorizar color.image');
  assert(catalogSource.includes('let variantRequestId = 0'), 'Catálogo debe tener token por card');
  assert(catalogSource.includes('image.currentSrc || image.src'), 'Catálogo debe considerar currentSrc');
  assert(!catalogSource.includes('thumb.classList.remove("is-loaded")'), 'Catálogo no debe ocultar la foto anterior');
  assert(!catalogSource.includes('swatchImage'), 'Catálogo no debe usar fotos como swatches');
  assert(homeSource.includes('setImg(variant, variant.name)'), 'Home debe pasar la variante completa al selector');
  assert(!homeSource.includes('thumbLink.classList.remove("is-loaded")'), 'Home no debe ocultar la foto anterior');
  assert(!homeSource.includes('variant.swatchImage'), 'Home no debe usar fotos como swatches');
  assert(catalogCss.includes('.product-thumb img { object-fit: contain; object-position: center; opacity: 1;'), 'Catálogo debe mantener la imagen visible');
  assert(/\.product-thumb img \{[\s\S]{0,400}?opacity:\s*1;/.test(homeSource), 'Home debe mantener la imagen visible');
  assert(imageUtilsSource.includes('function loadImageResource(src)'), 'Debe existir precarga reutilizable');
  assert(imageUtilsSource.includes('probe.complete && probe.naturalWidth > 0'), 'La precarga debe contemplar caché');

  const dom = new JSDOM(readPublic('catalogo.html'), {
    runScripts: 'outside-only',
    url: 'http://localhost/catalogo.html'
  });
  const { window } = dom;

  class TestImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      this.onload = null;
      this.onerror = null;
      this._src = '';
    }

    set src(value) {
      this._src = value;
      const source = String(value || '');
      const delay = source.includes('gris') ? 35 : source.includes('negro') ? 25 : 5;
      window.setTimeout(() => {
        if (source.includes('broken')) {
          this.complete = true;
          this.naturalWidth = 0;
          if (this.onerror) this.onerror(new Error('broken'));
          return;
        }
        this.complete = true;
        this.naturalWidth = 100;
        if (this.onload) this.onload();
      }, delay);
    }

    get src() {
      return this._src;
    }

    decode() {
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          if (String(this._src).includes('broken')) reject(new Error('broken'));
          else resolve();
        }, String(this._src).includes('gris') ? 35 : String(this._src).includes('negro') ? 25 : 5);
      });
    }
  }

  window.Image = TestImage;
  window.eval(imageUtilsSource);
  window.romixProductsStore = {
    load: async () => [{
      id: 'variant-test',
      name: 'Babucha variante test',
      section: 'mujer',
      type: 'pantalones',
      price: 10000,
      image: 'images/products/default.webp',
      colors: [
        { name: 'Negro', hex: '#000000', image: 'images/products/negro.webp' },
        { name: 'Gris oscuro', hex: '#4B4B4B', image: 'images/products/gris-oscuro.webp' },
        { name: 'Azul', hex: '#1E4ED8', image: 'images/products/azul.webp' },
        { name: 'Estampado 1', hex: '#1F4FA8', image: 'images/products/estampado-1.webp' }
      ],
      sizes: ['2'],
      stockStatus: 'available'
    }],
    isVisible: () => true
  };
  window.romixCart = { updateBadge() {} };
  window.eval(catalogSource);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await wait(window, 45);

  const card = window.document.querySelector('.product-card');
  assert(card, 'Debe renderizarse una card de prueba');
  const image = card.querySelector('.product-thumb img');
  const buttons = Array.from(card.querySelectorAll('.variant-chip'));
  const byName = (name) => buttons.find((button) => button.title === name);
  assert(!/url\(/i.test(byName('Negro').style.backgroundImage), 'Un swatch normal no debe usar una foto');
  assert(byName('Negro').style.background.includes('rgb') || byName('Negro').style.background.includes('#000'), 'Un swatch normal debe usar color.hex');
  assert(byName('Estampado 1').style.background.includes('conic-gradient'), 'Un estampado debe usar swatch multicolor');

  byName('Gris oscuro').click();
  byName('Azul').click();
  await wait(window, 20);
  assert(image.src.endsWith('/images/products/azul.webp'), 'El último click debe ganar la carrera de precarga');
  assert(card.querySelector('.product-thumb').classList.contains('is-loaded'), 'La card debe conservar is-loaded tras cambiar variante');
  assert(card.querySelectorAll('.product-thumb picture source').length === 0, 'No debe quedar un source anterior en picture');

  byName('Azul').click();
  assert(card.querySelector('.product-thumb').classList.contains('is-loaded'), 'Repetir la misma variante no debe ocultar la imagen');
  assert(image.src.endsWith('/images/products/azul.webp'), 'Repetir la variante debe conservar su imagen');

  dom.window.close();
  console.log('cardVariantTests: passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
