const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { generateUniqueBarcode } = require('../utils/barcode');

const router = express.Router();

router.use(authenticate);

function parseBoolean(value) {
  if (value === undefined) {
    return undefined;
  }
  return ['1', 'true', 'yes'].includes(String(value).toLowerCase());
}

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { search = '', categoryId, size, color, lowStock, includeInactive } = req.query;

    const filters = [];
    const params = [];

    if (search) {
      filters.push('(p.name LIKE ? OR p.barcode LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      filters.push('p.category_id = ?');
      params.push(Number(categoryId));
    }

    if (size) {
      filters.push('p.size = ?');
      params.push(size);
    }

    if (color) {
      filters.push('p.color = ?');
      params.push(color);
    }

    if (parseBoolean(lowStock)) {
      filters.push('p.stock <= p.stock_min');
    }

    if (!parseBoolean(includeInactive)) {
      filters.push('p.active = 1');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const products = await db.all(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY p.name ASC`,
      params
    );

    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron listar productos.' });
  }
});

router.get('/barcode/:barcode', async (req, res) => {
  try {
    const db = getDb();
    const product = await db.get(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? AND p.active = 1`,
      [req.params.barcode]
    );

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar producto por codigo.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const product = await db.get(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    return res.json(product);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo obtener el producto.' });
  }
});

router.post('/', authorizeRoles('admin'), async (req, res) => {
  try {
    const db = getDb();
    const {
      barcode,
      name,
      categoryId,
      size,
      color,
      salePrice,
      costPrice,
      stock,
      stockMin,
      imageUrl,
      active
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    if (salePrice === undefined || Number(salePrice) < 0) {
      return res.status(400).json({ message: 'Precio de venta invalido.' });
    }

    const finalBarcode = barcode && String(barcode).trim()
      ? String(barcode).trim()
      : await generateUniqueBarcode(db);

    const generatedBarcode = !(barcode && String(barcode).trim());

    const result = await db.run(
      `INSERT INTO products (
        barcode, generated_barcode, name, category_id, size, color,
        sale_price, cost_price, stock, stock_min, image_url, active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalBarcode,
        Number(generatedBarcode),
        String(name).trim(),
        categoryId || null,
        size || null,
        color || null,
        Number(salePrice),
        costPrice !== undefined && costPrice !== null ? Number(costPrice) : null,
        Number(stock || 0),
        Number(stockMin || 0),
        imageUrl || null,
        active === false ? 0 : 1
      ]
    );

    const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
    return res.status(201).json(product);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: 'El codigo de barras ya existe.' });
    }
    return res.status(500).json({ message: 'No se pudo crear el producto.' });
  }
});

router.put('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const {
      barcode,
      name,
      categoryId,
      size,
      color,
      salePrice,
      costPrice,
      stock,
      stockMin,
      imageUrl,
      active
    } = req.body;

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    await db.run(
      `UPDATE products
       SET barcode = COALESCE(?, barcode),
           generated_barcode = ?,
           name = COALESCE(?, name),
           category_id = ?,
           size = ?,
           color = ?,
           sale_price = COALESCE(?, sale_price),
           cost_price = ?,
           stock = COALESCE(?, stock),
           stock_min = COALESCE(?, stock_min),
           image_url = ?,
           active = COALESCE(?, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        barcode ? String(barcode).trim() : null,
        barcode ? 0 : existing.generated_barcode,
        name ? String(name).trim() : null,
        categoryId !== undefined ? categoryId : existing.category_id,
        size !== undefined ? size : existing.size,
        color !== undefined ? color : existing.color,
        salePrice !== undefined ? Number(salePrice) : null,
        costPrice !== undefined ? costPrice : existing.cost_price,
        stock !== undefined ? Number(stock) : null,
        stockMin !== undefined ? Number(stockMin) : null,
        imageUrl !== undefined ? imageUrl : existing.image_url,
        active !== undefined ? Number(Boolean(active)) : null,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    return res.json(updated);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: 'El codigo de barras ya existe.' });
    }
    return res.status(500).json({ message: 'No se pudo actualizar el producto.' });
  }
});

router.patch('/:id/deactivate', authorizeRoles('admin'), async (req, res) => {
  try {
    const db = getDb();
    const result = await db.run(
      `UPDATE products
       SET active = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.params.id]
    );

    if (!result.changes) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    return res.json({ message: 'Producto desactivado correctamente.' });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo desactivar el producto.' });
  }
});

module.exports = router;
