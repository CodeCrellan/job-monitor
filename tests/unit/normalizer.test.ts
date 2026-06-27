import { describe, it, expect } from 'vitest';
import { normalize, normalizeBatch } from '../../src/pipeline/normalizer';
import type { RawJob } from '../../src/scrapers/types';

function makeRaw(overrides: Partial<RawJob> = {}): RawJob {
  return {
    title: '  Firmware  Engineer  ',
    company: '  NXP  ',
    location: '  Eindhoven  ',
    description: '  Develop  <b>RTOS</b>  drivers  ',
    url: 'https://careers.nxp.com/job/123',
    applyUrl: 'https://careers.nxp.com/apply/123',
    source: 'greenhouse',
    sourceId: '456',
    postedDate: new Date('2026-06-01'),
    ...overrides,
  };
}

describe('normalize', () => {
  it('should generate a UUID as id', () => {
    const job = normalize(makeRaw());
    expect(job.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('should clean whitespace from text fields', () => {
    const job = normalize(makeRaw());
    expect(job.title).toBe('Firmware Engineer');
    expect(job.company).toBe('NXP');
    expect(job.location).toBe('Eindhoven');
    expect(job.description).toBe('Develop <b>RTOS</b> drivers');
  });

  it('should default location to Unknown when missing', () => {
    const job = normalize(makeRaw({ location: undefined }));
    expect(job.location).toBe('Unknown');
  });

  it('should default postedDate to now when missing', () => {
    const before = new Date();
    const job = normalize(makeRaw({ postedDate: undefined }));
    const after = new Date();
    expect(job.postedDate.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 100
    );
    expect(job.postedDate.getTime()).toBeLessThanOrEqual(
      after.getTime() + 100
    );
  });

  it('should preserve passthrough fields', () => {
    const raw = makeRaw();
    const job = normalize(raw);
    expect(job.url).toBe(raw.url);
    expect(job.applyUrl).toBe(raw.applyUrl);
    expect(job.source).toBe(raw.source);
    expect(job.sourceId).toBe(raw.sourceId);
  });

  it('should start with empty keywordsMatched', () => {
    const job = normalize(makeRaw());
    expect(job.keywordsMatched).toEqual([]);
  });

  it('should set createdAt to now', () => {
    const before = new Date();
    const job = normalize(makeRaw());
    const after = new Date();
    expect(job.createdAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 100
    );
    expect(job.createdAt.getTime()).toBeLessThanOrEqual(
      after.getTime() + 100
    );
  });
});

describe('normalizeBatch', () => {
  it('should normalize each job in the array', () => {
    const rawJobs = [makeRaw({ title: 'Job A' }), makeRaw({ title: 'Job B' })];
    const jobs = normalizeBatch(rawJobs);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].title).toBe('Job A');
    expect(jobs[1].title).toBe('Job B');
  });

  it('should return empty array when given empty input', () => {
    expect(normalizeBatch([])).toEqual([]);
  });
});
