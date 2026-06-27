/**
 * Keyword filtering logic
 * Filters jobs based on required, bonus, and excluded keywords
 */

import type { Job } from '../storage/types';
import type { KeywordFilter } from './types';

/**
 * Check if text contains a keyword as a whole word (word boundary match)
 * Uses \b word boundary to avoid substring false positives (e.g. "arm" in "farm")
 */
function textMatchesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/**
 * Check if a job matches the keyword criteria
 */
export function matchesKeywords(job: Job, config: KeywordFilter): boolean {
  const text = `${job.title} ${job.description}`;

  // Must match at least two different required keywords to reduce false positives
  const matchedRequired = config.required.filter((kw) =>
    textMatchesKeyword(text, kw)
  );
  if (matchedRequired.length < 2) {
    return false;
  }

  // Must not match any excluded keyword (whole word match)
  const hasExcluded = config.excluded.some((kw) =>
    textMatchesKeyword(text, kw)
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
  const text = `${job.title} ${job.description}`;
  const matched: string[] = [];

  // Check required keywords
  for (const kw of config.required) {
    if (textMatchesKeyword(text, kw)) {
      matched.push(kw);
    }
  }

  // Check bonus keywords
  for (const kw of config.bonus) {
    if (textMatchesKeyword(text, kw)) {
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
