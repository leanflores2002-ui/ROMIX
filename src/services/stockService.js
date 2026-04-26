async function createStockMovement(db, { productId, movementType, quantity, note = null, referenceId = null, userId = null }) {
  await db.run(
    `INSERT INTO stock_movements (product_id, movement_type, quantity, note, reference_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, movementType, quantity, note, referenceId, userId]
  );
}

async function applyStockChange(db, { productId, delta, allowNegative = false }) {
  const product = await db.get('SELECT id, stock FROM products WHERE id = ?', [productId]);
  if (!product) {
    throw new Error('Producto no encontrado.');
  }

  const nextStock = product.stock + delta;
  if (!allowNegative && nextStock < 0) {
    throw new Error('Stock insuficiente para la operacion.');
  }

  await db.run(
    `UPDATE products
     SET stock = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextStock, productId]
  );

  return nextStock;
}

module.exports = {
  createStockMovement,
  applyStockChange
};
