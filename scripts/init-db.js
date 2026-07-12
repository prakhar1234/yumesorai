#!/usr/bin/env node

/**
 * Database initialization script
 * Runs on application startup to ensure database schema and seed data exist
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('[DB Init] DATABASE_URL not set, skipping initialization');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const client = await pool.connect();
    console.log('[DB Init] Connected to database');

    // Read and execute seed SQL script
    const seedSqlPath = path.join(__dirname, 'seed-initial-admin.sql');
    if (fs.existsSync(seedSqlPath)) {
      const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');
      console.log('[DB Init] Executing seed script...');
      await client.query(seedSql);
      console.log('[DB Init] Seed script executed successfully');
    } else {
      console.warn('[DB Init] Seed script not found at', seedSqlPath);
    }

    client.release();
    console.log('[DB Init] Database initialization complete');
  } catch (error) {
    console.error('[DB Init] Error initializing database:', error.message);
    // Don't fail the startup - database might be temporarily unavailable
  } finally {
    await pool.end();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('[DB Init] Initialization finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[DB Init] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
