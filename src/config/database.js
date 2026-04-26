const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const env = require('./env');

let dbInstance;

const schemaStatements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'seller')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT NOT NULL UNIQUE,
    generated_barcode INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    category_id INTEGER,
    size TEXT,
    color TEXT,
    sale_price REAL NOT NULL,
    cost_price REAL,
    stock INTEGER NOT NULL DEFAULT 0,
    stock_min INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );`,
  `CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_number TEXT NOT NULL UNIQUE,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`,
  `CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );`,
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'entry', 'manual_exit', 'adjustment')),
    quantity INTEGER NOT NULL,
    note TEXT,
    reference_id INTEGER,
    user_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`,
  `CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);`
];

async function seedBaseData(db) {
  const categories = ['Mujer', 'Hombre', 'Ninos', 'Accesorios'];

  for (const category of categories) {
    await db.run(
      `INSERT OR IGNORE INTO categories (name, active) VALUES (?, 1)`,
      [category]
    );
  }

  const adminPassword = await bcrypt.hash('admin123', 10);
  const sellerPassword = await bcrypt.hash('vendedor123', 10);

  await db.run(
    `INSERT OR IGNORE INTO users (username, password_hash, full_name, role, active)
     VALUES ('admin', ?, 'Administrador Principal', 'admin', 1)`,
    [adminPassword]
  );

  await db.run(
    `INSERT OR IGNORE INTO users (username, password_hash, full_name, role, active)
     VALUES ('vendedor', ?, 'Usuario Vendedor', 'seller', 1)`,
    [sellerPassword]
  );
}

async function initializeDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbDir = path.dirname(env.DB_PATH);
  fs.mkdirSync(dbDir, { recursive: true });

  const db = await open({
    filename: env.DB_PATH,
    driver: sqlite3.Database
  });

  for (const statement of schemaStatements) {
    await db.exec(statement);
  }

  await seedBaseData(db);

  dbInstance = db;
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

module.exports = {
  initializeDatabase,
  getDb
};
