/**
 * Jobicy API fetcher
 * Fetches remote jobs from Jobicy's public API
 */

import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

/**
 * Jobicy API response types
 */
interface JobicyJob {
  id: number;
  job_title: string;
  company_name: string;
  job_location: string;
  job_description: string;
  url: string;
  job_type: string;
  job_level: string;
  annual_salary_min: number;
  annual_salary_max: number;
  job_publisher: string;
  publication_date: string;
}

interface JobicyResponse {
  jobs: JobicyJob[];
}

/**
 * Jobicy API fetcher
 */
export class JobicyFetcher implements ISourceFetcher {
  readonly name = 'jobicy';

  /**
   * Fetch jobs from Jobicy
   */
  async fetch(): Promise<RawJob[]> {
    const url = 'https://jobicy.com/api/v2/jobs?tag=embedded&count=50';
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'job-monitor/1.0',
        },
      });
      
      if (!response.ok) {
        throw new SourceError(
          this.name,
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
      
      const data = await response.json() as JobicyResponse;
      
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
   * Normalize a Jobicy job to RawJob format
   */
  private normalize(job: JobicyJob): RawJob {
    return {
      title: job.job_title,
      company: job.company_name,
      location: job.job_location || 'Remote',
      description: job.job_description || '',
      url: job.url || `https://jobicy.com/jobs/${job.id}`,
      applyUrl: job.url || `https://jobicy.com/jobs/${job.id}`,
      source: this.name,
      sourceId: job.id.toString(),
      postedDate: job.publication_date ? new Date(job.publication_date) : undefined,
    };
  }
}
