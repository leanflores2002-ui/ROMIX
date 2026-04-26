const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { signToken } = require('../utils/token');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y password son obligatorios.' });
    }

    const db = getDb();
    const user = await db.get(
      `SELECT id, username, full_name, role, active, password_hash
       FROM users
       WHERE username = ?`,
      [username]
    );

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Credenciales invalidas.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales invalidas.' });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesion.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.full_name,
      role: req.user.role
    }
  });
});

module.exports = router;
