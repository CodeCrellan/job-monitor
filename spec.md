# Job Monitor MVP — Specification

## Overview
Delta specification for the job-monitor-mvp change. Defines functional requirements, data schema, API contracts, and testing strategy for a zero-cost job monitoring system for embedded software positions.

---

## Functional Requirements

### FR-001: Greenhouse ATS Feed Fetcher
**Priority**: P0
**Description**: System shall fetch job listings from Greenhouse ATS public API
**Endpoint**: `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
**Input**: Company board token (e.g., "nxp", "stmicroelectronics")
**Output**: Array of job objects with title, location, description, apply URL
**Behavior**:
- Fetch all published jobs for the company
- Parse JSON response
- Extract: id, title, location.name, description, absolute_url, updated_at
- Handle pagination if needed (Greenhouse returns all by default)
- Rate limit: 1 request per second per company

### FR-002: Lever ATS Feed Fetcher
**Priority**: P0
**Description**: System shall fetch job listings from Lever ATS public API
**Endpoint**: `GET https://api.lever.co/v0/postings/{token}?mode=json`
**Input**: Company site token (e.g., "espressif", "nordic")
**Output**: Array of job objects with title, categories, description, apply URL
**Behavior**:
- Fetch all active postings
- Parse JSON response
- Extract: id, text (title), categories.team, categories.department, descriptionPlain, hostedUrl, applyUrl
- Handle null values gracefully
- Rate limit: 1 request per second per company

### FR-003: Ashby ATS Feed Fetcher
**Priority**: P0
**Description**: System shall fetch job listings from Ashby ATS public API
**Endpoint**: `GET https://api.ashbyhq.com/posting-api/job-board/{token}`
**Input**: Company job board name (e.g., "anthropic", "coreweave")
**Output**: Array of job objects with title, location, description, apply URL
**Behavior**:
- Fetch all published job postings
- Parse JSON response
- Extract: id, title, location, descriptionHtml, jobUrl, applyUrl
- Handle missing fields (some jobs may lack location)
- Rate limit: 1 request per second per company

### FR-004: RSS Feed Fetcher
**Priority**: P1
**Description**: System shall fetch job listings from RSS feeds
**Sources**:
- RemoteOK: `GET https://remoteok.com/api`
- WeWorkRemotely: `GET https://weworkremotely.com/remote-jobs.rss`
- Jobicy: `GET https://jobicy.com/api/v2/jobs?tag=embedded`
**Input**: Feed URL
**Output**: Array of job objects
**Behavior**:
- Parse RSS/JSON feed
- Extract: title, company, location, description, link
- Handle feed format variations
- Rate limit: 1 request per source per cycle

### FR-005: Job Normalization
**Priority**: P0
**Description**: System shall normalize all job data to canonical schema
**Input**: Raw job object from any source
**Output**: Normalized Job object
**Schema**:
```typescript
interface Job {
  id: string;           // UUID
  title: string;        // Job title
  company: string;      // Company name
  location: string;     // Location (city, country, "Remote")
  description: string;  // Job description (plain text)
  url: string;          // Original job URL
  applyUrl: string;     // Direct apply URL
  source: string;       // "greenhouse" | "lever" | "ashby" | "remoteok" | "wwr" | "jobicy"
  sourceId: string;     // Original ID from source
  postedDate: Date;     // When job was posted
  createdAt: Date;      // When we discovered it
  keywordsMatched: string[];  // Which keywords matched
}
```

### FR-006: Deduplication
**Priority**: P0
**Description**: System shall deduplicate jobs across sources using SHA256 hash
**Algorithm**:
1. Create hash from: `SHA256(lowercase(title) + lowercase(company) + applyUrl)`
2. Check if hash exists in seen_jobs table
3. If exists: skip (duplicate)
4. If not exists: store job and hash
**Edge Cases**:
- Same job posted multiple times: keep latest
- Same job on different platforms: dedupe by hash
- Title variations (e.g., "Sr." vs "Senior"): hash catches exact matches only

### FR-007: Keyword Filtering
**Priority**: P0
**Description**: System shall filter jobs by configurable keywords
**Logic**:
```typescript
function matchesKeywords(job: Job, config: KeywordConfig): boolean {
  const text = `${job.title} ${job.description}`.toLowerCase();
  
  // Must match at least one required keyword
  const hasRequired = config.required.some(kw => text.includes(kw.toLowerCase()));
  if (!hasRequired) return false;
  
  // Must not match any excluded keyword
  const hasExcluded = config.excluded.some(kw => text.includes(kw.toLowerCase()));
  if (hasExcluded) return false;
  
  return true;
}
```
**Default Keywords**:
- Required: embedded, firmware, rtos, bare metal, microcontroller, mcu, soc, device driver, bsp
- Bonus: arm, cortex-m, stm32, esp32, zephyr, freertos, linux kernel, yocto
- Excluded: sales, marketing, manager, director, vp, intern, co-op

### FR-008: SQLite Storage
**Priority**: P0
**Description**: System shall store jobs in SQLite database
**Schema**:
```sql
CREATE TABLE jobs (
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
  keywords_matched TEXT  -- JSON array
);

CREATE TABLE seen_jobs (
  hash TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_created ON jobs(created_at);
```

### FR-009: Telegram Notifications
**Priority**: P0
**Description**: System shall send Telegram notifications for new jobs
**Endpoint**: `POST https://api.telegram.org/bot{token}/sendMessage`
**Message Format**:
```
🔔 New Embedded Job Found!

📌 {title}
🏢 {company}
📍 {location}
🔗 {applyUrl}

Source: {source}
Matched: {keywordsMatched.join(', ')}
```
**Behavior**:
- Send one message per new job
- Include all relevant fields
- Handle API errors gracefully (retry once, then skip)
- Rate limit: 30 messages per second (Telegram limit)

### FR-010: Scheduler
**Priority**: P0
**Description**: System shall run on configurable schedule
**Default Schedule**:
- ATS feeds (Greenhouse/Lever/Ashby): Every 6 hours
- RSS feeds (RemoteOK/WWR): Every 24 hours
- Cleanup old jobs: Every 7 days (remove jobs older than 90 days)
**Implementation**: node-cron
**Configuration**: Via config table or YAML file

---

## Non-Functional Requirements

### NFR-001: Performance
- Response time: < 5 seconds per source fetch
- Total cycle time: < 5 minutes for all sources
- Memory usage: < 100MB peak

### NFR-002: Reliability
- Availability: 99% (single instance)
- Error handling: Graceful degradation (skip failed sources)
- Retry logic: Exponential backoff for rate limits

### NFR-003: Storage
- Growth rate: < 1MB/day (assuming 100 new jobs/day)
- Retention: 90 days (configurable)
- Backup: SQLite file copy

### NFR-004: Cost
- External API costs: $0
- Infrastructure: Local machine or free tier (Railway, Render)
- Telegram: Free (bot API)

---

## Edge Cases

### EC-001: Source Unavailable
**Scenario**: HTTP error or timeout from source
**Behavior**: Log error, skip source, retry next cycle
**Recovery**: Automatic on next scheduled run

### EC-002: Rate Limited
**Scenario**: 429 Too Many Requests
**Behavior**: Exponential backoff (1s, 2s, 4s, 8s, max 60s)
**Recovery**: Resume after backoff period

### EC-003: Empty Feed
**Scenario**: Source returns 0 jobs
**Behavior**: Log info, continue to next source
**Recovery**: N/A

### EC-004: Duplicate Across Sources
**Scenario**: Same job posted on LinkedIn and company career page
**Behavior**: Dedupe by hash, keep first seen
**Recovery**: N/A

### EC-005: Malformed Data
**Scenario**: Missing required fields (title, company, url)
**Behavior**: Skip job, log warning
**Recovery**: N/A

### EC-006: Telegram API Error
**Scenario**: Bot token invalid or API down
**Behavior**: Log error, skip notification, store job anyway
**Recovery**: Manual investigation

---

## Testing Strategy

### Unit Tests
- `test/normalizer.test.ts`: Test job normalization from each source
- `test/dedupe.test.ts`: Test hash generation and dedup logic
- `test/filter.test.ts`: Test keyword matching (required, bonus, excluded)
- `test/scrapers.test.ts`: Test each scraper with mock data

### Integration Tests
- `test/integration/ats-feeds.test.ts`: Test real ATS feeds (with rate limiting)
- `test/integration/rss-feeds.test.ts`: Test real RSS feeds
- `test/integration/telegram.test.ts`: Test real Telegram bot (send to test chat)

### E2E Tests
- `test/e2e/full-cycle.test.ts`: Run full cycle with real sources, verify notifications

### Test Data
- Mock responses for each ATS/RSS format
- Sample jobs with various edge cases (missing fields, duplicates)

---

## Configuration

### companies.yaml
```yaml
greenhouse:
  - name: NXP Semiconductors
    token: nxp
  - name: STMicroelectronics
    token: stmicroelectronics
  - name: Espressif Systems
    token: espressif

lever:
  - name: Nordic Semiconductor
    token: nordic
  - name: Particle.io
    token: particle

ashby:
  - name: Anthropic
    token: anthropic
```

### keywords.yaml
```yaml
required:
  - embedded
  - firmware
  - rtos
  - bare metal
  - microcontroller
  - mcu
  - soc
  - device driver
  - bsp
  - hardware abstraction

bonus:
  - arm
  - cortex-m
  - stm32
  - esp32
  - zephyr
  - freertos
  - linux kernel
  - yocto
  - buildroot

excluded:
  - sales
  - marketing
  - manager
  - director
  - vp
  - intern
  - co-op
  - fresh graduate
```

### config.yaml
```yaml
schedule:
  ats: "0 */6 * * *"  # Every 6 hours
  rss: "0 0 * * *"    # Daily at midnight
  cleanup: "0 0 * * 0" # Weekly on Sunday

notifications:
  telegram:
    enabled: true
    bot_token: "${TELEGRAM_BOT_TOKEN}"
    chat_id: "${TELEGRAM_CHAT_ID}"

storage:
  db_path: "./data/jobs.db"
  retention_days: 90
```

---

## Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Source coverage | Companies monitored | 50+ |
| Detection latency | Time from posting to notification | < 6 hours |
| Deduplication rate | Duplicate jobs caught | > 95% |
| Notification delivery | Messages sent successfully | > 99% |
| Cost | External API spend | $0 |
| Uptime | Scheduled runs completed | > 99% |

---

## Dependencies

### External
- Telegram Bot API (free)
- Greenhouse public API (free)
- Lever public API (free)
- Ashby public API (free)
- RemoteOK API (free)
- WeWorkRemotely RSS (free)

### Internal
- Node.js 18+ (native fetch)
- TypeScript 5+
- better-sqlite3
- node-cron
- telegram-bot-api (or native fetch)

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ATS API changes | Medium | Monitor changelogs, version pinning |
| Rate limiting | Low | Exponential backoff, respect limits |
| Telegram API changes | Low | Use well-documented Bot API |
| Storage growth | Low | Configurable retention, cleanup job |
| Company list maintenance | Medium | Quarterly review, community contributions |

---

## Out of Scope

- LinkedIn scraping (risky, expensive)
- Paid APIs (SerpAPI, Bright Data)
- Web dashboard (future enhancement)
- Resume parsing
- Application automation
- Multi-user support
- Authentication/authorization
