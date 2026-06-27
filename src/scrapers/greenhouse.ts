/**
 * Greenhouse ATS feed fetcher
 * Fetches jobs from Greenhouse's public API
 */

import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

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
 * Greenhouse API response types
 */
interface GreenhouseJob {
  id: number;
  title: string;
  location: {
    name: string;
  };
  content: string;
  absolute_url: string;
  updated_at: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

/**
 * Greenhouse ATS fetcher
 */
export class GreenhouseFetcher implements ISourceFetcher {
  readonly name = 'greenhouse';

  /**
   * Create a new Greenhouse fetcher
   * @param token Company's Greenhouse board token
   */
  constructor(private token: string) {}

  /**
   * Fetch jobs from Greenhouse
   */
  async fetch(): Promise<RawJob[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${this.token}/jobs?content=true`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new SourceError(
          this.name,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
      
      const data = await response.json() as GreenhouseResponse;
      
      return data.jobs.map((job) => this.normalize(job));
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
   * Normalize a Greenhouse job to RawJob format
   */
  private normalize(job: GreenhouseJob): RawJob {
    return {
      title: job.title,
      company: this.token,
      location: job.location?.name,
      description: stripHtml(job.content || ''),
      url: job.absolute_url,
      applyUrl: job.absolute_url,
      source: this.name,
      sourceId: job.id.toString(),
      postedDate: job.updated_at ? new Date(job.updated_at) : undefined,
    };
  }
}
