const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadPricing() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'http://localhost/'
  });
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'frontend', 'public', 'assets', 'js', 'romix-pricing.js'),
    'utf8'
  );
  dom.window.eval(source);
  return dom;
}

function assertNoOffer(pricing, product, label) {
  const info = pricing.getSaleInfo(product);
  const display = pricing.createPriceDisplay(product);
  assert(info.isOnSale === false, label + ': must not be treated as a sale');
  assert(info.discountPercent === 0, label + ': discount must be zero');
  assert(info.savings === 0, label + ': savings must be zero');
  assert(!display.querySelector('.romix-discount-pill'), label + ': must not render OFF badge');
  assert(!display.querySelector('.romix-price-original'), label + ': must not render old price');
  assert(!display.querySelector('.romix-savings-label'), label + ': must not render savings');
}

(function main() {
  const dom = loadPricing();
  const pricing = dom.window.romixPricing;

  assert(pricing, 'romixPricing must be exposed globally');
  assertNoOffer(pricing, { price: 18016 }, 'missing original price');
  assertNoOffer(pricing, { price: 18016, originalPrice: 18016 }, 'equal original price');
  assertNoOffer(pricing, { price: 18016, originalPrice: 17000 }, 'lower original price');

  const saleProduct = { price: 18016, originalPrice: 30534 };
  const sale = pricing.getSaleInfo(saleProduct);
  const display = pricing.createPriceDisplay(saleProduct);
  assert(sale.isOnSale === true, 'real discount must be treated as a sale');
  assert(sale.discountPercent === 41, 'real discount must calculate 41% OFF');
  assert(sale.savings === 12518, 'real discount must calculate exact savings');
  assert(display.querySelector('.romix-discount-pill').textContent === '41% OFF', 'badge must contain calculated percentage');
  assert(display.querySelector('.romix-price-original').textContent.includes('$30.534'), 'old price must use AR formatting');
  assert(display.querySelector('.romix-savings-label').textContent === 'Ahorrás $12.518', 'savings must use AR formatting');

  const groupedProduct = {
    price: 7000,
    priceByGroup: {common: 7000, special: 7800, special2: 8300},
    specialSizes: [6, 7, 8],
    specialSizes2: [],
    superSpecialSizes: [9, 10]
  };
  const groupedNote = pricing.createCardPriceDisplay(groupedProduct)
    .querySelector('.romix-price-range-note').textContent;
  assert(groupedNote.includes('Talles 9 y 10: $8.300'), 'Las cards deben nombrar los talles reales del segundo grupo');
  assert(!groupedNote.includes('special2'), 'Las cards no deben mostrar claves internas de precios');

  const childProduct = {
    price: 4500,
    priceByGroup: {common: 4500, special: 5000, special2: 5000},
    specialSizes: [12, 14, 16],
    superSpecialSizes: [18]
  };
  const childNote = pricing.createCardPriceDisplay(childProduct)
    .querySelector('.romix-price-range-note').textContent;
  assert(childNote.includes('Talle 18: $5.000'), 'El segundo grupo debe respetar otros talles declarados');

  const apiShape = pricing.getSaleInfo({ base_price: '18016', compare_at_price: '30534' });
  assert(apiShape.isOnSale && apiShape.discountPercent === 41, 'API snake_case aliases must be supported');

  const variantDisplay = pricing.createPriceDisplay(saleProduct, { currentPrice: 30534 });
  assert(variantDisplay.dataset.onSale === 'false', 'a variant price equal to original must not show a sale');
  assert(!variantDisplay.querySelector('.romix-discount-pill'), 'invalid variant discount must not leave empty sale UI');

  dom.window.close();
  console.log('salePricingTests: passed');
})();
