/**
 * SQLite repository implementation
 * Implements IJobRepository using better-sqlite3
 */

import type { Job, IJobRepository } from './types';
import { DatabaseManager } from './database';

/**
 * SQLite-based job repository
 */
export class SQLiteRepository implements IJobRepository {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Save a new job to the database
   */
  async save(job: Job): Promise<void> {
    const database = this.db.getDatabase();
    
    const stmt = database.prepare(`
      INSERT INTO jobs (id, title, company, location, description, url, apply_url, source, source_id, posted_date, keywords_matched)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      job.id,
      job.title,
      job.company,
      job.location,
      job.description,
      job.url,
      job.applyUrl,
      job.source,
      job.sourceId,
      job.postedDate.toISOString(),
      JSON.stringify(job.keywordsMatched)
    );
  }

  /**
   * Check if a job hash was already seen
   */
  async seenExists(hash: string): Promise<boolean> {
    const database = this.db.getDatabase();
    
    const stmt = database.prepare('SELECT 1 FROM seen_jobs WHERE hash = ?');
    const result = stmt.get(hash);
    
    return !!result;
  }

  /**
   * Mark a job hash as seen
   */
  async markSeen(hash: string, jobId: string): Promise<void> {
    const database = this.db.getDatabase();
    
    const stmt = database.prepare('INSERT INTO seen_jobs (hash, job_id) VALUES (?, ?)');
    stmt.run(hash, jobId);
  }

  /**
   * Get recent jobs from the database
   */
  async getRecentJobs(limit: number): Promise<Job[]> {
    const database = this.db.getDatabase();
    
    const stmt = database.prepare(`
      SELECT * FROM jobs 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      description: row.description,
      url: row.url,
      applyUrl: row.apply_url,
      source: row.source,
      sourceId: row.source_id,
      postedDate: new Date(row.posted_date),
      createdAt: new Date(row.created_at),
      keywordsMatched: JSON.parse(row.keywords_matched || '[]'),
    }));
  }

  /**
   * Cleanup old jobs from the database
   */
  async cleanup(olderThanDays: number): Promise<number> {
    const database = this.db.getDatabase();
    
    const cutoff = new Date(Date.now() - olderThanDays * 86400000);
    
    const stmt = database.prepare('DELETE FROM jobs WHERE created_at < ?');
    const result = stmt.run(cutoff.toISOString());
    
    return result.changes;
  }
}

/**
 * Create a new SQLite repository
 */
export function createRepository(db: DatabaseManager): IJobRepository {
  return new SQLiteRepository(db);
}
