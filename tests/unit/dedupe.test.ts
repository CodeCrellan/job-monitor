import { describe, it, expect } from 'vitest';
import {
  generateHash,
  areDuplicates,
  deduplicate,
} from '../../src/pipeline/dedupe';
import type { Job } from '../../src/storage/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    title: 'Firmware Engineer',
    company: 'NXP',
    location: 'Eindhoven',
    description: 'RTOS development',
    url: 'https://careers.nxp.com/job/123',
    applyUrl: 'https://careers.nxp.com/apply/123',
    source: 'greenhouse',
    sourceId: '456',
    postedDate: new Date('2026-06-01'),
    createdAt: new Date(),
    keywordsMatched: ['firmware'],
    ...overrides,
  };
}

describe('generateHash', () => {
  it('should produce a 64-character hex string', () => {
    const hash = generateHash(makeJob());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic for the same inputs', () => {
    const a = generateHash(makeJob());
    const b = generateHash(makeJob());
    expect(a).toBe(b);
  });

  it('should change when title changes (case insensitive)', () => {
    const a = generateHash(makeJob({ title: 'Firmware Engineer' }));
    const b = generateHash(makeJob({ title: 'firmware engineer' }));
    expect(a).toBe(b);
  });

  it('should change when title differs', () => {
    const a = generateHash(makeJob({ title: 'Firmware Engineer' }));
    const b = generateHash(makeJob({ title: 'Embedded Engineer' }));
    expect(a).not.toBe(b);
  });

  it('should change when company differs', () => {
    const a = generateHash(makeJob({ company: 'NXP' }));
    const b = generateHash(makeJob({ company: 'TI' }));
    expect(a).not.toBe(b);
  });

  it('should change when applyUrl differs', () => {
    const a = generateHash(makeJob({ applyUrl: 'https://a.com/1' }));
    const b = generateHash(makeJob({ applyUrl: 'https://a.com/2' }));
    expect(a).not.toBe(b);
  });
});

describe('areDuplicates', () => {
  it('should return true for identical jobs', () => {
    const a = makeJob();
    const b = makeJob();
    expect(areDuplicates(a, b)).toBe(true);
  });

  it('should return false for jobs with different titles', () => {
    const a = makeJob({ title: 'Firmware Engineer' });
    const b = makeJob({ title: 'Embedded Engineer' });
    expect(areDuplicates(a, b)).toBe(false);
  });
});

describe('deduplicate', () => {
  it('should remove duplicates keeping the first occurrence', () => {
    const a = makeJob({ id: '1', title: 'Firmware Engineer' });
    const b = makeJob({ id: '2', title: 'Firmware Engineer' }); // same title/company/applyUrl
    const c = makeJob({ id: '3', title: 'Embedded Engineer' });

    const result = deduplicate([a, b, c]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('should return all unique jobs unchanged', () => {
    const a = makeJob({ id: '1', title: 'Firmware Engineer' });
    const b = makeJob({ id: '2', title: 'Embedded Engineer' });
    const c = makeJob({ id: '3', title: 'RTOS Developer' });

    expect(deduplicate([a, b, c])).toHaveLength(3);
  });

  it('should return empty array for empty input', () => {
    expect(deduplicate([])).toEqual([]);
  });
});
