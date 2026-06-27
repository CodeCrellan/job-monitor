/**
 * Scheduler
 * Runs scrapers on configurable cron schedules
 */

import cron from 'node-cron';
import type { ISourceFetcher } from '../scrapers/types';
import type { Pipeline } from '../pipeline';
import type { INotificationService } from '../notifications/types';
import type { IJobRepository } from '../storage/types';
import { getScrapersByType } from '../scrapers';

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  ats: string;
  rss: string;
  cleanup: string;
}

/**
 * Main scheduler that orchestrates scraping cycles
 */
export class Scheduler {
  private running = new Set<string>();
  private tasks: cron.ScheduledTask[] = [];

  constructor(
    private scrapers: ISourceFetcher[],
    private pipeline: Pipeline,
    private notifier: INotificationService,
    private repository: IJobRepository,
    private config: SchedulerConfig,
    private retentionDays: number
  ) {}

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('Starting scheduler...');

    // ATS feeds (every 6 hours)
    const atsTask = cron.schedule(this.config.ats, () => this.runCycle('ats'));
    this.tasks.push(atsTask);

    // RSS feeds (daily)
    const rssTask = cron.schedule(this.config.rss, () => this.runCycle('rss'));
    this.tasks.push(rssTask);

    // Cleanup (weekly)
    const cleanupTask = cron.schedule(this.config.cleanup, () => this.cleanup());
    this.tasks.push(cleanupTask);

    console.log('Scheduler started');
    console.log(`  ATS: ${this.config.ats}`);
    console.log(`  RSS: ${this.config.rss}`);
    console.log(`  Cleanup: ${this.config.cleanup}`);
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    console.log('Scheduler stopped');
  }

  /**
   * Run a scraping cycle
   */
  private async runCycle(type: 'ats' | 'rss'): Promise<void> {
    const key = `cycle:${type}`;
    
    if (this.running.has(key)) {
      console.log(`[${type}] Cycle already running, skipping`);
      return;
    }

    this.running.add(key);
    console.log(`[${type}] Starting cycle at ${new Date().toISOString()}`);

    try {
      const subset = getScrapersByType(this.scrapers, type);
      let totalNew = 0;

      for (const scraper of subset) {
        try {
          console.log(`[${type}] Fetching from ${scraper.name}...`);
          const rawJobs = await scraper.fetch();
          console.log(`[${type}] ${scraper.name}: fetched ${rawJobs.length} jobs`);

          const newJobs = await this.pipeline.process(rawJobs);
          console.log(`[${type}] ${scraper.name}: ${newJobs.length} new jobs`);

          for (const job of newJobs) {
            await this.notifier.send(job);
          }

          totalNew += newJobs.length;
        } catch (error) {
          console.error(`[${type}] ${scraper.name} failed:`, error);
        }
      }

      console.log(`[${type}] Cycle complete: ${totalNew} new jobs total`);
    } finally {
      this.running.delete(key);
    }
  }

  /**
   * Cleanup old jobs
   */
  private async cleanup(): Promise<void> {
    console.log('Running cleanup...');
    const deleted = await this.repository.cleanup(this.retentionDays);
    console.log(`Cleanup complete: deleted ${deleted} old jobs`);
  }

  /**
   * Run a cycle immediately (for testing)
   */
  async runNow(type: 'ats' | 'rss'): Promise<void> {
    await this.runCycle(type);
  }
}

/**
 * Create a scheduler instance
 */
export function createScheduler(
  scrapers: ISourceFetcher[],
  pipeline: Pipeline,
  notifier: INotificationService,
  repository: IJobRepository,
  config: SchedulerConfig,
  retentionDays: number
): Scheduler {
  return new Scheduler(scrapers, pipeline, notifier, repository, config, retentionDays);
}
