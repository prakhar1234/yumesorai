/**
 * PostgreSQL Database Setup
 * Connects to Railway PostgreSQL database
 */

import { Pool } from 'pg';

// Initialize connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.error('[DB] DATABASE_URL environment variable not set');
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log('[DB] Initializing PostgreSQL connection pool');

    pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client', err);
    });

    // Initialize schema on first connection
    initializeSchema().catch((err) => {
      console.error('[DB] Failed to initialize schema:', err);
    });
  }

  return pool;
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('[DB] Creating tables if they do not exist...');

    // Create tables with PostgreSQL-specific syntax
    await client.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        industry TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS demo_bookings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        date DATE NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assessment_submissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        company_size TEXT,
        industry TEXT,
        pain_points TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS risk_briefing_bookings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        date DATE NOT NULL,
        time TIME,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roi_calculator_submissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT NOT NULL,
        annual_spend NUMERIC,
        expected_savings_percent NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_submissions(email);
      CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at);
      CREATE INDEX IF NOT EXISTS idx_demo_email ON demo_bookings(email);
      CREATE INDEX IF NOT EXISTS idx_demo_date ON demo_bookings(date);
      CREATE INDEX IF NOT EXISTS idx_assessment_email ON assessment_submissions(email);
      CREATE INDEX IF NOT EXISTS idx_risk_briefing_email ON risk_briefing_bookings(email);
      CREATE INDEX IF NOT EXISTS idx_roi_email ON roi_calculator_submissions(email);
    `);

    console.log('[DB] Schema initialized successfully');
  } catch (error) {
    console.error('[DB] Schema initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Database connection pool closed');
  }
}

/**
 * Insert contact submission
 */
export async function insertContactSubmission(data: {
  name: string;
  email: string;
  company: string;
  industry: string;
  phone?: string;
  message: string;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO contact_submissions (name, email, company, industry, phone, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.name,
        data.email,
        data.company,
        data.industry,
        data.phone || null,
        data.message
      ]
    );

    const id = result.rows[0].id;
    console.log(`[DB] Contact submission saved: ${id}`);
    return { lastInsertRowid: id };
  } finally {
    client.release();
  }
}

/**
 * Insert demo booking
 */
export async function insertDemoBooking(data: {
  name: string;
  email: string;
  company: string;
  date: string;
  message?: string;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO demo_bookings (name, email, company, date, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.name,
        data.email,
        data.company,
        data.date,
        data.message || null
      ]
    );

    const id = result.rows[0].id;
    console.log(`[DB] Demo booking saved: ${id}`);
    return { lastInsertRowid: id };
  } finally {
    client.release();
  }
}

/**
 * Insert assessment submission
 */
export async function insertAssessmentSubmission(data: {
  name: string;
  email: string;
  company: string;
  company_size?: string;
  industry?: string;
  pain_points?: string;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO assessment_submissions (name, email, company, company_size, industry, pain_points)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.name,
        data.email,
        data.company,
        data.company_size || null,
        data.industry || null,
        data.pain_points || null
      ]
    );

    const id = result.rows[0].id;
    console.log(`[DB] Assessment submission saved: ${id}`);
    return { lastInsertRowid: id };
  } finally {
    client.release();
  }
}

/**
 * Insert risk briefing booking
 */
export async function insertRiskBriefingBooking(data: {
  name: string;
  email: string;
  company: string;
  date: string;
  time?: string;
  phone?: string;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO risk_briefing_bookings (name, email, company, date, time, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        data.name,
        data.email,
        data.company,
        data.date,
        data.time || null,
        data.phone || null
      ]
    );

    const id = result.rows[0].id;
    console.log(`[DB] Risk briefing booking saved: ${id}`);
    return { lastInsertRowid: id };
  } finally {
    client.release();
  }
}

/**
 * Insert ROI calculator submission
 */
export async function insertROICalculatorSubmission(data: {
  email: string;
  annual_spend?: number;
  expected_savings_percent?: number;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO roi_calculator_submissions (email, annual_spend, expected_savings_percent)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        data.email,
        data.annual_spend || null,
        data.expected_savings_percent || null
      ]
    );

    const id = result.rows[0].id;
    console.log(`[DB] ROI calculator submission saved: ${id}`);
    return { lastInsertRowid: id };
  } finally {
    client.release();
  }
}

/**
 * Get all contact submissions
 */
export async function getContactSubmissions() {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM contact_submissions ORDER BY created_at DESC`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get submission count
 */
export async function getSubmissionStats() {
  const client = await getPool().connect();

  try {
    const results = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM contact_submissions'),
      client.query('SELECT COUNT(*) as count FROM demo_bookings'),
      client.query('SELECT COUNT(*) as count FROM assessment_submissions'),
      client.query('SELECT COUNT(*) as count FROM risk_briefing_bookings'),
      client.query('SELECT COUNT(*) as count FROM roi_calculator_submissions'),
    ]);

    return {
      contacts: parseInt(results[0].rows[0].count),
      demos: parseInt(results[1].rows[0].count),
      assessments: parseInt(results[2].rows[0].count),
      risk_briefings: parseInt(results[3].rows[0].count),
      roi_submissions: parseInt(results[4].rows[0].count),
    };
  } finally {
    client.release();
  }
}

export default getPool;
