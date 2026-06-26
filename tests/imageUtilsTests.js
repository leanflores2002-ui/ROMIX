const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function loadImageUtils() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost/'
  });
  const scriptPath = path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'romix-image-utils.js');
  const source = fs.readFileSync(scriptPath, 'utf8');
  dom.window.eval(source);
  return { dom, utils: dom.window.romixImageUtils };
}

(function main() {
  const { dom, utils } = loadImageUtils();
  const product = {
    image: 'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.png',
    images: [
      'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.png',
      'images/products/chaleco_polar_con_corderito_hombre_invierno_verde.png'
    ],
    imageMap: {
      Negro: 'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.png',
      Verde: 'images/products/chaleco_polar_con_corderito_hombre_invierno_verde.png'
    },
    colors: [
      { name: 'Negro' },
      { name: 'Verde' }
    ],
    thumbnailFallback: 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_negro-thumb.jpg',
    thumbnail: 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_negro-thumb.webp',
    thumbnailAvif: 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_negro-thumb.avif'
  };

  const greenImage = utils.getSafeProductImage(product, 'Verde', 1);
  assert(
    greenImage === 'images/products/chaleco_polar_con_corderito_hombre_invierno_verde.png',
    'La imagen segura debe priorizar la imagen original del color Verde'
  );

  const thumbSources = utils.getSafeProductThumbSources(product, 'Negro', 0);
  assert(
    thumbSources.includes('images/products/chaleco_polar_con_corderito_hombre_invierno_negro.png'),
    'Las miniaturas deben caer a la imagen original del producto cuando falta el thumb'
  );

  const greenThumbSet = utils.getProductThumbSet(product, 'Verde');
  assert(
    greenThumbSet.src === 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_verde-thumb.webp',
    'La miniatura de un color seleccionado debe derivarse de la imagen de ese color, no de la miniatura global'
  );

  const productWithColorGalleries = {
    image: 'images/products/chaleco_negro_1.png',
    colors: [
      {
        name: 'Negro',
        images: [
          'images/products/chaleco_negro_1.png',
          'images/products/chaleco_negro_2.png'
        ]
      },
      {
        name: 'Verde olivo',
        slug: 'verde-olivo',
        imagenes: [
          'images/products/chaleco_verde_1.png',
          'images/products/chaleco_verde_2.png'
        ],
        thumbnail: 'images/thumbs/chaleco_verde_1-thumb.webp'
      }
    ],
    thumbnail: 'images/thumbs/chaleco_negro_1-thumb.webp'
  };

  const resolvedColors = utils.resolveProductColorEntries(productWithColorGalleries);
  assert(
    resolvedColors[1].image === 'images/products/chaleco_verde_1.png',
    'El color debe usar la primera imagen de su propio array como imagen principal'
  );
  assert(
    Array.isArray(resolvedColors[1].images) && resolvedColors[1].images.length === 2,
    'Cada color debe conservar su propio array de imagenes sin mezclar miniaturas'
  );
  assert(
    utils.getColorImage(productWithColorGalleries, 'Verde olivo') === 'images/products/chaleco_verde_1.png',
    'La busqueda por nombre de color debe resolver su primera imagen exacta'
  );

  const img = dom.window.document.createElement('img');
  utils.applyImageWithFallback(
    img,
    [
      'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_negro-thumb.webp',
      'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.png'
    ],
    'Chaleco ROMIX',
    { placeholder: 'images/placeholder-product.png' }
  );
  assert(
    img.getAttribute('src') === 'images/thumbs/chaleco_polar_con_corderito_hombre_invierno_negro-thumb.webp',
    'El primer intento debe usar la ruta inicial pedida'
  );
  img.onerror();
  assert(
    img.getAttribute('src') === 'images/products/chaleco_polar_con_corderito_hombre_invierno_negro.png',
    'Al fallar el thumb debe usar la imagen original como fallback'
  );
  img.onerror();
  assert(
    img.getAttribute('src') === 'images/placeholder-product.png',
    'Si agota las fuentes debe terminar en placeholder'
  );

  console.log('imageUtilsTests: passed');
})();
