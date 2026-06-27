/**
 * Configuration types for job-monitor
 */

/**
 * Main application configuration
 */
export interface AppConfig {
  /** Schedule configuration */
  schedule: ScheduleConfig;
  /** Notification configuration */
  notifications: NotificationConfig;
  /** Storage configuration */
  storage: StorageConfig;
}

/**
 * Cron schedule configuration
 */
export interface ScheduleConfig {
  /** ATS feeds schedule (every 6 hours) */
  ats: string;
  /** RSS feeds schedule (daily) */
  rss: string;
  /** Cleanup schedule (weekly) */
  cleanup: string;
}

/**
 * Notification service configuration
 */
export interface NotificationConfig {
  /** Telegram bot configuration */
  telegram: TelegramConfig;
}

/**
 * Telegram Bot API configuration
 */
export interface TelegramConfig {
  /** Whether Telegram notifications are enabled */
  enabled: boolean;
  /** Bot API token from @BotFather */
  botToken: string;
  /** Chat ID to send notifications to */
  chatId: string;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Path to SQLite database file */
  dbPath: string;
  /** Number of days to keep job records */
  retentionDays: number;
}

/**
 * Company configuration by ATS type
 */
export interface CompanyConfig {
  /** Greenhouse ATS companies */
  greenhouse: CompanyEntry[];
  /** Lever ATS companies */
  lever: CompanyEntry[];
  /** Ashby ATS companies */
  ashby: CompanyEntry[];
}

/**
 * Single company entry
 */
export interface CompanyEntry {
  /** Company name */
  name: string;
  /** ATS token/slug */
  token: string;
}

/**
 * Keyword filtering configuration
 */
export interface KeywordConfig {
  /** Required keywords (at least one must match) */
  required: string[];
  /** Bonus keywords (increase priority) */
  bonus: string[];
  /** Excluded keywords (must not match) */
  excluded: string[];
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
 * Source fetcher interface
 */
export interface ISourceFetcher {
  /** Source name (e.g., "greenhouse", "lever") */
  readonly name: string;
  /** Fetch jobs from source */
  fetch(): Promise<RawJob[]>;
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

/**
 * Notification service interface
 */
export interface INotificationService {
  /** Send job notification */
  send(job: Job): Promise<boolean>;
}
