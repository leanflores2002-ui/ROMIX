const express = require('express');
const { getDb } = require('../config/database');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.all(
      `SELECT id, name, active, created_at
       FROM categories
       ORDER BY name ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron listar categorias.' });
  }
});

router.post('/', authorizeRoles('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }

    const db = getDb();
    const result = await db.run(
      `INSERT INTO categories (name, active)
       VALUES (?, 1)`,
      [name.trim()]
    );

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    return res.status(201).json(category);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: 'La categoria ya existe.' });
    }
    return res.status(500).json({ message: 'No se pudo crear la categoria.' });
  }
});

router.put('/:id', authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const db = getDb();
    const existing = await db.get('SELECT id FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Categoria no encontrada.' });
    }

    await db.run(
      `UPDATE categories
       SET name = COALESCE(?, name),
           active = COALESCE(?, active)
       WHERE id = ?`,
      [name ? name.trim() : null, typeof active === 'boolean' ? Number(active) : null, id]
    );

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    return res.json(category);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo actualizar la categoria.' });
  }
});

module.exports = router;
