import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest';
import { createDatabase, DatabaseManager } from '../../src/storage/database';
import { createRepository } from '../../src/storage/repository';
import { createScrapers } from '../../src/scrapers';
import { Pipeline } from '../../src/pipeline';
import { createTelegramNotifier } from '../../src/notifications/telegram';
import type { Job, IJobRepository } from '../../src/storage/types';
import type { ISourceFetcher, RawJob } from '../../src/scrapers/types';
import type { KeywordFilter } from '../../src/pipeline/types';
import type { CompanyConfig } from '../../src/config/types';
import type { TelegramConfig } from '../../src/notifications/types';

// ── Sample Data ──────────────────────────────────────────────

const greenhouseResponse = {
  jobs: [
    {
      id: 101,
      title: 'Senior Firmware Engineer',
      location: { name: 'Eindhoven, Netherlands' },
      content: '<p>Develop RTOS-based firmware for <b>ARM Cortex-M</b> microcontrollers.</p>',
      absolute_url: 'https://boards.greenhouse.io/nxp/jobs/101',
      updated_at: '2026-06-01T10:00:00Z',
    },
    {
      id: 102,
      title: 'Embedded Linux Engineer',
      location: { name: 'Remote' },
      content: '<p>Yocto and Buildroot BSP development.</p>',
      absolute_url: 'https://boards.greenhouse.io/nxp/jobs/102',
      updated_at: '2026-06-01T12:00:00Z',
    },
    {
      id: 103,
      title: 'Sales Manager - Embedded Division',
      location: { name: 'Austin, TX' },
      content: '<p>Manage sales team for embedded solutions.</p>',
      absolute_url: 'https://boards.greenhouse.io/nxp/jobs/103',
      updated_at: '2026-06-01T08:00:00Z',
    },
  ],
};

const leverResponse = [
  {
    id: 'lev-201',
    text: 'Firmware Test Engineer',
    categories: { team: 'QA', department: 'Engineering', location: 'Austin, TX' },
    descriptionPlain: 'Testing firmware for ESP32 microcontrollers.',
    hostedUrl: 'https://careers.lever.co/espressif/lev-201',
    applyUrl: 'https://careers.lever.co/espressif/lev-201/apply',
    createdAt: 1717200000000,
    updatedAt: 1717286400000,
  },
];

const ashbyResponse = {
  jobs: [
    {
      id: 'ash-301',
      title: 'Bare Metal Engineer',
      location: 'San Francisco, CA',
      descriptionHtml: '<p>Low-level microcontroller programming.</p>',
      jobUrl: 'https://jobs.ashbyhq.com/anthropic/ash-301',
      applyUrl: 'https://jobs.ashbyhq.com/anthropic/ash-301/apply',
      isListed: true,
    },
    {
      id: 'ash-302',
      title: 'Internal Tools Developer',
      location: null,
      descriptionHtml: '',
      jobUrl: 'https://jobs.ashbyhq.com/anthropic/ash-302',
      applyUrl: null,
      isListed: false,
    },
  ],
};

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>We Work Remotely</title>
    <item>
      <title>TI - Embedded Engineer</title>
      <link>https://weworkremotely.com/remote-jobs/ti-embedded</link>
      <description>ARM Cortex-R4 firmware development</description>
      <pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate>
      <category>Embedded</category>
    </item>
    <item>
      <title>Junior Marketing Coordinator</title>
      <link>https://weworkremotely.com/remote-jobs/marketing</link>
      <description>Manage social media campaigns</description>
      <pubDate>Mon, 01 Jun 2026 14:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const remoteOkResponse = [
  { _meta: true, total: 1 },
  {
    id: 'rok-401',
    position: 'RTOS Developer',
    company: 'FreeRTOS Inc',
    location: 'Remote',
    description: 'Real-time kernel development',
    url: 'https://remoteok.com/remote-jobs/rok-401',
    created_at: 1717200000,
    tags: ['rtos'],
  },
];

const jobicyResponse = {
  jobs: [
    {
      id: 501,
      job_title: 'MCU Software Engineer',
      company_name: 'STM',
      job_location: 'Geneva',
      job_description: 'STM32 microcontroller firmware.',
      url: 'https://jobicy.com/jobs/501',
      job_type: 'full-time',
      job_level: 'senior',
      annual_salary_min: 90000,
      annual_salary_max: 130000,
      job_publisher: 'STM Careers',
      publication_date: '2026-06-01',
    },
  ],
};

// ── Mock fetch helper ────────────────────────────────────────

function mockGlobalFetch(): void {
  const fetchMap: Record<string, unknown> = {
    'boards-api.greenhouse.io': greenhouseResponse,
    'api.lever.co': leverResponse,
    'api.ashbyhq.com': ashbyResponse,
    'remoteok.com': remoteOkResponse,
    'weworkremotely.com': rssXml,
    'jobicy.com': jobicyResponse,
  };

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    for (const [host, data] of Object.entries(fetchMap)) {
      if (urlStr.includes(host)) {
        if (host === 'weworkremotely.com') {
          return new Response(data as string, {
            status: 200,
            headers: { 'Content-Type': 'application/xml' },
          });
        }
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('{}', { status: 404 });
  });
}

// ── Test Config ──────────────────────────────────────────────

const companies: CompanyConfig = {
  greenhouse: [{ name: 'NXP Semiconductors', token: 'nxp' }],
  lever: [{ name: 'Espressif Systems', token: 'espressif' }],
  ashby: [{ name: 'Anthropic', token: 'anthropic' }],
};

const keywords: KeywordFilter = {
  required: ['embedded', 'firmware', 'rtos', 'bare metal', 'microcontroller', 'mcu', 'bsp'],
  bonus: ['arm', 'cortex-m', 'stm32', 'esp32', 'zephyr', 'freertos', 'yocto'],
  excluded: ['sales', 'marketing', 'manager', 'intern', 'co-op'],
};

const telegramConfig: TelegramConfig = {
  enabled: true,
  botToken: 'test:fake',
  chatId: '12345',
};

// ── Tests ────────────────────────────────────────────────────

describe('Full E2E Cycle', () => {
  let db: DatabaseManager;
  let repository: IJobRepository;
  let scrapers: ISourceFetcher[];
  let pipeline: Pipeline;
  let notificationResults: Job[];

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockGlobalFetch();

    // Track notification attempts
    notificationResults = [];

    // 1. Database (in-memory)
    db = createDatabase(':memory:');
    repository = createRepository(db);

    // 2. Scrapers from config
    scrapers = createScrapers(companies);

    // 3. Pipeline
    pipeline = new Pipeline(repository, keywords);

    // Verify scrapers are created
    expect(scrapers).toHaveLength(6);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should process all scrapers through the full pipeline', async () => {
    // Process each scraper
    for (const scraper of scrapers) {
      const rawJobs = await scraper.fetch();
      const newJobs = await pipeline.process(rawJobs);
      notificationResults.push(...newJobs);
    }

    // ── Assertions ──

    // Verifies jobs that are stored in DB
    const storedJobs = await repository.getRecentJobs(50);

    // We expect:
    // Greenhouse: 2 matching (Firmware Engineer, Embedded Linux) out of 3 (Sales Manager excluded)
    // Lever: 1 matching (Firmware Test Engineer)
    // Ashby: 1 matching (Bare Metal Engineer) out of 2 (Internal Tools unlisted)
    // RemoteOK: 1 matching (RTOS Developer)
    // WWR: 1 matching (Embedded Engineer) out of 2 (Marketing Coordinator excluded)
    // Jobicy: 1 matching (MCU Software Engineer)

    expect(storedJobs.length).toBeGreaterThanOrEqual(6);
    expect(storedJobs.length).toBeLessThanOrEqual(8);

    // Verify specific jobs made it through
    const titles = storedJobs.map((j) => j.title);
    expect(titles).toContain('Senior Firmware Engineer');
    expect(titles).toContain('Embedded Linux Engineer');
    expect(titles).toContain('Firmware Test Engineer');
    expect(titles).toContain('Bare Metal Engineer');
    expect(titles).toContain('RTOS Developer');
    expect(titles).toContain('MCU Software Engineer');

    // Verify excluded/filtered jobs are NOT stored
    expect(titles).not.toContain('Sales Manager - Embedded Division');
    expect(titles).not.toContain('Junior Marketing Coordinator');
    expect(titles).not.toContain('Internal Tools Developer');

    // Verify notification results match stored jobs
    expect(notificationResults).toHaveLength(storedJobs.length);

    // Verify keywords were matched
    for (const job of storedJobs) {
      expect(job.keywordsMatched.length).toBeGreaterThan(0);
    }

    // Verify a job has bonus keywords too
    const fwJob = storedJobs.find((j) => j.title === 'Senior Firmware Engineer');
    expect(fwJob?.keywordsMatched).toContain('firmware');
    // 'arm' should match from the description "ARM Cortex-M"
    expect(fwJob?.keywordsMatched).toContain('arm');

    // Verify dedup works: running the same cycle again adds nothing
    let secondRoundNew = 0;
    for (const scraper of scrapers) {
      const rawJobs = await scraper.fetch();
      const newJobs = await pipeline.process(rawJobs);
      secondRoundNew += newJobs.length;
    }
    expect(secondRoundNew).toBe(0);
  });

  it('should handle Telegram notification sending', async () => {
    const notifier = createTelegramNotifier(telegramConfig);

    // Mock the actual HTTP call to Telegram
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const job: Job = {
      id: 'notif-test-1',
      title: 'Firmware Engineer',
      company: 'NXP',
      location: 'Remote',
      description: 'RTOS firmware',
      url: 'https://example.com/job',
      applyUrl: 'https://example.com/apply',
      source: 'greenhouse',
      sourceId: 'ext-1',
      postedDate: new Date(),
      createdAt: new Date(),
      keywordsMatched: ['firmware', 'rtos'],
    };

    const result = await notifier.send(job);
    expect(result).toBe(true);
  });

  it('should handle disabled Telegram gracefully', async () => {
    const notifier = createTelegramNotifier({ enabled: false, botToken: '', chatId: '' });

    const job: Job = {
      id: 'disabled-1',
      title: 'Test',
      company: 'Test Corp',
      location: 'Remote',
      description: 'Testing',
      url: 'https://example.com/job',
      applyUrl: 'https://example.com/apply',
      source: 'greenhouse',
      sourceId: 'ext-1',
      postedDate: new Date(),
      createdAt: new Date(),
      keywordsMatched: [],
    };

    const result = await notifier.send(job);
    expect(result).toBe(false);
  });
});
