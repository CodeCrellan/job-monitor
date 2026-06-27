/**
 * Configuration loader
 * Loads YAML config files and environment variables
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import type {
  AppConfig,
  CompanyConfig,
  KeywordConfig,
} from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AppConfig = {
  schedule: {
    ats: '0 */6 * * *',      // Every 6 hours
    rss: '0 0 * * *',        // Daily at midnight
    cleanup: '0 0 * * 0',    // Weekly on Sunday
  },
  notifications: {
    telegram: {
      enabled: true,
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
  },
  storage: {
    dbPath: process.env.DB_PATH || './data/jobs.db',
    retentionDays: parseInt(process.env.RETENTION_DAYS || '90', 10),
  },
};

/**
 * Load and parse a YAML file
 */
function loadYamlFile<T>(filePath: string): T {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseYaml(content) as T;
  } catch (error) {
    console.error(`Failed to load config file: ${filePath}`, error);
    throw error;
  }
}

/**
 * Load application configuration
 */
export function loadConfig(configDir: string = './config'): AppConfig {
  // Load main config (with defaults)
  let fileConfig: Partial<AppConfig> = {};
  try {
    fileConfig = loadYamlFile<Partial<AppConfig>>(join(configDir, 'config.yaml'));
  } catch {
    console.warn('No config.yaml found, using defaults');
  }

  // Merge with defaults
  const config: AppConfig = {
    schedule: { ...DEFAULT_CONFIG.schedule, ...fileConfig.schedule },
    notifications: {
      telegram: {
        ...DEFAULT_CONFIG.notifications.telegram,
        ...fileConfig.notifications?.telegram,
      },
    },
    storage: { ...DEFAULT_CONFIG.storage, ...fileConfig.storage },
    experience: fileConfig.experience,
    location: fileConfig.location,
  };

  // Override with environment variables
  if (process.env.TELEGRAM_BOT_TOKEN) {
    config.notifications.telegram.botToken = process.env.TELEGRAM_BOT_TOKEN;
  }
  if (process.env.TELEGRAM_CHAT_ID) {
    config.notifications.telegram.chatId = process.env.TELEGRAM_CHAT_ID;
  }
  if (process.env.DB_PATH) {
    config.storage.dbPath = process.env.DB_PATH;
  }

  return config;
}

/**
 * Load company configuration
 */
export function loadCompanies(configDir: string = './config'): CompanyConfig {
  return loadYamlFile<CompanyConfig>(join(configDir, 'companies.yaml'));
}

/**
 * Load keyword configuration
 */
export function loadKeywords(configDir: string = './config'): KeywordConfig {
  return loadYamlFile<KeywordConfig>(join(configDir, 'keywords.yaml'));
}

/**
 * Validate required configuration
 */
export function validateConfig(config: AppConfig): void {
  if (config.notifications.telegram.enabled) {
    if (!config.notifications.telegram.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is required when Telegram is enabled');
    }
    if (!config.notifications.telegram.chatId) {
      throw new Error('TELEGRAM_CHAT_ID is required when Telegram is enabled');
    }
  }
}
