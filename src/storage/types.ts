/**
 * Storage types and interfaces
 */

/**
 * Normalized job after processing
 */
export interface Job {
  /** UUID */
  id: string;
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Location (city, country, "Remote") */
  location: string;
  /** Job description (plain text) */
  description: string;
  /** Original job URL */
  url: string;
  /** Direct apply URL */
  applyUrl: string;
  /** Source identifier */
  source: string;
  /** Original ID from source */
  sourceId: string;
  /** When job was posted */
  postedDate: Date;
  /** When we discovered it */
  createdAt: Date;
  /** Which keywords matched */
  keywordsMatched: string[];
}

/**
 * Job repository interface
 */
export interface IJobRepository {
  /** Save a new job */
  save(job: Job): Promise<void>;
  /** Check if job hash was already seen */
  seenExists(hash: string): Promise<boolean>;
  /** Mark job hash as seen */
  markSeen(hash: string, jobId: string): Promise<void>;
  /** Get recent jobs */
  getRecentJobs(limit: number): Promise<Job[]>;
  /** Cleanup old jobs */
  cleanup(olderThanDays: number): Promise<number>;
}
