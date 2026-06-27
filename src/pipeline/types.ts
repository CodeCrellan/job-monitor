/**
 * Pipeline types and interfaces
 */

import type { Job } from '../storage/types';

/**
 * Pipeline processor interface
 */
export interface IPipeline {
  /** Process a batch of raw jobs */
  process(jobs: import('../scrapers/types').RawJob[]): Promise<Job[]>;
}

/**
 * Hash generation function
 */
export type HashGenerator = (job: Job) => string;

/**
 * Keyword matching function
 */
export type KeywordMatcher = (job: Job, keywords: KeywordFilter) => boolean;

/**
 * Keyword filter configuration
 */
export interface KeywordFilter {
  /** Required keywords (at least one must match) */
  required: string[];
  /** Bonus keywords (informational only) */
  bonus: string[];
  /** Excluded keywords (must not match) */
  excluded: string[];
}
