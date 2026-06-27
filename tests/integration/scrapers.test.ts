import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GreenhouseFetcher } from '../../src/scrapers/greenhouse';
import { LeverFetcher } from '../../src/scrapers/lever';
import { AshbyFetcher } from '../../src/scrapers/ashby';
import { RemoteOKFetcher } from '../../src/scrapers/remoteok';
import { WWRFetcher } from '../../src/scrapers/wwr';
import { JobicyFetcher } from '../../src/scrapers/jobicy';
import { createScrapers, getScrapersByType } from '../../src/scrapers';
import { SourceError } from '../../src/scrapers/types';
import type { CompanyConfig } from '../../src/config/types';

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(response: unknown, status = 200): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(response), {
      status,
      statusText: status === 200 ? 'OK' : 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function mockFetchText(body: string, status = 200): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body, {
      status,
      statusText: status === 200 ? 'OK' : 'Not Found',
    })
  );
}

describe('GreenhouseFetcher', () => {
  const fetcher = new GreenhouseFetcher('nxp');

  it('should fetch and normalize jobs', async () => {
    mockFetch({
      jobs: [
        {
          id: 123,
          title: 'Firmware Engineer',
          location: { name: 'Eindhoven' },
          content: '<p>RTOS <b>development</b></p>',
          absolute_url: 'https://boards.greenhouse.io/nxp/jobs/123',
          updated_at: '2026-06-01T10:00:00Z',
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Firmware Engineer',
      company: 'nxp',
      location: 'Eindhoven',
      description: 'RTOS development',
      url: 'https://boards.greenhouse.io/nxp/jobs/123',
      applyUrl: 'https://boards.greenhouse.io/nxp/jobs/123',
      source: 'greenhouse',
      sourceId: '123',
    });
    expect(jobs[0].postedDate).toBeInstanceOf(Date);
  });

  it('should strip HTML from description', async () => {
    mockFetch({
      jobs: [
        {
          id: 1,
          title: 'Test',
          location: null,
          content: '<h1>Title</h1><p>Para with <b>bold</b> and <a href="#">link</a></p>',
          absolute_url: 'https://boards.greenhouse.io/nxp/jobs/1',
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs[0].description).toContain('Title');
    expect(jobs[0].description).toContain('bold');
    expect(jobs[0].description).not.toContain('<h1>');
    expect(jobs[0].description).not.toContain('</a>');
  });

  it('should throw SourceError on HTTP error', async () => {
    mockFetch({ error: 'Not found' }, 404);

    await expect(fetcher.fetch()).rejects.toThrow(SourceError);
  });
});

describe('LeverFetcher', () => {
  const fetcher = new LeverFetcher('espressif');

  it('should fetch and normalize jobs', async () => {
    mockFetch([
      {
        id: 'abc-123',
        text: 'Embedded Software Engineer',
        categories: {
          team: 'Firmware',
          department: 'Engineering',
          location: 'Austin, TX',
          commitment: 'Full-time',
        },
        descriptionPlain: 'Develop ESP32 firmware.',
        hostedUrl: 'https://careers.lever.co/espressif/abc-123',
        applyUrl: 'https://careers.lever.co/espressif/abc-123/apply',
        createdAt: 1717200000000,
        updatedAt: 1717286400000,
      },
    ]);

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Embedded Software Engineer',
      company: 'espressif',
      location: 'Austin, TX',
      description: 'Develop ESP32 firmware.',
      source: 'lever',
      sourceId: 'abc-123',
    });
  });

  it('should handle missing optional fields', async () => {
    mockFetch([
      {
        id: 'min-1',
        text: 'Minimal Job',
        categories: null,
        descriptionPlain: null,
        hostedUrl: 'https://careers.lever.co/test/min-1',
        applyUrl: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);

    const jobs = await fetcher.fetch();
    expect(jobs[0].location).toBeUndefined();
    expect(jobs[0].description).toBe('');
    expect(jobs[0].applyUrl).toBe(jobs[0].url);
    expect(jobs[0].postedDate).toBeUndefined();
  });

  it('should throw SourceError on HTTP error', async () => {
    mockFetch({ error: 'Server error' }, 500);

    await expect(fetcher.fetch()).rejects.toThrow(SourceError);
  });
});

describe('AshbyFetcher', () => {
  const fetcher = new AshbyFetcher('anthropic');

  it('should fetch and normalize listed jobs', async () => {
    mockFetch({
      jobs: [
        {
          id: 'job-1',
          title: 'Embedded Systems Engineer',
          location: 'San Francisco, CA',
          descriptionHtml: '<p>Bare metal programming</p>',
          jobUrl: 'https://jobs.ashbyhq.com/anthropic/job-1',
          applyUrl: 'https://jobs.ashbyhq.com/anthropic/job-1/apply',
          isListed: true,
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Embedded Systems Engineer',
      location: 'San Francisco, CA',
      source: 'ashby',
      sourceId: 'job-1',
    });
  });

  it('should filter out unlisted jobs', async () => {
    mockFetch({
      jobs: [
        {
          id: 'listed-1',
          title: 'Listed Job',
          location: null,
          descriptionHtml: '',
          jobUrl: 'https://jobs.ashbyhq.com/test/listed-1',
          applyUrl: null,
          isListed: true,
        },
        {
          id: 'unlisted-1',
          title: 'Internal Position',
          location: null,
          descriptionHtml: '',
          jobUrl: 'https://jobs.ashbyhq.com/test/unlisted-1',
          applyUrl: null,
          isListed: false,
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].sourceId).toBe('listed-1');
  });

  it('should strip HTML from description', async () => {
    mockFetch({
      jobs: [
        {
          id: '1',
          title: 'Test',
          location: null,
          descriptionHtml: '<ul><li>RTOS</li><li>Firmware</li></ul>',
          jobUrl: 'https://jobs.ashbyhq.com/test/1',
          applyUrl: null,
          isListed: true,
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs[0].description).toContain('RTOS');
    expect(jobs[0].description).not.toContain('<ul>');
  });
});

describe('RemoteOKFetcher', () => {
  const fetcher = new RemoteOKFetcher();

  it('should fetch and normalize jobs, skipping metadata element', async () => {
    mockFetch([
      { _meta: true, total: 1 }, // metadata element
      {
        id: 'job-42',
        position: 'Firmware Engineer',
        company: 'ESP32 Labs',
        location: 'Remote',
        description: 'Zephyr RTOS development',
        url: 'https://remoteok.com/remote-jobs/job-42',
        created_at: 1717200000,
        tags: ['embedded', 'firmware'],
      },
    ]);

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Firmware Engineer',
      company: 'ESP32 Labs',
      location: 'Remote',
      source: 'remoteok',
      sourceId: 'job-42',
    });
    expect(jobs[0].postedDate).toBeInstanceOf(Date);
  });

  it('should filter out metadata-only entries', async () => {
    mockFetch([{ _meta: true, total: 0 }]);

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(0);
  });
});

describe('WWRFetcher', () => {
  const fetcher = new WWRFetcher();

  const sampleRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>We Work Remotely</title>
    <item>
      <title>NXP Semiconductors - Firmware Engineer</title>
      <link>https://weworkremotely.com/remote-jobs/nxp-firmware</link>
      <description>Embedded firmware development for ARM Cortex-M</description>
      <pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate>
      <category>Embedded</category>
    </item>
    <item>
      <title>Embedded Linux Developer</title>
      <link>https://weworkremotely.com/remote-jobs/embedded-linux</link>
      <description>Yocto and Buildroot expertise</description>
      <pubDate>Tue, 02 Jun 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

  it('should parse RSS and normalize jobs', async () => {
    mockFetchText(sampleRss);

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      title: 'Firmware Engineer',
      company: 'NXP Semiconductors',
      location: 'Remote',
      source: 'wwr',
      url: 'https://weworkremotely.com/remote-jobs/nxp-firmware',
    });
    expect(jobs[0].postedDate).toBeInstanceOf(Date);
  });

  it('should handle titles without company prefix', async () => {
    const rss = `<?xml version="1.0"?>
<rss version="2.0"><channel><item>
  <title>Embedded Linux Developer</title>
  <link>https://weworkremotely.com/remote-jobs/embedded-linux</link>
  <description>Linux kernel work</description>
</item></channel></rss>`;

    mockFetchText(rss);
    const jobs = await fetcher.fetch();
    expect(jobs[0].title).toBe('Embedded Linux Developer');
    expect(jobs[0].company).toBe('Unknown');
  });

  it('should return empty array for empty RSS', async () => {
    const emptyRss = `<?xml version="1.0"?>
<rss version="2.0"><channel></channel></rss>`;

    mockFetchText(emptyRss);
    const jobs = await fetcher.fetch();
    expect(jobs).toEqual([]);
  });

  it('should throw SourceError on HTTP error', async () => {
    mockFetchText('Not found', 404);
    await expect(fetcher.fetch()).rejects.toThrow(SourceError);
  });
});

describe('JobicyFetcher', () => {
  const fetcher = new JobicyFetcher();

  it('should fetch and normalize jobs', async () => {
    mockFetch({
      jobs: [
        {
          id: 99,
          job_title: 'Embedded Software Engineer',
          company_name: 'STM',
          job_location: 'Geneva, Switzerland',
          job_description: 'STM32 firmware development.',
          url: 'https://jobicy.com/jobs/99',
          job_type: 'full-time',
          job_level: 'mid-senior',
          annual_salary_min: 80000,
          annual_salary_max: 120000,
          job_publisher: 'STM Careers',
          publication_date: '2026-06-01',
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      title: 'Embedded Software Engineer',
      company: 'STM',
      location: 'Geneva, Switzerland',
      source: 'jobicy',
      sourceId: '99',
    });
    expect(jobs[0].postedDate).toBeInstanceOf(Date);
  });

  it('should handle missing location', async () => {
    mockFetch({
      jobs: [
        {
          id: 1,
          job_title: 'Remote Engineer',
          company_name: 'Some Corp',
          job_location: '',
          job_description: 'Remote work',
          url: '',
          job_type: 'full-time',
          job_level: 'senior',
          annual_salary_min: 0,
          annual_salary_max: 0,
          job_publisher: '',
          publication_date: null,
        },
      ],
    });

    const jobs = await fetcher.fetch();
    expect(jobs[0].location).toBe('Remote');
    expect(jobs[0].postedDate).toBeUndefined();
  });
});

describe('createScrapers', () => {
  const companies: CompanyConfig = {
    greenhouse: [{ name: 'NXP', token: 'nxp' }],
    lever: [{ name: 'Espressif', token: 'espressif' }],
    ashby: [{ name: 'Anthropic', token: 'anthropic' }],
  };

  it('should create scrapers from company config', () => {
    const scrapers = createScrapers(companies);
    expect(scrapers).toHaveLength(6); // 3 ATS + 3 RSS
    expect(scrapers.map((s) => s.name)).toEqual([
      'greenhouse',
      'lever',
      'ashby',
      'remoteok',
      'wwr',
      'jobicy',
    ]);
  });
});

describe('getScrapersByType', () => {
  it('should filter ATS scrapers', () => {
    const scrapers = [
      new GreenhouseFetcher('nxp'),
      new RemoteOKFetcher(),
      new LeverFetcher('espressif'),
      new WWRFetcher(),
    ];
    const ats = getScrapersByType(scrapers, 'ats');
    expect(ats.map((s) => s.name)).toEqual(['greenhouse', 'lever']);
  });

  it('should filter RSS scrapers', () => {
    const scrapers = [
      new GreenhouseFetcher('nxp'),
      new RemoteOKFetcher(),
      new LeverFetcher('espressif'),
      new WWRFetcher(),
    ];
    const rss = getScrapersByType(scrapers, 'rss');
    expect(rss.map((s) => s.name)).toEqual(['remoteok', 'wwr']);
  });
});
