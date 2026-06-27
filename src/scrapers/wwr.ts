/**
 * WeWorkRemotely RSS feed fetcher
 * Fetches remote jobs from WWR's RSS feed
 */

import { XMLParser } from 'fast-xml-parser';
import type { ISourceFetcher, RawJob } from './types';
import { SourceError } from './types';

/**
 * RSS item type
 */
interface RSSItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  category?: string[];
}

/**
 * RSS feed type
 */
interface RSSFeed {
  rss?: {
    channel?: {
      item?: RSSItem | RSSItem[];
    };
  };
}

/**
 * WeWorkRemotely RSS fetcher
 */
export class WWRFetcher implements ISourceFetcher {
  readonly name = 'wwr';
  
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * Fetch jobs from WeWorkRemotely RSS
   */
  async fetch(): Promise<RawJob[]> {
    const url = 'https://weworkremotely.com/remote-jobs.rss';
    
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
      
      const xml = await response.text();
      const feed: RSSFeed = this.parser.parse(xml);
      
      // Extract items from feed
      const channel = feed.rss?.channel;
      if (!channel?.item) {
        return [];
      }
      
      // Normalize to array
      const items = Array.isArray(channel.item) ? channel.item : [channel.item];
      
      return items
        .filter((item) => item.title && item.link)
        .map((item) => this.normalize(item));
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
   * Normalize an RSS item to RawJob format
   */
  private normalize(item: RSSItem): RawJob {
    // Extract company from title (usually "Company Name - Job Title" or similar)
    const titleParts = item.title?.split(' - ') || [];
    const company = titleParts.length > 1 ? titleParts[0].trim() : 'Unknown';
    const jobTitle = titleParts.length > 1 ? titleParts.slice(1).join(' - ').trim() : item.title || '';
    
    return {
      title: jobTitle,
      company,
      location: 'Remote',
      description: item.description || '',
      url: item.link || '',
      applyUrl: item.link || '',
      source: this.name,
      sourceId: item.link || '',
      postedDate: item.pubDate ? new Date(item.pubDate) : undefined,
    };
  }
}
