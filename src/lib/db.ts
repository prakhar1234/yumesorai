/**
 * SQLite Database Setup
 * Simple and lightweight database for form submissions
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database file location
const dbPath = path.join(process.cwd(), 'data', 'yumesorai.db');

// Initialize database
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    console.log(`[DB] Initializing database at ${dbPath}`);
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Initialize schema
    initializeSchema();
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema() {
  if (!db) return;

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      industry TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS demo_bookings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      date DATE NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assessment_submissions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      company_size TEXT,
      industry TEXT,
      pain_points TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_briefing_bookings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      date DATE NOT NULL,
      time TIME,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS roi_calculator_submissions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL,
      annual_spend REAL,
      expected_savings_percent REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_submissions(email);
    CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at);
    CREATE INDEX IF NOT EXISTS idx_demo_email ON demo_bookings(email);
    CREATE INDEX IF NOT EXISTS idx_demo_date ON demo_bookings(date);
  `);

  console.log('[DB] Schema initialized successfully');
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database closed');
  }
}

/**
 * Insert contact submission
 */
export function insertContactSubmission(data: {
  name: string;
  email: string;
  company: string;
  industry: string;
  phone?: string;
  message: string;
}) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO contact_submissions (name, email, company, industry, phone, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.email,
    data.company,
    data.industry,
    data.phone || null,
    data.message
  );

  console.log(`[DB] Contact submission saved: ${result.lastInsertRowid}`);
  return result;
}

/**
 * Insert demo booking
 */
export function insertDemoBooking(data: {
  name: string;
  email: string;
  company: string;
  date: string;
  message?: string;
}) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO demo_bookings (name, email, company, date, message)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.email,
    data.company,
    data.date,
    data.message || null
  );

  console.log(`[DB] Demo booking saved: ${result.lastInsertRowid}`);
  return result;
}

/**
 * Insert assessment submission
 */
export function insertAssessmentSubmission(data: {
  name: string;
  email: string;
  company: string;
  company_size?: string;
  industry?: string;
  pain_points?: string;
}) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO assessment_submissions (name, email, company, company_size, industry, pain_points)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.email,
    data.company,
    data.company_size || null,
    data.industry || null,
    data.pain_points || null
  );

  console.log(`[DB] Assessment submission saved: ${result.lastInsertRowid}`);
  return result;
}

/**
 * Insert risk briefing booking
 */
export function insertRiskBriefingBooking(data: {
  name: string;
  email: string;
  company: string;
  date: string;
  time?: string;
  phone?: string;
}) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO risk_briefing_bookings (name, email, company, date, time, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.email,
    data.company,
    data.date,
    data.time || null,
    data.phone || null
  );

  console.log(`[DB] Risk briefing booking saved: ${result.lastInsertRowid}`);
  return result;
}

/**
 * Insert ROI calculator submission
 */
export function insertROICalculatorSubmission(data: {
  email: string;
  annual_spend?: number;
  expected_savings_percent?: number;
}) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO roi_calculator_submissions (email, annual_spend, expected_savings_percent)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(
    data.email,
    data.annual_spend || null,
    data.expected_savings_percent || null
  );

  console.log(`[DB] ROI calculator submission saved: ${result.lastInsertRowid}`);
  return result;
}

/**
 * Get all contact submissions
 */
export function getContactSubmissions() {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM contact_submissions ORDER BY created_at DESC
  `);
  return stmt.all();
}

/**
 * Get submission count
 */
export function getSubmissionStats() {
  const database = getDatabase();
  return {
    contacts: (database.prepare('SELECT COUNT(*) as count FROM contact_submissions').get() as any).count,
    demos: (database.prepare('SELECT COUNT(*) as count FROM demo_bookings').get() as any).count,
    assessments: (database.prepare('SELECT COUNT(*) as count FROM assessment_submissions').get() as any).count,
    risk_briefings: (database.prepare('SELECT COUNT(*) as count FROM risk_briefing_bookings').get() as any).count,
    roi_submissions: (database.prepare('SELECT COUNT(*) as count FROM roi_calculator_submissions').get() as any).count,
  };
}

export default getDatabase;
