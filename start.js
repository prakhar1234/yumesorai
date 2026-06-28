#!/usr/bin/env node
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] PORT:', process.env.PORT);

try {
  console.log('[STARTUP] Starting server...');
  require('next/dist/bin/next')(['start', '-p', '3000']);
} catch (error) {
  console.error('[STARTUP] ERROR:', error);
  process.exit(1);
}
