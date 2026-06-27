import { describe, it, expect } from 'vitest';
import {
  matchesKeywords,
  findMatchedKeywords,
  filterByKeywords,
} from '../../src/pipeline/filter';
import type { Job } from '../../src/storage/types';
import type { KeywordFilter } from '../../src/pipeline/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    title: 'Senior Firmware Engineer',
    company: 'NXP',
    location: 'Eindhoven',
    description:
      'Developing RTOS-based firmware for automotive microcontrollers. Bare metal programming in C.',
    url: 'https://careers.nxp.com/job/123',
    applyUrl: 'https://careers.nxp.com/apply/123',
    source: 'greenhouse',
    sourceId: '456',
    postedDate: new Date('2026-06-01'),
    createdAt: new Date(),
    keywordsMatched: [],
    ...overrides,
  };
}

const defaultConfig: KeywordFilter = {
  required: ['embedded', 'firmware', 'rtos', 'bare metal', 'microcontroller'],
  bonus: ['arm', 'cortex-m', 'stm32', 'esp32', 'zephyr', 'freertos'],
  excluded: ['sales', 'marketing', 'manager', 'intern', 'co-op'],
};

describe('matchesKeywords', () => {
  it('should return true when job matches a required keyword', () => {
    expect(matchesKeywords(makeJob(), defaultConfig)).toBe(true);
  });

  it('should return false when no required keyword matches', () => {
    const job = makeJob({
      title: 'Frontend Developer',
      description: 'React and TypeScript development',
    });
    expect(matchesKeywords(job, defaultConfig)).toBe(false);
  });

  it('should return false when an excluded keyword matches', () => {
    const job = makeJob({
      title: 'Firmware Engineering Manager',
      description: 'Managing RTOS firmware engineering team',
    });
    expect(matchesKeywords(job, defaultConfig)).toBe(false);
  });

  it('should return false when both required and excluded match', () => {
    const job = makeJob({
      title: 'Firmware Engineering Intern',
      description: 'RTOS development intern position',
    });
    expect(matchesKeywords(job, defaultConfig)).toBe(false);
  });

  it('should match keywords in title', () => {
    const job = makeJob({
      title: 'Embedded Firmware Engineer',
      description: 'General linux development',
    });
    expect(matchesKeywords(job, defaultConfig)).toBe(true);
  });

  it('should match keywords in description', () => {
    const job = makeJob({
      title: 'Software Engineer',
      description: 'Working on microcontroller firmware',
    });
    expect(matchesKeywords(job, defaultConfig)).toBe(true);
  });

  it('should be case insensitive', () => {
    const job = makeJob({
      title: 'Software Engineer',
      description: 'FIRMWARE and RTOS development',
    });
    expect(matchesKeywords(job, defaultConfig)).toBe(true);
  });
});

describe('findMatchedKeywords', () => {
  it('should return required keywords that matched', () => {
    const matched = findMatchedKeywords(makeJob(), defaultConfig);
    expect(matched).toContain('firmware');
    expect(matched).toContain('rtos');
    expect(matched).toContain('bare metal');
  });

  it('should return bonus keywords when they match', () => {
    const job = makeJob({
      description:
        'ARM Cortex-M development with FreeRTOS on STM32 microcontrollers',
    });
    const matched = findMatchedKeywords(job, defaultConfig);
    expect(matched).toContain('arm');
    expect(matched).toContain('freertos');
  });

  it('should return empty array when nothing matches', () => {
    const job = makeJob({
      title: 'Frontend Developer',
      description: 'React development',
    });
    expect(findMatchedKeywords(job, defaultConfig)).toEqual([]);
  });

  it('should deduplicate matched keywords', () => {
    const job = makeJob({
      title: 'Firmware Engineer',
      description: 'firmware development for bare metal systems',
    });
    const matched = findMatchedKeywords(job, defaultConfig);
    const firmwareCount = matched.filter((k) => k === 'firmware').length;
    expect(firmwareCount).toBe(1);
  });
});

describe('filterByKeywords', () => {
  it('should return only matching jobs', () => {
    const matching = makeJob({ id: '1' });
    const nonMatching = makeJob({
      id: '2',
      title: 'Sales Engineer',
      description: 'Sales position',
    });
    const result = filterByKeywords([matching, nonMatching], defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should return empty array when nothing matches', () => {
    const job = makeJob({
      title: 'Marketing Specialist',
      description: 'Marketing role',
    });
    expect(filterByKeywords([job], defaultConfig)).toEqual([]);
  });

  it('should return all when everything matches', () => {
    const a = makeJob({ id: '1' });
    const b = makeJob({ id: '2', title: 'Embedded Software Engineer' });
    expect(filterByKeywords([a, b], defaultConfig)).toHaveLength(2);
  });
});
