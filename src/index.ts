/**
 * Job Monitor - Entry Point
 * Main application that wires everything together
 */

import 'dotenv/config';
import { loadConfig, loadCompanies, loadFilters, validateConfig } from './config';
import { createDatabase } from './storage/database';
import { createRepository } from './storage/repository';
import { createScrapers } from './scrapers';
import { Pipeline } from './pipeline';
import { createTelegramNotifier } from './notifications/telegram';
import { Scheduler } from './scheduler';

async function main(): Promise<void> {
  console.log('Job Monitor starting...');
  console.log('');

  try {
    // 1. Load configuration
    console.log('Loading configuration...');
    const appConfig = loadConfig();
    const companies = loadCompanies();
    const filters = loadFilters();
    
    validateConfig(appConfig);
    console.log('  Config loaded');

    // 2. Initialize database
    console.log('Initializing database...');
    const db = createDatabase(appConfig.storage.dbPath);
    const repository = createRepository(db);
    console.log('  Database ready');

    // 3. Create scrapers
    console.log('Creating scrapers...');
    const scrapers = createScrapers(companies);
    console.log(`  ${scrapers.length} scrapers created`);

    // 4. Create pipeline
    console.log('Creating pipeline...');
    const pipeline = new Pipeline(repository, {
      keywordConfig: filters,
      experienceConfig: filters.experience,
      locationConfig: filters.location,
    });
    console.log('  Pipeline ready');

    // Log filters status
    if (filters.experience?.enabled) {
      console.log(`  Experience filter: max ${filters.experience.maxYears} years`);
    }
    if (filters.location?.enabled) {
      console.log(`  Location filter: ${filters.location.userCountry}, remote=${filters.location.allowRemote}, visa=${filters.location.allowVisaSponsorship}`);
    }

    // 5. Create notification service
    console.log('Creating notification service...');
    const notifier = createTelegramNotifier(appConfig.notifications.telegram);
    console.log('  Notifications ready');

    // 6. Create and start scheduler
    console.log('Starting scheduler...');
    const scheduler = new Scheduler(
      scrapers,
      pipeline,
      notifier,
      repository,
      appConfig.schedule,
      appConfig.storage.retentionDays
    );
    scheduler.start();

    // 7. Run an initial RSS cycle immediately on startup
    console.log('Running initial cycle...');
    await scheduler.runNow('rss');

    console.log('');
    console.log('Job Monitor is running!');
    console.log('Press Ctrl+C to stop');
    console.log('');

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('Shutting down...');
      scheduler.stop();
      db.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('Failed to start Job Monitor:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main };
