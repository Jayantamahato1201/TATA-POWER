import app, { initializeServer } from '../server/app.js';

export default async function handler(req: any, res: any) {
  try {
    await initializeServer();
  } catch (err) {
    console.error('[Vercel Serverless] DB init error:', err);
  }
  return app(req, res);
}
