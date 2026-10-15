const assert = require('node:assert/strict');
const { initAnalytics } = require('../frontend/public/assets/js/romix-analytics');
function load(hostname) {
  const listeners = {}, scripts = [], window = { addEventListener: (name, handler) => { listeners[name] = handler; } };
  const context = { window, location: { hostname, href: `https://${hostname}/product.html?id=p1&message=private&phone=123` }, document: { referrer: 'https://example.com/?phone=private', createElement: () => ({}), head: { appendChild: script => scripts.push(script) } }, URL, Date };
  initAnalytics(context);
  return { window, listeners, scripts, context };
}
for (const host of ['localhost', '127.0.0.1', 'romix-preview.vercel.app', 'romix-preview.netlify.app']) {
  const test = load(host);
  assert.equal(test.scripts.length, 0, 'Nonproduction must not load Google');
  assert.equal(test.window.dataLayer, undefined);
}
const test = load('romix-ropas.vercel.app');
assert.equal(test.scripts.length, 1);
initAnalytics(test.context);
assert.equal(test.scripts.length, 1, 'Duplicate initialization must not duplicate page views');
assert.ok(test.window.dataLayer.every(entry => Object.prototype.toString.call(entry) === '[object Arguments]'), 'Google tag commands require the official arguments format');
const commands = Array.from(test.window.dataLayer);
assert.equal(commands.filter(entry => entry[0] === 'js').length, 1);
assert.equal(commands.filter(entry => entry[0] === 'config').length, 1, 'One Google config sends one automatic page view');
const config = commands.find(entry => entry[0] === 'config')[2];
assert.notEqual(config.send_page_view, false);
assert.equal(config.page_location, 'https://romix-ropas.vercel.app/product.html?id=p1');
assert.equal(config.page_referrer, 'https://example.com/');
const product = { id: 'p1', name: 'Calza', price: 10000 };
test.listeners['romix:product-viewed']({ detail: { product } });
test.listeners['romix:product-viewed']({ detail: { product } });
test.listeners['romix:analytics-cart-added']({ detail: { item: { productId: 'p1', name: 'Calza', qty: 2, price: 10000, phone: 'private', message: 'private' } } });
test.window.romixAnalytics.trackWhatsApp([{ productId: 'p1', name: 'Calza', qty: 3, price: 10000 }]);
const events = Array.from(test.window.dataLayer).filter(entry => entry[0] === 'event');
assert.equal(events.map(entry => entry[1]).join(','), 'view_item,add_to_cart,whatsapp_order_click');
assert.equal(events[1][2].value, 20000);
assert.equal(events[1][2].items[0].quantity, 2);
assert.equal(events[2][2].value, 30000);
assert.ok(!JSON.stringify(events).includes('private'));
assert.ok(!events.some(entry => entry[1] === 'purchase'), 'A WhatsApp consultation is not a confirmed purchase');
for (const entry of events) {
  assert.deepEqual(Object.keys(entry[2]).sort(), ['currency', 'items', 'value']);
  for (const item of entry[2].items) assert.deepEqual(Object.keys(item).sort(), ['item_brand', 'item_category', 'item_id', 'item_name', 'price', 'quantity']);
}
console.log('analyticsTests: passed');
