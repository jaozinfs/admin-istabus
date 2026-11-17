import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

type NestApp = {
  getHttpAdapter: () => { getInstance: () => express.Express };
  init: () => Promise<unknown>;
};

let cached: express.Express | null = null;

async function getServer(): Promise<express.Express> {
  if (cached) return cached;

  // Compiled Nest output (built in Vercel buildCommand).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createNestApp } = require('../backend/dist/create-app') as {
    createNestApp: (server?: express.Express) => Promise<NestApp>;
  };

  const server = express();
  const app = await createNestApp(server);
  await app.init();
  cached = server;
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await getServer();
  return server(req, res);
}
