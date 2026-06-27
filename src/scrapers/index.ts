/**
 * Scraper registry
 * Factory for creating and managing source fetchers
 */

import type { ISourceFetcher } from './types';
import type { CompanyConfig } from '../config/types';
import { GreenhouseFetcher } from './greenhouse';
import { LeverFetcher } from './lever';
import { AshbyFetcher } from './ashby';
import { RemoteOKFetcher } from './remoteok';
import { WWRFetcher } from './wwr';
import { JobicyFetcher } from './jobicy';
import { FreeHireFetcher } from './freehire';

/**
 * Create all scrapers from company configuration
 */
export function createScrapers(companies: CompanyConfig): ISourceFetcher[] {
  const scrapers: ISourceFetcher[] = [];

  // Add Greenhouse scrapers
  for (const company of companies.greenhouse) {
    scrapers.push(new GreenhouseFetcher(company.token));
  }

  // Add Lever scrapers
  for (const company of companies.lever) {
    scrapers.push(new LeverFetcher(company.token));
  }

  // Add Ashby scrapers
  for (const company of companies.ashby) {
    scrapers.push(new AshbyFetcher(company.token));
  }

  // Add global RSS/API scrapers
  scrapers.push(new RemoteOKFetcher());
  scrapers.push(new WWRFetcher());
  scrapers.push(new JobicyFetcher());
  scrapers.push(new FreeHireFetcher());

  return scrapers;
}

/**
 * Get scrapers by type (ats or rss)
 */
export function getScrapersByType(
  scrapers: ISourceFetcher[],
  type: 'ats' | 'rss'
): ISourceFetcher[] {
  const atsSources = ['greenhouse', 'lever', 'ashby'];
  const rssSources = ['remoteok', 'wwr', 'jobicy', 'freehire'];

  const sources = type === 'ats' ? atsSources : rssSources;
  return scrapers.filter((s) => sources.includes(s.name));
}

// Re-export all fetchers
export { GreenhouseFetcher } from './greenhouse';
export { LeverFetcher } from './lever';
export { AshbyFetcher } from './ashby';
export { RemoteOKFetcher } from './remoteok';
export { WWRFetcher } from './wwr';
export { JobicyFetcher } from './jobicy';
export { FreeHireFetcher } from './freehire';
export type { ISourceFetcher, RawJob } from './types';
