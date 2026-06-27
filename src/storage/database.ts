/**
 * SQLite database setup and connection management
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * Database schema initialization SQL
 */
const SCHEMA_SQL = `
-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  url TEXT NOT NULL,
  apply_url TEXT,
  source TEXT NOT NULL,
  source_id TEXT,
  posted_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  keywords_matched TEXT
);

-- Seen jobs for deduplication
CREATE TABLE IF NOT EXISTS seen_jobs (
  hash TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Configuration storage
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_seen_created ON seen_jobs(created_at);
`;

/**
 * Database connection wrapper
 */
export class DatabaseManager {
  private db: Database.Database;

  /**
   * Create a new database connection
   * @param dbPath Path to SQLite database file
   */
  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Initialize schema
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.db.exec(SCHEMA_SQL);
    console.log('Database schema initialized');
  }

  /**
   * Get the underlying database instance
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    console.log('Database connection closed');
  }

  /**
   * Check if database is healthy
   */
  isHealthy(): boolean {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a new database manager
 */
export function createDatabase(dbPath: string): DatabaseManager {
  return new DatabaseManager(dbPath);
}
