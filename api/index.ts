import app, { initializeServer } from '../server/app.js';

export default async function handler(req: any, res: any) {
  // Do not hold up the first serverless response while MongoDB hydrates every
  // collection. `initializeServer` is idempotent and warms the shared runtime
  // cache in the background; the JSON fallback remains available immediately.
  void initializeServer().catch((err) => {
    console.error('[Vercel Serverless] DB init error:', err);
  });
  return app(req, res);
}
