const app = require('./app');
const env = require('./config/env');
const { initializeDatabase } = require('./config/database');

async function start() {
  try {
    await initializeDatabase();

    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Servidor POS iniciado en http://localhost:${env.PORT}`);
      // eslint-disable-next-line no-console
      console.log('Credenciales iniciales: admin/admin123 y vendedor/vendedor123');
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
}

start();
