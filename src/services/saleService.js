const { buildDailySaleNumber } = require('../utils/saleNumber');
const { createStockMovement, applyStockChange } = require('./stockService');

async function registerSale(db, { userId, paymentMethod = 'cash', items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La venta debe incluir al menos un item.');
  }

  return db.run('BEGIN IMMEDIATE TRANSACTION').then(async () => {
    try {
      const normalizedItems = [];

      for (const rawItem of items) {
        const productId = Number(rawItem.productId);
        const quantity = Number(rawItem.quantity || 1);

        if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity <= 0) {
          throw new Error('Items invalidos en la venta.');
        }

        const product = await db.get(
          `SELECT id, name, sale_price, stock, active
           FROM products
           WHERE id = ?`,
          [productId]
        );

        if (!product || !product.active) {
          throw new Error('Uno de los productos no existe o esta inactivo.');
        }

        if (product.stock < quantity) {
          throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
        }

        normalizedItems.push({
          productId,
          productName: product.name,
          quantity,
          unitPrice: product.sale_price,
          subtotal: Number((product.sale_price * quantity).toFixed(2))
        });
      }

      const total = Number(
        normalizedItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)
      );

      const todayCount = await db.get(
        `SELECT COUNT(*) AS count
         FROM sales
         WHERE date(created_at) = date('now', 'localtime')`
      );

      const saleNumber = buildDailySaleNumber((todayCount?.count || 0) + 1);

      const saleResult = await db.run(
        `INSERT INTO sales (sale_number, total, payment_method, user_id)
         VALUES (?, ?, ?, ?)`,
        [saleNumber, total, paymentMethod, userId]
      );

      const saleId = saleResult.lastID;

      for (const item of normalizedItems) {
        await db.run(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [saleId, item.productId, item.quantity, item.unitPrice, item.subtotal]
        );

        await applyStockChange(db, { productId: item.productId, delta: -item.quantity });

        await createStockMovement(db, {
          productId: item.productId,
          movementType: 'sale',
          quantity: -item.quantity,
          note: `Venta ${saleNumber}`,
          referenceId: saleId,
          userId
        });
      }

      await db.run('COMMIT');

      return {
        saleId,
        saleNumber,
        total,
        paymentMethod,
        createdAt: new Date().toISOString(),
        items: normalizedItems
      };
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}

module.exports = {
  registerSale
};
