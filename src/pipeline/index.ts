/**
 * Pipeline orchestrator
 * Chains normalizer, dedup, filter, and storage
 */

import type { RawJob } from '../scrapers/types';
import type { Job, IJobRepository } from '../storage/types';
import type { KeywordFilter } from './types';
import { normalize } from './normalizer';
import { generateHash } from './dedupe';
import { matchesKeywords, findMatchedKeywords } from './filter';

/**
 * Pipeline class that processes raw jobs
 */
export class Pipeline {
  constructor(
    private repository: IJobRepository,
    private keywordConfig: KeywordFilter
  ) {}

  /**
   * Process a batch of raw jobs
   * Returns only new, matching jobs that were stored
   */
  async process(jobs: RawJob[]): Promise<Job[]> {
    const newJobs: Job[] = [];

    for (const raw of jobs) {
      try {
        // 1. Normalize
        const job = normalize(raw);

        // 2. Dedupe
        const hash = generateHash(job);
        const seen = await this.repository.seenExists(hash);
        if (seen) {
          continue;
        }

        // 3. Filter
        if (!matchesKeywords(job, this.keywordConfig)) {
          continue;
        }

        // 4. Add matched keywords
        job.keywordsMatched = findMatchedKeywords(job, this.keywordConfig);

        // 5. Store
        await this.repository.save(job);
        await this.repository.markSeen(hash, job.id);

        newJobs.push(job);
      } catch (error) {
        console.error('Pipeline error processing job:', error);
        // Continue with next job
      }
    }

    return newJobs;
  }
}

/**
 * Create a new pipeline instance
 */
export function createPipeline(
  repository: IJobRepository,
  keywordConfig: KeywordFilter
): Pipeline {
  return new Pipeline(repository, keywordConfig);
}
