const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name
    },
    env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = {
  signToken
};
