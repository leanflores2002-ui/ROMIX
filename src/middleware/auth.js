const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { getDb } = require('../config/database');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token requerido.' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const db = getDb();
    const user = await db.get(
      `SELECT id, username, full_name, role, active
       FROM users
       WHERE id = ?`,
      [payload.sub]
    );

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Usuario invalido o inactivo.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido o expirado.' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta accion.' });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles
};
