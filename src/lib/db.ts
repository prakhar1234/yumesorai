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

      -- Admin Users Table
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Email Configuration Table
      CREATE TABLE IF NOT EXISTS email_configuration (
        id TEXT PRIMARY KEY DEFAULT 'global',
        auto_email_enabled BOOLEAN DEFAULT false,
        default_from_email TEXT,
        default_subject TEXT,
        default_content TEXT,
        rate_limit_per_hour INTEGER DEFAULT 100,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT REFERENCES admin_users(id)
      );

      -- Email Campaigns Table
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        from_email TEXT,
        status TEXT DEFAULT 'draft',
        scheduled_at TIMESTAMP,
        completed_at TIMESTAMP,
        total_recipients INTEGER DEFAULT 0,
        successful_sends INTEGER DEFAULT 0,
        failed_sends INTEGER DEFAULT 0,
        created_by TEXT NOT NULL REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Campaign Recipients Table
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        campaign_id TEXT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT,
        status TEXT DEFAULT 'pending',
        message_id TEXT,
        error_message TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Clients Table
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        company TEXT,
        phone TEXT,
        industry TEXT,
        source TEXT,
        tags TEXT[],
        notes TEXT,
        last_emailed_at TIMESTAMP,
        total_emails_sent INTEGER DEFAULT 0,
        total_emails_failed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT REFERENCES admin_users(id)
      );

      -- Create indexes for maestro tables
      CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
      CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
      CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON email_campaigns(created_by);
      CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);
      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
      CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
      CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(source);
      CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
    `);

    console.log('[DB] Schema initialized successfully');

    // Seed initial admin user if configured
    await seedInitialAdminUser(client);
  } catch (error) {
    console.error('[DB] Schema initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed initial admin user from environment variables or hardcoded defaults
 */
async function seedInitialAdminUser(client: any) {
  try {
    let username = process.env.INITIAL_ADMIN_USERNAME;
    let password = process.env.INITIAL_ADMIN_PASSWORD;
    let email = process.env.INITIAL_ADMIN_EMAIL;

    // Use hardcoded defaults if environment variables not set
    if (!username || !password || !email) {
      console.log('[DB] Using hardcoded initial admin credentials');
      username = 'yumesorai';
      password = 'YumeSorai123!';
      email = 'admin@yumesorai.com';
    }

    // Import hashPassword from auth-utils for consistent password hashing
    const { hashPassword } = await import('@/lib/auth-utils');
    const passwordHash = await hashPassword(password);

    // Upsert admin user (create or update if exists)
    const result = await client.query(
      `INSERT INTO admin_users (id, username, password_hash, email, full_name, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
       ON CONFLICT (username) DO UPDATE SET
         password_hash = $2,
         email = $3,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING username`,
      [username, passwordHash, email, 'Initial Admin']
    );

    if (result.rows.length > 0) {
      console.log(`[DB] Initial admin user ensured: ${result.rows[0].username}`);
    }
  } catch (error) {
    console.error('[DB] Error seeding initial admin user:', error);
    // Don't throw - this is optional
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

/**
 * ============================================
 * MAESTRO ADMIN SYSTEM DATABASE FUNCTIONS
 * ============================================
 */

/**
 * Get admin user by username
 */
export async function getUserByUsername(username: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM admin_users WHERE username = $1 AND is_active = true`,
      [username]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Get admin user by ID
 */
export async function getUserById(userId: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT id, username, email, full_name, is_active, last_login_at, created_at
       FROM admin_users WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Create a new admin user
 */
export async function createAdminUser(data: {
  username: string;
  password_hash: string;
  email: string;
  full_name?: string;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO admin_users (username, password_hash, email, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name`,
      [data.username, data.password_hash, data.email, data.full_name || null]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update admin user last login
 */
export async function updateUserLastLogin(userId: string) {
  const client = await getPool().connect();

  try {
    await client.query(
      `UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );
  } finally {
    client.release();
  }
}

/**
 * Update admin user password
 */
export async function updateUserPassword(userId: string, passwordHash: string) {
  const client = await getPool().connect();

  try {
    await client.query(
      `UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, userId]
    );
  } finally {
    client.release();
  }
}

/**
 * Get all admin users
 */
export async function getAllAdminUsers() {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT id, username, email, full_name, is_active, last_login_at, created_at
       FROM admin_users ORDER BY created_at DESC`
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Update admin user details
 */
export async function updateAdminUser(
  userId: string,
  data: { email?: string; full_name?: string; is_active?: boolean }
) {
  const client = await getPool().connect();

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(data.email);
      paramCount++;
    }

    if (data.full_name !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(data.full_name);
      paramCount++;
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(data.is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    await client.query(query, values);
  } finally {
    client.release();
  }
}

/**
 * Get email configuration
 */
export async function getEmailConfiguration() {
  const client = await getPool().connect();

  try {
    let result = await client.query(
      `SELECT * FROM email_configuration WHERE id = 'global'`
    );

    // Create default config if it doesn't exist
    if (result.rows.length === 0) {
      result = await client.query(
        `INSERT INTO email_configuration (id) VALUES ('global') RETURNING *`
      );
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update email configuration
 */
export async function updateEmailConfiguration(
  data: {
    auto_email_enabled?: boolean;
    default_from_email?: string;
    default_subject?: string;
    default_content?: string;
    rate_limit_per_hour?: number;
  },
  updatedBy: string
) {
  const client = await getPool().connect();

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.auto_email_enabled !== undefined) {
      updates.push(`auto_email_enabled = $${paramCount}`);
      values.push(data.auto_email_enabled);
      paramCount++;
    }

    if (data.default_from_email !== undefined) {
      updates.push(`default_from_email = $${paramCount}`);
      values.push(data.default_from_email);
      paramCount++;
    }

    if (data.default_subject !== undefined) {
      updates.push(`default_subject = $${paramCount}`);
      values.push(data.default_subject);
      paramCount++;
    }

    if (data.default_content !== undefined) {
      updates.push(`default_content = $${paramCount}`);
      values.push(data.default_content);
      paramCount++;
    }

    if (data.rate_limit_per_hour !== undefined) {
      updates.push(`rate_limit_per_hour = $${paramCount}`);
      values.push(data.rate_limit_per_hour);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramCount}`);
    values.push(updatedBy);
    paramCount++;

    values.push('global');

    const query = `UPDATE email_configuration SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: {
  name: string;
  subject: string;
  content: string;
  from_email?: string;
  created_by: string;
}) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO email_campaigns (name, subject, content, from_email, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.subject, data.content, data.from_email || null, data.created_by]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get campaigns with pagination and filtering
 */
export async function getCampaigns(filters: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const client = await getPool().connect();

  try {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let query = `SELECT * FROM email_campaigns WHERE 1=1`;
    const values: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(campaignId: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM email_campaigns WHERE id = $1`,
      [campaignId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update campaign
 */
export async function updateCampaign(
  campaignId: string,
  data: {
    name?: string;
    subject?: string;
    content?: string;
    from_email?: string;
    status?: string;
    total_recipients?: number;
    successful_sends?: number;
    failed_sends?: number;
    completed_at?: string | null;
  }
) {
  const client = await getPool().connect();

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(campaignId);

    const query = `UPDATE email_campaigns SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Delete campaign (cascade deletes recipients)
 */
export async function deleteCampaign(campaignId: string) {
  const client = await getPool().connect();

  try {
    await client.query(`DELETE FROM email_campaigns WHERE id = $1`, [campaignId]);
  } finally {
    client.release();
  }
}

/**
 * Get campaign recipients
 */
export async function getCampaignRecipients(campaignId: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM campaign_recipients WHERE campaign_id = $1 ORDER BY created_at`,
      [campaignId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Create campaign recipients in bulk
 */
export async function createCampaignRecipients(
  campaignId: string,
  recipients: Array<{ email: string; name?: string }>
) {
  const client = await getPool().connect();

  try {
    const values: any[] = [];
    let paramCount = 1;
    const placeholders: string[] = [];

    recipients.forEach((recipient) => {
      placeholders.push(
        `(gen_random_uuid()::text, $${paramCount}, $${paramCount + 1}, $${paramCount + 2})`
      );
      values.push(campaignId, recipient.email, recipient.name || null);
      paramCount += 3;
    });

    if (placeholders.length === 0) {
      return [];
    }

    const query = `INSERT INTO campaign_recipients (id, campaign_id, email, name)
                   VALUES ${placeholders.join(', ')}
                   RETURNING *`;

    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Update recipient status
 */
export async function updateRecipientStatus(
  recipientId: string,
  status: string,
  messageId?: string | null,
  errorMessage?: string | null
) {
  const client = await getPool().connect();

  try {
    const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [status];
    let paramCount = 2;

    if (messageId !== undefined) {
      updates.push(`message_id = $${paramCount}`);
      values.push(messageId);
      paramCount++;
    }

    if (status === 'sent') {
      updates.push(`sent_at = CURRENT_TIMESTAMP`);
    }

    if (errorMessage !== undefined) {
      updates.push(`error_message = $${paramCount}`);
      values.push(errorMessage);
      paramCount++;
    }

    values.push(recipientId);

    const query = `UPDATE campaign_recipients SET ${updates.join(', ')} WHERE id = $${paramCount}`;

    await client.query(query, values);
  } finally {
    client.release();
  }
}

/**
 * Get pending recipients for a campaign
 */
export async function getPendingRecipients(campaignId: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM campaign_recipients WHERE campaign_id = $1 AND status = 'pending'`,
      [campaignId]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * ============================================
 * CLIENTS DATABASE FUNCTIONS
 * ============================================
 */

/**
 * Get clients with pagination and filters
 */
export async function getClients(filters: {
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const client = await getPool().connect();

  try {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let query = `SELECT * FROM clients WHERE 1=1`;
    const values: any[] = [];
    let paramCount = 1;

    if (filters.source) {
      query += ` AND source = $${paramCount}`;
      values.push(filters.source);
      paramCount++;
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      query += ` AND (email ILIKE $${paramCount} OR name ILIKE $${paramCount + 1})`;
      values.push(searchPattern, searchPattern);
      paramCount += 2;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get single client by ID
 */
export async function getClientById(clientId: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM clients WHERE id = $1`,
      [clientId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Get client by email (check for duplicates)
 */
export async function getClientByEmail(email: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT * FROM clients WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Create single client
 */
export async function createClient(
  data: {
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    industry?: string;
    source?: string;
    tags?: string[];
    notes?: string;
  },
  createdBy: string
) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `INSERT INTO clients (email, name, company, phone, industry, source, tags, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.email,
        data.name || null,
        data.company || null,
        data.phone || null,
        data.industry || null,
        data.source || 'manual',
        data.tags || [],
        data.notes || null,
        createdBy,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update client
 */
export async function updateClient(
  clientId: string,
  data: {
    name?: string;
    company?: string;
    phone?: string;
    industry?: string;
    tags?: string[];
    notes?: string;
  }
) {
  const client = await getPool().connect();

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(data.name);
      paramCount++;
    }

    if (data.company !== undefined) {
      updates.push(`company = $${paramCount}`);
      values.push(data.company);
      paramCount++;
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(data.phone);
      paramCount++;
    }

    if (data.industry !== undefined) {
      updates.push(`industry = $${paramCount}`);
      values.push(data.industry);
      paramCount++;
    }

    if (data.tags !== undefined) {
      updates.push(`tags = $${paramCount}`);
      values.push(data.tags);
      paramCount++;
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(data.notes);
      paramCount++;
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(clientId);

    const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Delete client
 */
export async function deleteClient(clientId: string) {
  const client = await getPool().connect();

  try {
    await client.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
  } finally {
    client.release();
  }
}

/**
 * Create multiple clients in bulk
 */
export async function createBulkClients(
  clients: Array<{
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    industry?: string;
    source?: string;
    tags?: string[];
    notes?: string;
  }>,
  createdBy: string
) {
  const client = await getPool().connect();

  try {
    const values: any[] = [];
    let paramCount = 1;
    const placeholders: string[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const clientData of clients) {
      try {
        placeholders.push(
          `(gen_random_uuid()::text, $${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, $${paramCount + 6}, $${paramCount + 7}, $${paramCount + 8})`
        );
        values.push(
          clientData.email,
          clientData.name || null,
          clientData.company || null,
          clientData.phone || null,
          clientData.industry || null,
          clientData.source || 'csv_upload',
          clientData.tags || [],
          clientData.notes || null,
          createdBy
        );
        paramCount += 9;
      } catch (err) {
        errors.push({
          email: clientData.email,
          error: 'Failed to parse client data',
        });
      }
    }

    if (placeholders.length === 0) {
      return { created: 0, duplicates: 0, errors };
    }

    const query = `INSERT INTO clients (id, email, name, company, phone, industry, source, tags, notes, created_by)
                   VALUES ${placeholders.join(', ')}
                   ON CONFLICT (email) DO NOTHING
                   RETURNING *`;

    const result = await client.query(query, values);
    const created = result.rows.length;
    const duplicates = clients.length - created - errors.length;

    return { created, duplicates, errors };
  } finally {
    client.release();
  }
}

/**
 * Get email history for a client (from campaign_recipients)
 */
export async function getClientEmailHistory(email: string) {
  const client = await getPool().connect();

  try {
    const result = await client.query(
      `SELECT
        cr.id,
        ec.name as campaign_name,
        cr.status,
        cr.sent_at,
        cr.error_message,
        cr.created_at
      FROM campaign_recipients cr
      LEFT JOIN email_campaigns ec ON cr.campaign_id = ec.id
      WHERE cr.email = $1
      ORDER BY cr.created_at DESC`,
      [email]
    );

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get clients statistics
 */
export async function getClientsStats() {
  const client = await getPool().connect();

  try {
    const totalResult = await client.query(`SELECT COUNT(*) as count FROM clients`);
    const sourceResult = await client.query(
      `SELECT source, COUNT(*) as count FROM clients GROUP BY source`
    );

    const stats: { [key: string]: number } = {};
    sourceResult.rows.forEach((row) => {
      stats[row.source || 'unknown'] = parseInt(row.count);
    });

    return {
      totalClients: parseInt(totalResult.rows[0].count),
      bySource: stats,
    };
  } finally {
    client.release();
  }
}

export default getPool;
