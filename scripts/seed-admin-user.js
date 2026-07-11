#!/usr/bin/env node
/**
 * Script to seed initial admin user in production database
 * Usage: DATABASE_URL=... node scripts/seed-admin-user.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function seedAdminUser() {
  const client = await pool.connect();

  try {
    console.log('Seeding admin user...');

    // Check if user exists
    const result = await client.query(
      'SELECT id FROM admin_users WHERE username = $1',
      ['yumesorai']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin user "yumesorai" already exists');
      return;
    }

    // Hash password
    const password = 'YumeSorai123!';
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert admin user
    await client.query(
      `INSERT INTO admin_users (username, password_hash, email, full_name, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      ['yumesorai', passwordHash, 'admin@yumesorai.com', 'Initial Admin', true]
    );

    console.log('✅ Admin user created successfully!');
    console.log('\nLogin credentials:');
    console.log('  Username: yumesorai');
    console.log('  Password: YumeSorai123!');
    console.log('\nURL: https://www.yumesorai.com/ops/maestro/login');
  } catch (error) {
    console.error('ERROR seeding admin user:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdminUser();
