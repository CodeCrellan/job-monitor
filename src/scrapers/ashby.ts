/**
 * Ashby ATS feed fetcher
 * Fetches jobs from Ashby's public API
 */

import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

/**
 * Ashby API response types
 */
interface AshbyJob {
  id: string;
  title: string;
  location: string;
  descriptionHtml: string;
  jobUrl: string;
  applyUrl: string;
  isListed: boolean;
}

interface AshbyResponse {
  jobs: AshbyJob[];
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ashby ATS fetcher
 */
export class AshbyFetcher implements ISourceFetcher {
  readonly name = 'ashby';

  /**
   * Create a new Ashby fetcher
   * @param token Company's Ashby job board name
   */
  constructor(private token: string) {}

  /**
   * Fetch jobs from Ashby
   */
  async fetch(): Promise<RawJob[]> {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${this.token}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new SourceError(
          this.name,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
      
      const data = await response.json() as AshbyResponse;
      
      return data.jobs
        .filter((job) => job.isListed)
        .map((job) => this.normalize(job));
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
   * Normalize an Ashby job to RawJob format
   */
  private normalize(job: AshbyJob): RawJob {
    return {
      title: job.title,
      company: this.token,
      location: job.location,
      description: stripHtml(job.descriptionHtml || ''),
      url: job.jobUrl,
      applyUrl: job.applyUrl || job.jobUrl,
      source: this.name,
      sourceId: job.id,
    };
  }
}
