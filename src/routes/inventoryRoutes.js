const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { applyStockChange, createStockMovement } = require('../services/stockService');

const router = express.Router();

router.use(authenticate);

router.get('/movements', authorizeRoles('admin', 'seller'), async (req, res) => {
  try {
    const db = getDb();
    const { productId, movementType, from, to } = req.query;

    const filters = [];
    const params = [];

    if (productId) {
      filters.push('sm.product_id = ?');
      params.push(Number(productId));
    }

    if (movementType) {
      filters.push('sm.movement_type = ?');
      params.push(movementType);
    }

    if (from) {
      filters.push('date(sm.created_at) >= date(?)');
      params.push(from);
    }

    if (to) {
      filters.push('date(sm.created_at) <= date(?)');
      params.push(to);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await db.all(
      `SELECT sm.id, sm.product_id, p.name AS product_name, p.barcode,
              sm.movement_type, sm.quantity, sm.note, sm.reference_id,
              sm.created_at, u.full_name AS user_name
       FROM stock_movements sm
       INNER JOIN products p ON p.id = sm.product_id
       LEFT JOIN users u ON u.id = sm.user_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT 500`,
      params
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo listar movimientos de stock.' });
  }
});

router.post('/entries', authorizeRoles('admin'), async (req, res) => {
  try {
    const db = getDb();
    const { productId, quantity, note } = req.body;

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: 'Cantidad invalida.' });
    }

    await db.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const nextStock = await applyStockChange(db, {
        productId: Number(productId),
        delta: parsedQty
      });

      await createStockMovement(db, {
        productId: Number(productId),
        movementType: 'entry',
        quantity: parsedQty,
        note: note || 'Entrada manual de stock',
        userId: req.user.id
      });

      await db.run('COMMIT');
      return res.status(201).json({ message: 'Entrada registrada.', nextStock });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return res.status(400).json({ message: error.message || 'No se pudo registrar la entrada.' });
  }
});

router.post('/exits', authorizeRoles('admin'), async (req, res) => {
  try {
    const db = getDb();
    const { productId, quantity, note } = req.body;

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: 'Cantidad invalida.' });
    }

    await db.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const nextStock = await applyStockChange(db, {
        productId: Number(productId),
        delta: -parsedQty
      });

      await createStockMovement(db, {
        productId: Number(productId),
        movementType: 'manual_exit',
        quantity: -parsedQty,
        note: note || 'Salida manual de stock',
        userId: req.user.id
      });

      await db.run('COMMIT');
      return res.status(201).json({ message: 'Salida registrada.', nextStock });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    return res.status(400).json({ message: error.message || 'No se pudo registrar la salida.' });
  }
});

module.exports = router;
