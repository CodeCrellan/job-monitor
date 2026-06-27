import { describe, it, expect } from 'vitest';
import { matchesLocation } from '../../src/pipeline/location-filter';
import type { Job } from '../../src/storage/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    title: 'Firmware Engineer',
    company: 'NXP',
    location: 'Eindhoven, Netherlands',
    description: 'Develop RTOS firmware for microcontrollers. On-site position.',
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

const defaultConfig = {
  userCountry: 'MX',
  allowRemote: true,
  allowVisaSponsorship: true,
};

describe('matchesLocation', () => {
  describe('remote jobs', () => {
    it('should accept Remote location', () => {
      const job = makeJob({ location: 'Remote' });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should accept Anywhere location', () => {
      const job = makeJob({ location: 'Anywhere' });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should accept work from home in description', () => {
      const job = makeJob({
        location: 'San Francisco',
        description: 'Work from home, flexible hours.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });
  });

  describe('Mexico locations', () => {
    it('should accept Guadalajara, Mexico', () => {
      const job = makeJob({ location: 'Guadalajara, Mexico' });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should accept CDMX', () => {
      const job = makeJob({ location: 'CDMX' });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should accept Monterrey, MX', () => {
      const job = makeJob({ location: 'Monterrey, MX' });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should accept Mexico in description', () => {
      const job = makeJob({
        location: 'Remote',
        description: 'Must be based in Mexico.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });
  });

  describe('visa sponsorship', () => {
    it('should accept jobs mentioning visa sponsorship', () => {
      const job = makeJob({
        location: 'San Francisco',
        description: 'Visa sponsorship available for qualified candidates.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should accept jobs with relocation assistance', () => {
      const job = makeJob({
        location: 'Munich, Germany',
        description: 'Relocation assistance available for international candidates.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });

    it('should reject jobs saying "no relocation"', () => {
      const job = makeJob({
        location: 'San Jose, CA',
        description: 'Local candidates only. No relocation.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(false);
    });

    it('should accept H1B mention', () => {
      const job = makeJob({
        location: 'Austin, TX',
        description: 'H1B transfer supported.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(true);
    });
  });

  describe('rejected locations', () => {
    it('should reject US on-site without visa', () => {
      const job = makeJob({
        location: 'San Jose, CA',
        description: 'Local candidates only. No relocation.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(false);
    });

    it('should reject Europe on-site without visa', () => {
      const job = makeJob({
        location: 'Berlin, Germany',
        description: 'Must be based in Germany. German language required.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(false);
    });

    it('should reject on-site US without visa', () => {
      const job = makeJob({
        location: 'San Jose, CA',
        description: 'Local candidates only. No relocation.',
      });
      expect(matchesLocation(job, defaultConfig)).toBe(false);
    });
  });

  describe('config toggles', () => {
    it('should reject remote when allowRemote is false', () => {
      const job = makeJob({ location: 'Remote' });
      expect(
        matchesLocation(job, { ...defaultConfig, allowRemote: false })
      ).toBe(false);
    });

    it('should reject visa jobs when allowVisaSponsorship is false', () => {
      const job = makeJob({
        location: 'New York',
        description: 'Visa sponsorship available.',
      });
      expect(
        matchesLocation(job, { ...defaultConfig, allowVisaSponsorship: false })
      ).toBe(false);
    });
  });
});
