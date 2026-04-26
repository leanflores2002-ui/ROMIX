const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin'));

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const users = await db.all(
      `SELECT id, username, full_name, role, active, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron listar usuarios.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'username, password y fullName son obligatorios.' });
    }

    if (!['admin', 'seller'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalido.' });
    }

    const db = getDb();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.run(
      `INSERT INTO users (username, password_hash, full_name, role, active)
       VALUES (?, ?, ?, ?, 1)`,
      [username.trim(), passwordHash, fullName.trim(), role]
    );

    const user = await db.get(
      `SELECT id, username, full_name, role, active, created_at
       FROM users
       WHERE id = ?`,
      [result.lastID]
    );

    return res.status(201).json(user);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      return res.status(409).json({ message: 'El username ya existe.' });
    }

    return res.status(500).json({ message: 'No se pudo crear el usuario.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, active, password } = req.body;

    const db = getDb();
    const existing = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const nextPasswordHash = password
      ? await bcrypt.hash(password, 10)
      : existing.password_hash;

    const nextRole = role && ['admin', 'seller'].includes(role) ? role : existing.role;

    await db.run(
      `UPDATE users
       SET full_name = ?,
           role = ?,
           active = ?,
           password_hash = ?
       WHERE id = ?`,
      [
        fullName ? fullName.trim() : existing.full_name,
        nextRole,
        typeof active === 'boolean' ? Number(active) : existing.active,
        nextPasswordHash,
        id
      ]
    );

    const updated = await db.get(
      `SELECT id, username, full_name, role, active, created_at
       FROM users
       WHERE id = ?`,
      [id]
    );

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo actualizar el usuario.' });
  }
});

module.exports = router;
