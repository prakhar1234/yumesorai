#!/usr/bin/env node

console.log('[APP] Starting application...');
console.log('[APP] NODE_ENV:', process.env.NODE_ENV || 'production');
console.log('[APP] PORT:', process.env.PORT || 3000);

try {
  console.log('[APP] Importing Next.js server...');
  const { createServer } = require('http');
  const { parse } = require('url');
  const next = require('next');

  const dev = process.env.NODE_ENV !== 'production';
  const app = next({ dev });
  const handle = app.getRequestHandler();

  console.log('[APP] Preparing Next.js app...');
  app.prepare().then(() => {
    console.log('[APP] Next.js app prepared, creating server...');
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen(port, (err) => {
      if (err) {
        console.error('[APP] Error starting server:', err);
        process.exit(1);
      }
      console.log('[APP] Server listening on port', port);
    });
  }).catch((err) => {
    console.error('[APP] Error preparing Next.js app:', err);
    process.exit(1);
  });
} catch (err) {
  console.error('[APP] Fatal error:', err);
  process.exit(1);
}
