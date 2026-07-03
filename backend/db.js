const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbMode = 'sqlite'; // 'sqlite' or 'postgres'
let sqliteDb = null;
let pgClient = null;

// Load Env variables
require('dotenv').config();

const usePostgres = process.env.DATABASE_URL;

if (usePostgres) {
  dbMode = 'postgres';
  console.log('Database Mode: PostgreSQL enabled.');
} else {
  dbMode = 'sqlite';
  console.log('Database Mode: SQLite enabled (Local file projectforge.db).');
}

// Initialize Connections
if (dbMode === 'sqlite') {
  const dbPath = path.resolve(__dirname, 'projectforge.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to connect to SQLite:', err.message);
    } else {
      console.log('Connected to the SQLite database at:', dbPath);
    }
  });
} else {
  pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pgClient.connect((err) => {
    if (err) {
      console.error('Failed to connect to PostgreSQL. Falling back to SQLite.', err.message);
      dbMode = 'sqlite';
      const dbPath = path.resolve(__dirname, 'projectforge.db');
      sqliteDb = new sqlite3.Database(dbPath);
    } else {
      console.log('Connected to PostgreSQL successfully.');
    }
  });
}

// Database helper functions mapping
const db = {
  mode: () => dbMode,
  
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      let processedSql = sql;
      if (dbMode === 'sqlite') {
        processedSql = sql.replace(/\$(\d+)/g, '?');
      }

      if (dbMode === 'sqlite') {
        sqliteDb.all(processedSql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        pgClient.query(processedSql, params, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      }
    });
  },

  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      let processedSql = sql;
      if (dbMode === 'sqlite') {
        processedSql = sql.replace(/\$(\d+)/g, '?');
      }

      if (dbMode === 'sqlite') {
        sqliteDb.get(processedSql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      } else {
        pgClient.query(processedSql, params, (err, res) => {
          if (err) reject(err);
          else resolve(res.rows[0]);
        });
      }
    });
  },

  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      let processedSql = sql;
      if (dbMode === 'sqlite') {
        processedSql = sql.replace(/\$(\d+)/g, '?');
      }

      if (dbMode === 'sqlite') {
        sqliteDb.run(processedSql, params, function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      } else {
        pgClient.query(processedSql, params, (err, res) => {
          if (err) reject(err);
          else {
            const lastRow = res.rows && res.rows[0];
            resolve({ 
              lastID: lastRow ? (lastRow.id || null) : null, 
              changes: res.rowCount 
            });
          }
        });
      }
    });
  }
};

// Initialize schema helper
async function initSchema() {
  const isSqlite = dbMode === 'sqlite';
  
  const createTablesSql = [
    // 1. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      college_name TEXT,
      branch TEXT,
      department TEXT,
      course TEXT,
      year_semester TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'India',
      reg_number TEXT,
      student_id TEXT UNIQUE,
      avatar_url TEXT,
      subscription_status TEXT DEFAULT 'free', -- 'free', 'student', 'premium', 'patent'
      role TEXT DEFAULT 'user', -- 'user', 'admin'
      is_verified INTEGER DEFAULT 0,
      is_student_verified INTEGER DEFAULT 0,
      otp_code TEXT,
      otp_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 2. Projects Table
    `CREATE TABLE IF NOT EXISTS projects (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      components TEXT,
      project_type TEXT,
      content TEXT, -- JSON layout details
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Reports Table
    `CREATE TABLE IF NOT EXISTS reports (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      project_description TEXT,
      template_file_path TEXT,
      content TEXT, -- JSON generated data
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 4. PCB Designs Table
    `CREATE TABLE IF NOT EXISTS pcb_designs (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      project_name TEXT NOT NULL,
      components TEXT,
      schematic_path TEXT,
      layout_path TEXT,
      bom_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 5. Saved Projects Table
    `CREATE TABLE IF NOT EXISTS saved_projects (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 6. Payments Table
    `CREATE TABLE IF NOT EXISTS payments (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      plan_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL, -- 'razorpay', 'manual_qr'
      reference_screenshot_path TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      transaction_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 7. Downloads Table
    `CREATE TABLE IF NOT EXISTS downloads (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL, -- 'code', 'pptx', 'docx', 'pdf', 'kicad'
      download_url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 8. Activity Logs Table
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 9. Project Ideas Table (Phase 2 — Module 1)
    `CREATE TABLE IF NOT EXISTS project_ideas (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      components TEXT,
      branch TEXT,
      project_type TEXT,
      ideas TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 10. User Templates Table (Phase 2 — Module 2)
    `CREATE TABLE IF NOT EXISTS user_templates (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      template_name TEXT NOT NULL,
      template_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      styles TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 11. Viva Sets Table (Phase 2 — Module 3)
    `CREATE TABLE IF NOT EXISTS viva_sets (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      project_title TEXT NOT NULL,
      components TEXT,
      examiner_mode INTEGER DEFAULT 0,
      questions TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // 12. Patents Table (Phase 2 — Module 4)
    `CREATE TABLE IF NOT EXISTS patents (
      id ${isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY'},
      user_id INTEGER NOT NULL,
      project_title TEXT NOT NULL,
      innovation_summary TEXT,
      components TEXT,
      content TEXT,
      docx_path TEXT,
      innovation_score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  try {
    for (const sql of createTablesSql) {
      await db.run(sql);
    }

    // Safe migrations for existing databases — add new columns if they don't exist
    if (isSqlite) {
      const migrations = [
        `ALTER TABLE users ADD COLUMN department TEXT`,
        `ALTER TABLE users ADD COLUMN course TEXT`,
        `ALTER TABLE users ADD COLUMN year_semester TEXT`,
        `ALTER TABLE users ADD COLUMN city TEXT`,
        `ALTER TABLE users ADD COLUMN state TEXT`,
        `ALTER TABLE users ADD COLUMN country TEXT DEFAULT 'India'`,
        `ALTER TABLE users ADD COLUMN student_id TEXT`,
        `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
        `ALTER TABLE users ADD COLUMN is_student_verified INTEGER DEFAULT 0`,
      ];
      for (const m of migrations) {
        try { await db.run(m); } catch (_) { /* column already exists — skip */ }
      }
    }

    console.log('ProjectForge AI database schemas verified.');
    await seedData();
  } catch (error) {
    console.error('Error during database schema setup:', error);
  }
}

// Seeding default Admin and initial accounts
async function seedData() {
  try {
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('admin123', salt);
    
    // Seed default Admin: admin@projectforge.ai
    const adminExists = await db.get(`SELECT id FROM users WHERE email = $1`, ['admin@projectforge.ai']);
    if (!adminExists) {
      await db.run(
        `INSERT INTO users (name, mobile, email, password_hash, subscription_status, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Forge Admin', '+919999999999', 'admin@projectforge.ai', defaultPasswordHash, 'premium', 'admin', 1]
      );
      console.log('Seeded Admin account: admin@projectforge.ai / admin123');
    }

    // Seed a default test student user
    const testStudentExists = await db.get(`SELECT id FROM users WHERE email = $1`, ['student@projectforge.ai']);
    if (!testStudentExists) {
      const studentHash = await bcrypt.hash('student123', salt);
      await db.run(
        `INSERT INTO users (name, mobile, email, password_hash, subscription_status, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['John Doe Student', '+919876543210', 'student@projectforge.ai', studentHash, 'free', 'user', 1]
      );
      console.log('Seeded Student account: student@projectforge.ai / student123');
    }
  } catch (error) {
    console.error('Error seeding initial user data:', error);
  }
}

// Trigger initial tables creation
initSchema();

module.exports = db;
