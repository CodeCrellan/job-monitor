/**
 * FreeHire.dev API fetcher
 * Aggregates jobs from 70+ ATS sources (Greenhouse, Lever, Ashby, Workday, etc.)
 * Free, no API key required — 30 requests/minute rate limit
 *
 * API docs: https://freehire.dev/api/v1/jobs/search
 */

import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

/**
 * FreeHire API response types
 */
interface FreeHireJob {
  public_slug: string;
  source: string;
  external_id: string;
  url: string;
  title: string;
  company: string;
  company_slug: string;
  location: string;
  description: string;
  posted_at: string;
  enrichment?: {
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    experience_years_min?: number;
    employment_type?: string;
    cities?: string[];
    visa_sponsorship?: boolean;
  };
}

interface FreeHireResponse {
  data: FreeHireJob[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
}

/**
 * FreeHire API fetcher
 *
 * Fetches embedded/firmware/RTOS jobs from freehire.dev's aggregated API.
 * Queries with all relevant keywords and paginates through the freshest results.
 */
export class FreeHireFetcher implements ISourceFetcher {
  readonly name = 'freehire';

  private baseUrl = 'https://freehire.dev/api/v1/jobs/search';
  private maxJobs = 500;
  private pageSize = 100;

  /**
   * Fetch jobs from FreeHire API
   */
  async fetch(): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const keywordQuery = 'embedded firmware rtos bare metal microcontroller mcu soc device driver bsp hardware abstraction';

    let offset = 0;

    while (jobs.length < this.maxJobs) {
      try {
        const url = `${this.baseUrl}?q=${encodeURIComponent(keywordQuery)}&limit=${this.pageSize}&offset=${offset}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'job-monitor/1.0',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new SourceError(
            this.name,
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const body = await response.json() as FreeHireResponse;
        const items = body.data;

        if (!items || items.length === 0) {
          break; // No more results
        }

        for (const item of items) {
          jobs.push(this.normalize(item));
        }

        // Check if we've consumed all available results
        if (offset + this.pageSize >= body.meta.total) {
          break;
        }

        offset += this.pageSize;

        // Small delay to be polite
        await new Promise((r) => setTimeout(r, 200));
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

    return jobs;
  }

  /**
   * Normalize a FreeHire job to RawJob format
   */
  private normalize(item: FreeHireJob): RawJob {
    return {
      title: item.title,
      company: item.company,
      location: item.location || 'Unknown',
      description: item.description || '',
      url: item.url,
      applyUrl: item.url,
      source: this.name,
      sourceId: item.public_slug,
      postedDate: item.posted_at ? new Date(item.posted_at) : undefined,
    };
  }
}
