/**
 * Lever ATS feed fetcher
 * Fetches jobs from Lever's public API
 */

import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

/**
 * Lever API response types
 */
interface LeverJob {
  id: string;
  text: string;
  categories: {
    team?: string;
    department?: string;
    location?: string;
    commitment?: string;
  };
  descriptionPlain: string;
  hostedUrl: string;
  applyUrl: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Lever ATS fetcher
 */
export class LeverFetcher implements ISourceFetcher {
  readonly name = 'lever';

  /**
   * Create a new Lever fetcher
   * @param token Company's Lever site token
   */
  constructor(private token: string) {}

  /**
   * Fetch jobs from Lever
   */
  async fetch(): Promise<RawJob[]> {
    const url = `https://api.lever.co/v0/postings/${this.token}?mode=json`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new SourceError(
          this.name,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
      
      const data = await response.json() as LeverJob[];
      
      return data.map((job) => this.normalize(job));
    } catch (error) {
      if (error instanceof SourceError) {
        throw error;
      }
      throw new SourceError(
        this.name,
        `Failed to fetch: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Normalize a Lever job to RawJob format
   */
  private normalize(job: LeverJob): RawJob {
    return {
      title: job.text,
      company: this.token,
      location: job.categories?.location,
      description: job.descriptionPlain || '',
      url: job.hostedUrl,
      applyUrl: job.applyUrl || job.hostedUrl,
      source: this.name,
      sourceId: job.id,
      postedDate: job.createdAt ? new Date(job.createdAt) : undefined,
    };
  }
}
