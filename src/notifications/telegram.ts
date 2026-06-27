/**
 * Telegram Bot API notification service
 * Sends job notifications via Telegram
 */

import type { Job } from '../storage/types';
import type { INotificationService } from './types';
import type { TelegramConfig, TelegramResponse } from './types';
import { formatJobMessage } from './message-formatter';

/**
 * Telegram notification service
 */
export class TelegramNotifier implements INotificationService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Send a job notification via Telegram
   */
  async send(job: Job): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const message = formatJobMessage(job);
    return this.sendMessage(message);
  }

  /**
   * Send a raw text message (e.g., batch separator header)
   */
  async sendRaw(message: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }
    return this.sendMessage(message);
  }

  /**
   * Send a message to Telegram
   */
  private async sendMessage(text: string): Promise<boolean> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        console.error(`Telegram API error: ${response.status}`);
        return false;
      }

      const data = await response.json() as TelegramResponse;
      
      if (!data.ok) {
        console.error(`Telegram send failed: ${data.description}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  }
}

/**
 * Create a new Telegram notifier
 */
export function createTelegramNotifier(config: TelegramConfig): INotificationService {
  return new TelegramNotifier(config);
}
