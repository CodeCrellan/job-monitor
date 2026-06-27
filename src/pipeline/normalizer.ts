/**
 * Job normalizer
 * Converts RawJob to normalized Job format
 */

import { v4 as uuidv4 } from 'uuid';
import type { RawJob } from '../scrapers/types';
import type { Job } from '../storage/types';

/**
 * Normalize a raw job to the canonical Job format
 */
export function normalize(raw: RawJob): Job {
  return {
    id: uuidv4(),
    title: cleanText(raw.title),
    company: cleanText(raw.company),
    location: raw.location ? cleanText(raw.location) : 'Unknown',
    description: cleanText(raw.description),
    url: raw.url,
    applyUrl: raw.applyUrl,
    source: raw.source,
    sourceId: raw.sourceId,
    postedDate: raw.postedDate || new Date(),
    createdAt: new Date(),
    keywordsMatched: [],
  };
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a batch of raw jobs
 */
export function normalizeBatch(jobs: RawJob[]): Job[] {
  return jobs.map(normalize);
}
