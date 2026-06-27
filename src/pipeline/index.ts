/**
 * Pipeline orchestrator
 * Chains normalizer, dedup, keyword filter, experience filter, location filter, and storage
 */

import type { RawJob } from '../scrapers/types';
import type { Job, IJobRepository } from '../storage/types';
import type { KeywordFilter } from './types';
import type { ExperienceConfig, LocationConfig } from '../config/types';
import { normalize } from './normalizer';
import { generateHash } from './dedupe';
import { matchesKeywords, findMatchedKeywords } from './filter';
import { matchesExperience } from './experience-filter';
import { matchesLocation } from './location-filter';

export interface PipelineOptions {
  keywordConfig: KeywordFilter;
  experienceConfig?: ExperienceConfig;
  locationConfig?: LocationConfig;
}

/**
 * Pipeline class that processes raw jobs
 */
export class Pipeline {
  private keywordConfig: KeywordFilter;
  private experienceConfig?: ExperienceConfig;
  private locationConfig?: LocationConfig;

  constructor(
    private repository: IJobRepository,
    options: PipelineOptions
  ) {
    this.keywordConfig = options.keywordConfig;
    this.experienceConfig = options.experienceConfig;
    this.locationConfig = options.locationConfig;
  }

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

        // 3. Keyword filter
        if (!matchesKeywords(job, this.keywordConfig)) {
          continue;
        }

        // 4. Add matched keywords
        job.keywordsMatched = findMatchedKeywords(job, this.keywordConfig);

        // 5. Experience filter
        if (this.experienceConfig?.enabled) {
          if (!matchesExperience(job, this.experienceConfig.maxYears)) {
            continue;
          }
        }

        // 6. Location filter
        if (this.locationConfig?.enabled) {
          if (!matchesLocation(job, this.locationConfig)) {
            continue;
          }
        }

        // 7. Store
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
  options: PipelineOptions
): Pipeline {
  return new Pipeline(repository, options);
}
