import app from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL HANDLER ERROR]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Internal Server Error in Serverless Handler',
      details: err?.message || String(err)
    });
  }
}
