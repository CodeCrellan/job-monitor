/**
 * Scraper types and interfaces
 */

/**
 * Source fetcher interface
 */
export interface ISourceFetcher {
  /** Source name (e.g., "greenhouse", "lever") */
  readonly name: string;
  /** Fetch jobs from source */
  fetch(): Promise<RawJob[]>;
}

/**
 * Raw job from any source before normalization
 */
export interface RawJob {
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Location (city, country, "Remote") */
  location?: string;
  /** Job description (HTML or plain text) */
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
  postedDate?: Date;
}

/**
 * Error thrown when a source fetch fails
 */
export class SourceError extends Error {
  constructor(
    public readonly source: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Source ${source}: ${message}`);
    this.name = 'SourceError';
  }
}
