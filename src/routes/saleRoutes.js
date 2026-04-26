const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { registerSale } = require('../services/saleService');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'seller'));

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { items, paymentMethod } = req.body;

    const sale = await registerSale(db, {
      userId: req.user.id,
      paymentMethod: paymentMethod || 'cash',
      items
    });

    return res.status(201).json(sale);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'No se pudo registrar la venta.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { from, to, productId } = req.query;

    const filters = [];
    const params = [];

    if (from) {
      filters.push('date(s.created_at) >= date(?)');
      params.push(from);
    }

    if (to) {
      filters.push('date(s.created_at) <= date(?)');
      params.push(to);
    }

    if (productId) {
      filters.push('EXISTS (SELECT 1 FROM sale_items si2 WHERE si2.sale_id = s.id AND si2.product_id = ?)');
      params.push(Number(productId));
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const sales = await db.all(
      `SELECT s.id, s.sale_number, s.total, s.payment_method, s.created_at,
              u.full_name AS seller_name
       FROM sales s
       INNER JOIN users u ON u.id = s.user_id
       ${where}
       ORDER BY s.created_at DESC`,
      params
    );

    return res.json(sales);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo listar el historial de ventas.' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const db = getDb();

    const [daily, weekly, monthly] = await Promise.all([
      db.get(`SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE date(created_at) = date('now', 'localtime')`),
      db.get(`SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE date(created_at) >= date('now', '-6 day', 'localtime')`),
      db.get(`SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')`)
    ]);

    return res.json({
      dayTotal: Number(daily.total || 0),
      weekTotal: Number(weekly.total || 0),
      monthTotal: Number(monthly.total || 0)
    });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo calcular el resumen de ventas.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const sale = await db.get(
      `SELECT s.id, s.sale_number, s.total, s.payment_method, s.created_at,
              u.full_name AS seller_name
       FROM sales s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!sale) {
      return res.status(404).json({ message: 'Venta no encontrada.' });
    }

    const items = await db.all(
      `SELECT si.product_id, p.barcode, p.name, p.size, p.color,
              si.quantity, si.unit_price, si.subtotal
       FROM sale_items si
       INNER JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [req.params.id]
    );

    return res.json({ ...sale, items });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo obtener el detalle de venta.' });
  }
});

module.exports = router;
