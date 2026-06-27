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
 * Check that ALL match-all groups match (AND between groups, OR within each group)
 * Returns true if no matchAll groups are configured
 */
function matchesMatchAll(text: string, groups: string[][]): boolean {
  if (!groups || groups.length === 0) {
    return true; // No constraint
  }

  return groups.every((group) =>
    group.some((kw) => textMatchesKeyword(text, kw))
  );
}

/**
 * Check if a job matches the keyword criteria
 */
export function matchesKeywords(job: Job, config: KeywordFilter): boolean {
  const text = `${job.title} ${job.description}`;

  // Must match at least one required keyword (whole word match)
  const hasRequired = config.required.some((kw) =>
    textMatchesKeyword(text, kw)
  );
  if (!hasRequired) {
    return false;
  }

  // Must pass all match-all groups (AND between groups, OR within each)
  if (config.matchAll && !matchesMatchAll(text, config.matchAll)) {
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

  // Check match-all group keywords
  if (config.matchAll) {
    for (const group of config.matchAll) {
      for (const kw of group) {
        if (textMatchesKeyword(text, kw)) {
          matched.push(kw);
        }
      }
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
