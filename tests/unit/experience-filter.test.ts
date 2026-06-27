import { describe, it, expect } from 'vitest';
import { matchesExperience } from '../../src/pipeline/experience-filter';
import type { Job } from '../../src/storage/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    title: 'Firmware Engineer',
    company: 'NXP',
    location: 'Eindhoven',
    description: 'Develop RTOS firmware for microcontrollers.',
    url: 'https://example.com/job',
    applyUrl: 'https://example.com/apply',
    source: 'greenhouse',
    sourceId: 'ext-1',
    postedDate: new Date(),
    createdAt: new Date(),
    keywordsMatched: ['firmware'],
    ...overrides,
  };
}

describe('matchesExperience', () => {
  const maxYears = 3;

  describe('title seniority', () => {
    it('should reject Senior in title', () => {
      const job = makeJob({ title: 'Senior Firmware Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should reject Sr. in title', () => {
      const job = makeJob({ title: 'Sr. Firmware Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should reject Lead in title', () => {
      const job = makeJob({ title: 'Lead Embedded Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should reject Principal in title', () => {
      const job = makeJob({ title: 'Principal Software Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should reject Staff in title', () => {
      const job = makeJob({ title: 'Staff Firmware Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should reject Manager in title', () => {
      const job = makeJob({ title: 'Engineering Manager' });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should pass junior/entry-level titles', () => {
      const job = makeJob({ title: 'Junior Firmware Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(true);
    });

    it('should pass titles without seniority keywords', () => {
      const job = makeJob({ title: 'Firmware Engineer' });
      expect(matchesExperience(job, maxYears)).toBe(true);
    });
  });

  describe('experience years in description', () => {
    it('should reject 5+ years', () => {
      const job = makeJob({
        title: 'Firmware Engineer',
        description: 'Requires 5+ years of experience in embedded systems.',
      });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should reject minimum 5 years', () => {
      const job = makeJob({
        title: 'Firmware Engineer',
        description: 'Minimum 5 years of experience with RTOS.',
      });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should accept 2+ years', () => {
      const job = makeJob({
        title: 'Firmware Engineer',
        description: 'Looking for 2+ years of experience.',
      });
      expect(matchesExperience(job, maxYears)).toBe(true);
    });

    it('should accept 1-3 years range', () => {
      const job = makeJob({
        title: 'Firmware Engineer',
        description: '1-3 years of experience in embedded C.',
      });
      expect(matchesExperience(job, maxYears)).toBe(true);
    });

    it('should reject 5-7 years range', () => {
      const job = makeJob({
        title: 'Firmware Engineer',
        description: '5-7 years of experience required.',
      });
      expect(matchesExperience(job, maxYears)).toBe(false);
    });

    it('should accept no experience requirement', () => {
      const job = makeJob({
        title: 'Firmware Engineer',
        description: 'We are looking for a talented engineer.',
      });
      expect(matchesExperience(job, maxYears)).toBe(true);
    });

    it('should treat Senior title with low years as valid', () => {
      const job = makeJob({
        title: 'Senior Firmware Engineer',
        description: '1-2 years of experience required.',
      });
      expect(matchesExperience(job, maxYears)).toBe(true);
    });
  });
});
