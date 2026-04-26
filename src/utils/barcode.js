function randomNumericString(length) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

async function generateUniqueBarcode(db) {
  for (let i = 0; i < 50; i += 1) {
    const candidate = `20${randomNumericString(11)}`;
    const existing = await db.get('SELECT id FROM products WHERE barcode = ?', [candidate]);
    if (!existing) {
      return candidate;
    }
  }

  throw new Error('No se pudo generar un codigo de barras unico.');
}

module.exports = {
  generateUniqueBarcode
};
