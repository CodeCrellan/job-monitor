/**
 * Message formatter for Telegram notifications
 * Formats job data into readable messages
 */

import type { Job } from '../storage/types';

/**
 * Format a job into a Telegram message
 */
export function formatJobMessage(job: Job): string {
  const lines: string[] = [];

  // Header
  lines.push('🔔 *New Embedded Software Job Found!*');
  lines.push('');

  // Job details
  lines.push(`📌 *${escapeMarkdown(job.title)}*`);
  lines.push(`🏢 ${escapeMarkdown(job.company)}`);
  lines.push(`📍 ${escapeMarkdown(job.location)}`);
  lines.push('');

  // Apply link
  lines.push(`🔗 [Apply Here](${job.applyUrl})`);
  lines.push('');

  // Metadata
  lines.push(`📡 Source: ${job.source}`);
  
  if (job.keywordsMatched.length > 0) {
    lines.push(`🏷️ Matched: ${job.keywordsMatched.join(', ')}`);
  }

  if (job.postedDate) {
    lines.push(`📅 Posted: ${formatDate(job.postedDate)}`);
  }

  return lines.join('\n');
}

/**
 * Escape Markdown special characters for Telegram
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format multiple jobs into a single message (for batch notifications)
 */
export function formatBatchMessage(jobs: Job[]): string {
  if (jobs.length === 0) {
    return 'No new jobs found.';
  }

  if (jobs.length === 1) {
    return formatJobMessage(jobs[0]);
  }

  const lines: string[] = [];
  lines.push(`🔔 *${jobs.length} New Embedded Software Jobs Found!*`);
  lines.push('');

  for (const job of jobs.slice(0, 10)) {
    lines.push(`• *${escapeMarkdown(job.title)}* @ ${escapeMarkdown(job.company)}`);
  }

  if (jobs.length > 10) {
    lines.push(`\\.\.\. and ${jobs.length - 10} more`);
  }

  return lines.join('\n');
}
