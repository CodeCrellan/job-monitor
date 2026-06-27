/**
 * Job Monitor - Entry Point
 * Main application that wires everything together
 */

import 'dotenv/config';
import { loadConfig, loadCompanies, loadKeywords, validateConfig } from './config';
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
    const keywords = loadKeywords();
    
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
      keywordConfig: keywords,
      experienceConfig: appConfig.experience,
      locationConfig: appConfig.location,
    });
    console.log('  Pipeline ready');

    // Log filters status
    if (appConfig.experience?.enabled) {
      console.log(`  Experience filter: max ${appConfig.experience.maxYears} years`);
    }
    if (appConfig.location?.enabled) {
      console.log(`  Location filter: ${appConfig.location.userCountry}, remote=${appConfig.location.allowRemote}, visa=${appConfig.location.allowVisaSponsorship}`);
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
