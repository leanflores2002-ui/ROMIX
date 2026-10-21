const assert=require('node:assert/strict');
const {search}=require('../frontend/public/assets/js/romix-assistant');
const catalog=require('../frontend/public/assets/data/assistant-catalog.json');
assert.ok(catalog.length>0);
assert.ok(search(catalog,'calzas').length>0);
assert.ok(search(catalog,'presio calza').length>0);
assert.equal(search(catalog,'producto inexistente zzzzzz').length,0);
for(const p of catalog){assert.ok(p.href.startsWith('/productos/'));assert.ok(p.priceText);}
const products=require('../frontend/public/assets/data/products.json');
assert.equal(catalog.length,products.filter(p=>p.visible!==false).length);
for(const p of products.filter(p=>p.visible===false))assert.ok(!catalog.some(c=>c.name===p.name));
console.log('assistantTests passed: public catalog, typo/aliases, no invented matches, canonical links');
