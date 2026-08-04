import { createApp, validateRuntimeEnv } from './app.js';

validateRuntimeEnv();

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, '0.0.0.0', () => {
  console.log(`ROMIX inventory backend listening on ${port}`);
});

