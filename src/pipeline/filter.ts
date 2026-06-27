/**
 * Keyword filtering logic
 * Filters jobs based on required, bonus, and excluded keywords
 */

import type { Job } from '../storage/types';
import type { KeywordFilter } from './types';

/**
 * Check if a job matches the keyword criteria
 */
export function matchesKeywords(job: Job, config: KeywordFilter): boolean {
  const text = `${job.title} ${job.description}`.toLowerCase();

  // Must match at least one required keyword
  const hasRequired = config.required.some((kw) =>
    text.includes(kw.toLowerCase())
  );
  if (!hasRequired) {
    return false;
  }

  // Must not match any excluded keyword
  const hasExcluded = config.excluded.some((kw) =>
    text.includes(kw.toLowerCase())
  );
  if (hasExcluded) {
    return false;
  }

  return true;
}

/**
 * Find which keywords matched in a job
 */
export function findMatchedKeywords(job: Job, config: KeywordFilter): string[] {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const matched: string[] = [];

  // Check required keywords
  for (const kw of config.required) {
    if (text.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }

  // Check bonus keywords
  for (const kw of config.bonus) {
    if (text.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }

  return matched;
}

/**
 * Filter jobs by keywords
 */
export function filterByKeywords(jobs: Job[], config: KeywordFilter): Job[] {
  return jobs.filter((job) => matchesKeywords(job, config));
}
