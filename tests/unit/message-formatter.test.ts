import { describe, it, expect } from 'vitest';
import {
  formatJobMessage,
  formatBatchMessage,
} from '../../src/notifications/message-formatter';
import type { Job } from '../../src/storage/types';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    title: 'Firmware Engineer',
    company: 'NXP Semiconductors',
    location: 'Eindhoven',
    description: 'RTOS firmware development',
    url: 'https://careers.nxp.com/job/123',
    applyUrl: 'https://careers.nxp.com/apply/123',
    source: 'greenhouse',
    sourceId: '456',
    postedDate: new Date('2026-06-01'),
    createdAt: new Date(),
    keywordsMatched: ['firmware', 'rtos'],
    ...overrides,
  };
}

describe('formatJobMessage', () => {
  it('should include job title, company, and location', () => {
    const msg = formatJobMessage(makeJob());
    expect(msg).toContain('Firmware Engineer');
    expect(msg).toContain('NXP Semiconductors');
    expect(msg).toContain('Eindhoven');
  });

  it('should include apply link', () => {
    const msg = formatJobMessage(makeJob());
    expect(msg).toContain(
      '[Apply Here](https://careers.nxp.com/apply/123)'
    );
  });

  it('should include source and matched keywords', () => {
    const msg = formatJobMessage(makeJob());
    expect(msg).toContain('greenhouse');
    expect(msg).toContain('firmware');
    expect(msg).toContain('rtos');
  });

  it('should include posted date', () => {
    const msg = formatJobMessage(makeJob());
    // The date may differ by timezone; verify it appears in some format
    expect(msg).toMatch(/(May|Jun)\s\d{2},\s2026/);
  });

  it('should escape markdown special characters in title', () => {
    const job = makeJob({ title: 'C++ Embedded Dev (Firmware)' });
    const msg = formatJobMessage(job);
    expect(msg).toContain('C\\+\\+');
    expect(msg).toContain('\\(Firmware\\)');
  });

  it('should escape markdown in company name', () => {
    const job = makeJob({ company: 'NXP (Semiconductors)' });
    const msg = formatJobMessage(job);
    expect(msg).toContain('NXP \\(Semiconductors\\)');
  });

  it('should not show keywords section when empty', () => {
    const job = makeJob({ keywordsMatched: [] });
    const msg = formatJobMessage(job);
    expect(msg).not.toContain('Matched:');
  });
});

describe('formatBatchMessage', () => {
  it('should return "No new jobs" for empty input', () => {
    expect(formatBatchMessage([])).toBe('No new jobs found.');
  });

  it('should return single job message for one job', () => {
    const jobs = [makeJob()];
    const msg = formatBatchMessage(jobs);
    expect(msg).toContain('Firmware Engineer');
    expect(msg).toContain('NXP Semiconductors');
  });

  it('should show count for multiple jobs', () => {
    const jobs = [
      makeJob({ id: '1', title: 'Firmware Engineer' }),
      makeJob({ id: '2', title: 'Embedded Engineer' }),
    ];
    const msg = formatBatchMessage(jobs);
    expect(msg).toContain('2 New Embedded');
  });

  it('should list each job with title and company', () => {
    const jobs = [
      makeJob({ id: '1', title: 'Firmware Engineer', company: 'NXP' }),
      makeJob({ id: '2', title: 'Embedded Engineer', company: 'TI' }),
    ];
    const msg = formatBatchMessage(jobs);
    expect(msg).toContain('Firmware Engineer');
    expect(msg).toContain('NXP');
    expect(msg).toContain('Embedded Engineer');
    expect(msg).toContain('TI');
  });

  it('should truncate at 10 jobs', () => {
    const jobs = Array.from({ length: 15 }, (_, i) =>
      makeJob({ id: String(i), title: `Job ${i}` })
    );
    const msg = formatBatchMessage(jobs);
    expect(msg).toContain('and 5 more');
  });
});
