/**
 * Experience filter
 * Filters jobs by experience level (title seniority + years in description)
 */

import type { Job } from '../storage/types';

/**
 * Seniority keywords in titles that indicate senior-level roles
 */
const SENIORITY_KEYWORDS = [
  'senior',
  'sr\\.',
  ' sr ',
  'lead',
  'principal',
  'staff',
  'head',
  'architect',
  'vp',
  'vice president',
  'director',
  'chief',
  'manager',
];

/**
 * Regex patterns to extract years of experience from job descriptions
 */
const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(of\s+)?experience/i,
  /(\d+)\s*\+\s*years?/i,
  /minimum\s+(\d+)\s*years?/i,
  /at\s+least\s+(\d+)\s*years?/i,
  /(\d+)\s*-\s*(\d+)\s*years?\s*(of\s+)?experience/i,
];

/**
 * Check if a job title contains seniority keywords
 */
function hasSeniorityKeyword(title: string): boolean {
  const lower = title.toLowerCase();
  return SENIORITY_KEYWORDS.some((kw) => {
    if (kw.startsWith('sr\\.')) {
      // Match "sr." as whole word (e.g. "Sr. Engineer" but not "Srping")
      return new RegExp(`\\bsr\\.?\\b`, 'i').test(lower);
    }
    if (kw.startsWith(' ')) {
      // Match with surrounding spaces (e.g. " sr " as a word)
      return lower.includes(kw);
    }
    // Match as whole word
    return new RegExp(`\\b${kw}\\b`, 'i').test(lower);
  });
}

/**
 * Parse years of experience from job description
 * Returns the minimum years required, or undefined if not found
 */
function parseExperienceYears(description: string, title: string): number | undefined {
  const text = `${title} ${description}`;

  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    // Range pattern: "3-5 years"
    if (match[2] && match[1] !== match[2]) {
      return parseInt(match[1], 10); // Use the lower bound
    }

    // Single value
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Check if a job passes the experience filter
 * @returns true if the job should be included
 */
export function matchesExperience(job: Job, maxYears: number): boolean {
  const text = `${job.title} ${job.description}`.toLowerCase();

  // Check for intern/entry-level keywords that always pass
  if (/\b(entry.level|junior|graduate|trainee|internship|recent grad)/i.test(text)) {
    return true;
  }

  // Check title for seniority keywords
  if (hasSeniorityKeyword(job.title)) {
    // Some jobs have "Senior" in title but still low exp requirement
    const years = parseExperienceYears(job.description, job.title);
    if (years !== undefined && years <= maxYears) {
      // Explicit years in description override title seniority
      return true;
    }
    // Check if entry-level or junior is also in the description
    if (/\b(junior|entry\s*level|trainee)\b/i.test(job.description)) {
      return true;
    }
    return false;
  }

  // Check for explicit experience requirements
  const years = parseExperienceYears(job.description, job.title);
  if (years !== undefined && years > maxYears) {
    return false;
  }

  return true;
}
