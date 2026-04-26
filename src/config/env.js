const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret_in_production',
  DB_PATH: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'pos.sqlite')
};

module.exports = env;
