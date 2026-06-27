# Job Monitor MVP — Technical Design

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRY POINT                              │
│                      src/index.ts                               │
│  - Initialize config, database, scheduler                      │
│  - Start cron jobs                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SCHEDULER LAYER                            │
│                    src/scheduler/index.ts                       │
│  - node-cron orchestration                                     │
│  - Trigger scrapers on schedule                                │
│  - Handle concurrency (skip if already running)                │
└────────────────────┬────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────────┐ ┌─────────────────────┐
│   SCRAPER LAYER     │ │   SCRAPER LAYER     │
│  src/scrapers/      │ │  src/scrapers/      │
│  - ats-feeds.ts     │ │  - rss-feeds.ts     │
│  - greenhouse.ts    │ │  - remoteok.ts      │
│  - lever.ts         │ │  - wwr.ts           │
│  - ashby.ts         │ │  - jobicy.ts        │
└─────────┬───────────┘ └─────────┬───────────┘
          │                       │
          └───────────┬───────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PIPELINE LAYER                             │
│                    src/pipeline/index.ts                        │
│  - normalize() → RawJob → Job                                   │
│  - dedupe() → Filter duplicates                                │
│  - filter() → Apply keyword matching                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────────┐ ┌─────────────────────┐
│   STORAGE LAYER     │ │  NOTIFICATION LAYER  │
│  src/storage/       │ │  src/notifications/  │
│  - repository.ts    │ │  - telegram.ts       │
│  - database.ts      │ │  - message-formatter │
└─────────────────────┘ └─────────────────────┘
```

---

## Module Design

### 1. Scrapers (`src/scrapers/`)

#### Interface: `ISourceFetcher`
```typescript
interface ISourceFetcher {
  readonly name: string;
  fetch(): Promise<RawJob[]>;
}

interface RawJob {
  title: string;
  company: string;
  location?: string;
  description: string;
  url: string;
  applyUrl: string;
  sourceId: string;
  postedDate?: Date;
}
```

#### Files:
- `index.ts` — Export all scrapers, registry pattern
- `greenhouse.ts` — Greenhouse ATS fetcher
- `lever.ts` — Lever ATS fetcher
- `ashby.ts` — Ashby ATS fetcher
- `remoteok.ts` — RemoteOK API fetcher
- `wwr.ts` — WeWorkRemotely RSS fetcher
- `jobicy.ts` — Jobicy API fetcher

#### Implementation Pattern:
```typescript
class GreenhouseFetcher implements ISourceFetcher {
  readonly name = 'greenhouse';
  
  constructor(private token: string) {}
  
  async fetch(): Promise<RawJob[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${this.token}/jobs?content=true`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new SourceError(`Greenhouse ${this.token}: ${response.status}`);
    }
    
    const data = await response.json();
    return data.jobs.map(this.normalize);
  }
  
  private normalize(job: any): RawJob {
    return {
      title: job.title,
      company: job.location?.name || this.token,
      location: job.location?.name,
      description: this.stripHtml(job.content),
      url: job.absolute_url,
      applyUrl: job.absolute_url,
      sourceId: job.id.toString(),
      postedDate: job.updated_at ? new Date(job.updated_at) : undefined,
    };
  }
}
```

### 2. Pipeline (`src/pipeline/`)

#### Files:
- `index.ts` — Pipeline orchestrator
- `normalizer.ts` — RawJob → Job conversion
- `dedupe.ts` — Hash-based deduplication
- `filter.ts` — Keyword matching

#### Implementation Pattern:
```typescript
class Pipeline {
  constructor(
    private repository: IJobRepository,
    private config: KeywordConfig
  ) {}
  
  async process(jobs: RawJob[]): Promise<Job[]> {
    const results: Job[] = [];
    
    for (const raw of jobs) {
      // 1. Normalize
      const job = normalize(raw);
      
      // 2. Dedupe
      const hash = generateHash(job);
      if (await this.repository.seenExists(hash)) {
        continue;
      }
      
      // 3. Filter
      if (!matchesKeywords(job, this.config)) {
        continue;
      }
      
      // 4. Store
      await this.repository.save(job);
      await this.repository.markSeen(hash, job.id);
      
      results.push(job);
    }
    
    return results;
  }
}
```

### 3. Storage (`src/storage/`)

#### Interface: `IJobRepository`
```typescript
interface IJobRepository {
  save(job: Job): Promise<void>;
  seenExists(hash: string): Promise<boolean>;
  markSeen(hash: string, jobId: string): Promise<void>;
  getRecentJobs(limit: number): Promise<Job[]>;
  cleanup(olderThanDays: number): Promise<number>;
}
```

#### Files:
- `index.ts` — Export repository
- `repository.ts` — SQLite implementation
- `database.ts` — Connection and schema setup

### 4. Notifications (`src/notifications/`)

#### Interface: `INotificationService`
```typescript
interface INotificationService {
  send(job: Job): Promise<boolean>;
}
```

#### Files:
- `index.ts` — Export service
- `telegram.ts` — Telegram Bot API implementation
- `message-formatter.ts` — Job → Message formatting

### 5. Scheduler (`src/scheduler/`)

#### Files:
- `index.ts` — Cron orchestration

#### Implementation:
```typescript
import cron from 'node-cron';

class Scheduler {
  private running = new Set<string>();
  
  constructor(
    private scrapers: ISourceFetcher[],
    private pipeline: Pipeline,
    private notifier: INotificationService
  ) {}
  
  start(config: ScheduleConfig) {
    // ATS feeds: every 6 hours
    cron.schedule(config.ats, () => this.runScrapers('ats'));
    
    // RSS feeds: daily
    cron.schedule(config.rss, () => this.runScrapers('rss'));
    
    // Cleanup: weekly
    cron.schedule(config.cleanup, () => this.cleanup());
  }
  
  private async runScrapers(type: string) {
    const key = `scrapers:${type}`;
    if (this.running.has(key)) {
      console.log(`Skipping ${type} - already running`);
      return;
    }
    
    this.running.add(key);
    try {
      const subset = this.scrapers.filter(s => s.name.includes(type));
      for (const scraper of subset) {
        try {
          const rawJobs = await scraper.fetch();
          const newJobs = await this.pipeline.process(rawJobs);
          
          for (const job of newJobs) {
            await this.notifier.send(job);
          }
          
          console.log(`${scraper.name}: ${newJobs.length} new jobs`);
        } catch (error) {
          console.error(`${scraper.name} failed:`, error);
        }
      }
    } finally {
      this.running.delete(key);
    }
  }
}
```

### 6. Config (`src/config/`)

#### Files:
- `index.ts` — Config loader
- `types.ts` — TypeScript interfaces
- `loader.ts` — YAML file loader

---

## Data Flow

```
1. Scheduler triggers
   ↓
2. Scraper.fetch() → RawJob[]
   ↓
3. Pipeline.process(RawJob[])
   ├─ normalize() → Job
   ├─ dedupe() → skip if seen
   ├─ filter() → skip if no match
   └─ save() → SQLite
   ↓
4. For each new Job:
   └─ notifier.send(job) → Telegram message
```

---

## File Structure

```
job-monitor/
├── src/
│   ├── index.ts                    # Entry point
│   ├── scrapers/
│   │   ├── index.ts                # Scraper registry
│   │   ├── types.ts                # ISourceFetcher, RawJob
│   │   ├── greenhouse.ts           # Greenhouse fetcher
│   │   ├── lever.ts                # Lever fetcher
│   │   ├── ashby.ts                # Ashby fetcher
│   │   ├── remoteok.ts             # RemoteOK fetcher
│   │   ├── wwr.ts                  # WeWorkRemotely fetcher
│   │   └── jobicy.ts               # Jobicy fetcher
│   ├── pipeline/
│   │   ├── index.ts                # Pipeline orchestrator
│   │   ├── normalizer.ts           # RawJob → Job
│   │   ├── dedupe.ts               # Hash-based dedup
│   │   └── filter.ts               # Keyword matching
│   ├── storage/
│   │   ├── index.ts                # Export repository
│   │   ├── types.ts                # IJobRepository
│   │   ├── repository.ts           # SQLite implementation
│   │   └── database.ts             # Connection, schema
│   ├── notifications/
│   │   ├── index.ts                # Export service
│   │   ├── types.ts                # INotificationService
│   │   ├── telegram.ts             # Telegram Bot API
│   │   └── message-formatter.ts    # Job → Message
│   ├── scheduler/
│   │   └── index.ts                # Cron orchestration
│   └── config/
│       ├── index.ts                # Config loader
│       ├── types.ts                # Config interfaces
│       └── loader.ts               # YAML loader
├── config/
│   ├── companies.yaml              # Company list
│   ├── keywords.yaml               # Keyword rules
│   └── config.yaml                 # App config
├── data/
│   └── jobs.db                     # SQLite database (gitignored)
├── tests/
│   ├── unit/
│   │   ├── normalizer.test.ts
│   │   ├── dedupe.test.ts
│   │   └── filter.test.ts
│   ├── integration/
│   │   ├── ats-feeds.test.ts
│   │   └── telegram.test.ts
│   └── e2e/
│       └── full-cycle.test.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Database Design

### Schema
```sql
-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  url TEXT NOT NULL,
  apply_url TEXT,
  source TEXT NOT NULL,
  source_id TEXT,
  posted_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  keywords_matched TEXT
);

-- Seen jobs for dedup
CREATE TABLE IF NOT EXISTS seen_jobs (
  hash TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Configuration
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_seen_created ON seen_jobs(created_at);
```

### Query Patterns
```typescript
// Check if job was seen
const seenExists = async (hash: string): Promise<boolean> => {
  const result = db.prepare('SELECT 1 FROM seen_jobs WHERE hash = ?').get(hash);
  return !!result;
};

// Save new job
const save = async (job: Job): Promise<void> => {
  db.prepare(`
    INSERT INTO jobs (id, title, company, location, description, url, apply_url, source, source_id, posted_date, keywords_matched)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    job.id, job.title, job.company, job.location,
    job.description, job.url, job.applyUrl, job.source,
    job.sourceId, job.postedDate?.toISOString(),
    JSON.stringify(job.keywordsMatched)
  );
};

// Cleanup old jobs
const cleanup = async (olderThanDays: number): Promise<number> => {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000);
  const result = db.prepare('DELETE FROM jobs WHERE created_at < ?').run(cutoff.toISOString());
  return result.changes;
};
```

---

## Error Handling Strategy

### Source Failures
```typescript
try {
  const jobs = await scraper.fetch();
} catch (error) {
  if (error instanceof SourceError) {
    console.error(`Source ${scraper.name} failed: ${error.message}`);
    // Skip and continue to next source
    continue;
  }
  throw error; // Re-throw unexpected errors
}
```

### Rate Limiting
```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
      await sleep(Number(retryAfter) * 1000);
      continue;
    }
    
    return response;
  }
  
  throw new Error(`Rate limited after ${maxRetries} attempts`);
}
```

### Notification Failures
```typescript
async function sendWithFallback(job: Job): Promise<boolean> {
  try {
    await telegram.send(job);
    return true;
  } catch (error) {
    console.error('Telegram send failed:', error);
    // Job is already stored, will be notified next cycle
    return false;
  }
}
```

---

## Deployment Considerations

### Local Execution
```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with Telegram bot token and chat ID

# Build
npm run build

# Run
npm start
```

### Environment Variables
```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Database
DB_PATH=./data/jobs.db

# Logging
LOG_LEVEL=info
```

### Free Tier Hosting Options
1. **Railway** — Free tier with 500 hours/month
2. **Render** — Free tier for background workers
3. **Fly.io** — Free tier with 3 shared VMs
4. **Local machine** — Always free, but requires always-on

### Logging Strategy
- Use console.log for info
- Use console.error for errors
- Log format: `[timestamp] [level] [module] message`
- Example: `[2026-06-27T10:00:00Z] [INFO] [greenhouse] Fetched 45 jobs from nxp`

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite | Zero-config, embedded, file-based |
| Scheduler | node-cron | Simple, reliable, no external service |
| HTTP | native fetch | No dependencies, Node 18+ built-in |
| Config | YAML files | Human-readable, easy to edit |
| Dedup | SHA256 hash | Fast, collision-resistant |
| Notifications | Telegram Bot | Free, instant, mobile-friendly |
| Error handling | Skip and retry | Graceful degradation |

---

## Performance Considerations

- **Concurrency**: One scraper at a time to avoid rate limits
- **Batch processing**: Process jobs in sequence, not parallel
- **Memory**: Stream large responses, don't buffer
- **Storage**: Index on frequently queried columns
- **Cleanup**: Weekly cleanup of old jobs

---

## Security Considerations

- **API tokens**: Store in .env, never in code
- **Rate limiting**: Respect source limits
- **Input sanitization**: Strip HTML from descriptions
- **SQL injection**: Use parameterized queries
- **Error messages**: Don't expose internal details

---

## Future Enhancements

1. **Web dashboard** — React/Vue UI for browsing jobs
2. **Email notifications** — SMTP via nodemailer
3. **More sources** — LinkedIn (via proxy), Indeed, Glassdoor
4. **Advanced filtering** — Location, salary, company size
5. **Machine learning** — Job relevance scoring
6. **Multi-user** — User accounts and preferences
7. **API endpoints** — REST API for external integrations
