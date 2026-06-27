/**
 * Location filter
 * Filters jobs by location: user's country, remote, or visa sponsorship
 */

import type { Job } from '../storage/types';

/**
 * Regex patterns that indicate remote-friendly positions
 */
const REMOTE_PATTERNS = [
  /\bremote\b/i,
  /\banywhere\b/i,
  /\bwork from home\b/i,
  /\bwf[hH]\b/i,
  /\bvirtual\b/i,
  /\btelecommute\b/i,
  /\bonline\b/i,
  /\b100%\s*remote\b/i,
  /\bfully\s*remote\b/i,
  /\bworld.?wide\b/i,
];

/**
 * Regex patterns that indicate visa sponsorship or relocation
 */
const VISA_PATTERNS = [
  /\bvisa\s*sponsor/i,
  /\bsponsorship\b/i,
  /\bh1b\b/i,
  /\bh1\s*b\b/i,
  /\bwork\s*permit\b/i,
  /\brelocation\s*(assistance|package|support|offered|provided|available|included|help|bonus|reimburs)/i,
  /\b(offer|provide|support|assist|cover)\s+relocation\b/i,
  /\bwork\s*from\s*anywhere\b/i,
  /\bopen\s*to\s*anywhere\b/i,
];

/**
 * Common Mexican location patterns
 */
const MEXICO_PATTERNS = [
  /\bmexico\b/i,
  /\bcdmx\b/i,
  /\bciudad\s*de\s*mexico\b/i,
  /\bguadalajara\b/i,
  /\bmonterrey\b/i,
  /\bpuebla\b/i,
  /\bqueretaro\b/i,
  /\btijuana\b/i,
  /\bjuarez\b/i,
  /\bleon\b/i,
  /\bmexicali\b/i,
  /\bmerida\b/i,
  /\bchihuahua\b/i,
  /\bsaltillo\b/i,
  /\bhermosillo\b/i,
  /\bsan\s*luis\s*potosi\b/i,
  /\bmorelia\b/i,
  /\bcancun\b/i,
  /\btoluca\b/i,
  /\b\[mx\]\b/i,
  /\b\(mx\)\b/i,
  /,\s*mx\b/i,
];

/**
 * Check if a job passes the location filter
 * @returns true if the job should be included
 */
export function matchesLocation(
  job: Job,
  config: {
    userCountry: string;
    allowRemote: boolean;
    allowVisaSponsorship: boolean;
  }
): boolean {
  const text = `${job.location} ${job.title} ${job.description}`;

  // 1. Check if job is in user's country (exact location match)
  const countryPattern = new RegExp(`\\b${config.userCountry}\\b`, 'i');
  if (countryPattern.test(text)) {
    return true;
  }

  // Check for known cities in the user's country
  if (config.userCountry === 'MX' && MEXICO_PATTERNS.some((p) => p.test(text))) {
    return true;
  }

  // 2. Check if remote is allowed
  if (config.allowRemote) {
    if (REMOTE_PATTERNS.some((p) => p.test(job.location))) {
      return true;
    }
    if (REMOTE_PATTERNS.some((p) => p.test(`${job.title} ${job.description}`))) {
      return true;
    }
  }

  // 3. Check for visa sponsorship or relocation
  if (config.allowVisaSponsorship) {
    if (VISA_PATTERNS.some((p) => p.test(text))) {
      return true;
    }
  }

  return false;
}
