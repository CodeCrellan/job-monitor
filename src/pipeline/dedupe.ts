/**
 * Deduplication logic
 * Uses SHA256 hash to identify duplicate jobs
 */

import { createHash } from 'crypto';
import type { Job } from '../storage/types';

/**
 * Generate a hash for a job to detect duplicates
 * Hash is based on: title + company + applyUrl (lowercased)
 */
export function generateHash(job: Job): string {
  const input = `${job.title.toLowerCase()}${job.company.toLowerCase()}${job.applyUrl.toLowerCase()}`;
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Check if two jobs are duplicates
 */
export function areDuplicates(a: Job, b: Job): boolean {
  return generateHash(a) === generateHash(b);
}

/**
 * Filter out duplicate jobs from an array
 * Keeps the first occurrence of each unique job
 */
export function deduplicate(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const unique: Job[] = [];

  for (const job of jobs) {
    const hash = generateHash(job);
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(job);
    }
  }

  return unique;
}
