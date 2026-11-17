import { createNestApp } from './create-app';

async function bootstrap() {
  const app = await createNestApp();
  const port = Number(process.env.PORT || 3100);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
