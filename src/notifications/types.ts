/**
 * Notification types and interfaces
 */

import type { Job } from '../storage/types';

/**
 * Notification service interface
 */
export interface INotificationService {
  /** Send job notification */
  send(job: Job): Promise<boolean>;
}

/**
 * Telegram Bot API configuration
 */
export interface TelegramConfig {
  /** Whether Telegram notifications are enabled */
  enabled: boolean;
  /** Bot API token */
  botToken: string;
  /** Chat ID to send messages to */
  chatId: string;
}

/**
 * Telegram message response
 */
export interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      title: string;
    };
    date: number;
    text: string;
  };
  description?: string;
  error_code?: number;
}
