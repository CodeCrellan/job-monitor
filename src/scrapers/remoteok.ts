/**
 * RemoteOK API fetcher
 * Fetches remote jobs from RemoteOK's public API
 */

import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

/**
 * RemoteOK API response types
 */
interface RemoteOKJob {
  id: string;
  position: string;
  company: string;
  location: string;
  description: string;
  url: string;
  created_at: number;
  tags: string[];
}

/**
 * RemoteOK API fetcher
 */
export class RemoteOKFetcher implements ISourceFetcher {
  readonly name = 'remoteok';

  /**
   * Fetch jobs from RemoteOK
   */
  async fetch(): Promise<RawJob[]> {
    const url = 'https://remoteok.com/api';
    
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
      
      const data = await response.json() as RemoteOKJob[];
      
      // RemoteOK returns metadata as first element, skip it
      const jobs = data.filter((item) => item.id && item.position);
      
      return jobs.map((job) => this.normalize(job));
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
   * Normalize a RemoteOK job to RawJob format
   */
  private normalize(job: RemoteOKJob): RawJob {
    return {
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description || '',
      url: `https://remoteok.com/remote-jobs/${job.id}`,
      applyUrl: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      source: this.name,
      sourceId: job.id,
      postedDate: job.created_at ? new Date(job.created_at * 1000) : undefined,
    };
  }
}
