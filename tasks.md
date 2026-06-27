# Job Monitor MVP — Task Breakdown

## Overview
26 tasks organized into 6 batches. Total estimated: 40-60 hours (2 weeks part-time).

---

## Batch 1: Foundation (Tasks T001-T004)
**Goal**: Project setup and core infrastructure

### T001: Project Setup
**Description**: Initialize Node.js + TypeScript project with dependencies
**Dependencies**: None
**Estimated LOC**: 50
**Tasks**:
- Update package.json with scripts and dependencies
- Create tsconfig.json
- Create .env.example
- Create .gitignore
- Install dependencies: better-sqlite3, node-cron, yaml, uuid, @types/*

**Dependencies to install**:
```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "node-cron": "^3.0.3",
    "yaml": "^2.4.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/better-sqlite3": "^7.6.8",
    "@types/node-cron": "^3.0.11",
    "@types/uuid": "^9.0.7",
    "vitest": "^1.6.0"
  }
}
```
**Testing**: Build succeeds

---

### T002: Config Types and Loader
**Description**: Define TypeScript interfaces for configuration and YAML loader
**Dependencies**: T001
**Estimated LOC**: 80
**Files**:
- src/config/types.ts
- src/config/loader.ts
- src/config/index.ts

**Interfaces**:
```typescript
interface AppConfig {
  schedule: ScheduleConfig;
  notifications: NotificationConfig;
  storage: StorageConfig;
}

interface ScheduleConfig {
  ats: string;  // cron expression
  rss: string;
  cleanup: string;
}

interface NotificationConfig {
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
}

interface StorageConfig {
  dbPath: string;
  retentionDays: number;
}

interface CompanyConfig {
  greenhouse: { name: string; token: string }[];
  lever: { name: string; token: string }[];
  ashby: { name: string; token: string }[];
}

interface KeywordConfig {
  required: string[];
  bonus: string[];
  excluded: string[];
}
```
**Testing**: Unit test for config loading

---

### T003: SQLite Database Setup
**Description**: Create database connection and schema initialization
**Dependencies**: T001
**Estimated LOC**: 60
**Files**:
- src/storage/database.ts

**Responsibilities**:
- Create/open SQLite database
- Initialize schema (jobs, seen_jobs, config tables)
- Create indexes
- Export database instance

**Testing**: Unit test for schema creation

---

### T004: Core Interfaces
**Description**: Define all TypeScript interfaces for the system
**Dependencies**: T001
**Estimated LOC**: 100
**Files**:
- src/scrapers/types.ts
- src/storage/types.ts
- src/notifications/types.ts
- src/pipeline/types.ts

**Interfaces**:
```typescript
// Scrapers
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

// Storage
interface IJobRepository {
  save(job: Job): Promise<void>;
  seenExists(hash: string): Promise<boolean>;
  markSeen(hash: string, jobId: string): Promise<void>;
  getRecentJobs(limit: number): Promise<Job[]>;
  cleanup(olderThanDays: number): Promise<number>;
}

// Notifications
interface INotificationService {
  send(job: Job): Promise<boolean>;
}

// Pipeline
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  applyUrl: string;
  source: string;
  sourceId: string;
  postedDate: Date;
  createdAt: Date;
  keywordsMatched: string[];
}
```
**Testing**: TypeScript compilation

---

## Batch 2: Scrapers (Tasks T005-T010)
**Goal**: Implement all data source fetchers

### T005: Greenhouse Fetcher
**Description**: Implement Greenhouse ATS API fetcher
**Dependencies**: T004
**Estimated LOC**: 80
**Files**:
- src/scrapers/greenhouse.ts

**Logic**:
1. Fetch from `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
2. Parse JSON response
3. Map to RawJob format
4. Strip HTML from description
5. Handle errors (log and throw)

**Testing**: Unit test with mock data

---

### T006: Lever Fetcher
**Description**: Implement Lever ATS API fetcher
**Dependencies**: T004
**Estimated LOC**: 80
**Files**:
- src/scrapers/lever.ts

**Logic**:
1. Fetch from `api.lever.co/v0/postings/{token}?mode=json`
2. Parse JSON response
3. Map to RawJob format
4. Handle null values
5. Handle errors

**Testing**: Unit test with mock data

---

### T007: Ashby Fetcher
**Description**: Implement Ashby ATS API fetcher
**Dependencies**: T004
**Estimated LOC**: 80
**Files**:
- src/scrapers/ashby.ts

**Logic**:
1. Fetch from `api.ashbyhq.com/posting-api/job-board/{token}`
2. Parse JSON response
3. Map to RawJob format
4. Handle missing fields
5. Handle errors

**Testing**: Unit test with mock data

---

### T008: RemoteOK Fetcher
**Description**: Implement RemoteOK API fetcher
**Dependencies**: T004
**Estimated LOC**: 60
**Files**:
- src/scrapers/remoteok.ts

**Logic**:
1. Fetch from `remoteok.com/api`
2. Parse JSON response
3. Map to RawJob format
4. Filter for embedded-related jobs
5. Handle errors

**Testing**: Unit test with mock data

---

### T009: WeWorkRemotely Fetcher
**Description**: Implement WeWorkRemotely RSS fetcher
**Dependencies**: T004
**Estimated LOC**: 80
**Files**:
- src/scrapers/wwr.ts

**Logic**:
1. Fetch RSS feed from `weworkremotely.com/remote-jobs.rss`
2. Parse XML/RSS
3. Extract job entries
4. Map to RawJob format
5. Handle errors

**Note**: May need XML parser (fast-xml-parser)

**Testing**: Unit test with mock RSS

---

### T010: Jobicy Fetcher
**Description**: Implement Jobicy API fetcher
**Dependencies**: T004
**Estimated LOC**: 60
**Files**:
- src/scrapers/jobicy.ts

**Logic**:
1. Fetch from `jobicy.com/api/v2/jobs?tag=embedded`
2. Parse JSON response
3. Map to RawJob format
4. Handle errors

**Testing**: Unit test with mock data

---

### T011: Scraper Registry
**Description**: Create scraper registry and index
**Dependencies**: T005-T010
**Estimated LOC**: 40
**Files**:
- src/scrapers/index.ts

**Logic**:
- Export all scrapers
- Factory function to create scrapers from config
- Registry pattern for dynamic loading

**Testing**: Unit test for registry

---

## Batch 3: Pipeline (Tasks T012-T015)
**Goal**: Job processing pipeline

### T012: Normalizer
**Description**: Implement RawJob → Job normalization
**Dependencies**: T004
**Estimated LOC**: 60
**Files**:
- src/pipeline/normalizer.ts

**Logic**:
1. Generate UUID
2. Clean/trim fields
3. Set defaults (location, dates)
4. Parse JSON keywords_matched
5. Return Job object

**Testing**: Unit test with various inputs

---

### T013: Dedup Logic
**Description**: Implement SHA256-based deduplication
**Dependencies**: T004
**Estimated LOC**: 40
**Files**:
- src/pipeline/dedupe.ts

**Logic**:
1. Generate hash: SHA256(lowercase(title) + lowercase(company) + applyUrl)
2. Check seen_jobs table
3. Return true if seen, false if new

**Testing**: Unit test for hash generation and dedup

---

### T014: Keyword Filter
**Description**: Implement keyword matching logic
**Dependencies**: T002
**Estimated LOC**: 60
**Files**:
- src/pipeline/filter.ts

**Logic**:
1. Combine title + description
2. Check for required keywords (at least one match)
3. Check for excluded keywords (must not match)
4. Track matched keywords
5. Return true/false

**Testing**: Unit test with various keyword scenarios

---

### T015: Pipeline Orchestrator
**Description**: Create pipeline that chains normalizer, dedup, filter
**Dependencies**: T012-T014
**Estimated LOC**: 80
**Files**:
- src/pipeline/index.ts

**Logic**:
1. Accept RawJob array
2. For each job:
   - Normalize
   - Dedupe (skip if seen)
   - Filter (skip if no match)
   - Store
   - Mark as seen
3. Return new jobs array

**Testing**: Unit test with mock data

---

## Batch 4: Storage and Notifications (Tasks T016-T019)
**Goal**: Data persistence and alerts

### T016: SQLite Repository
**Description**: Implement IJobRepository with SQLite
**Dependencies**: T003, T004
**Estimated LOC**: 100
**Files**:
- src/storage/repository.ts
- src/storage/index.ts

**Methods**:
- save(job): Insert job into jobs table
- seenExists(hash): Check seen_jobs table
- markSeen(hash, jobId): Insert into seen_jobs
- getRecentJobs(limit): Query recent jobs
- cleanup(olderThanDays): Delete old jobs

**Testing**: Unit test with SQLite

---

### T017: Telegram Notifier
**Description**: Implement Telegram Bot API notification service
**Dependencies**: T004
**Estimated LOC**: 60
**Files**:
- src/notifications/telegram.ts
- src/notifications/index.ts

**Logic**:
1. Format job as Telegram message
2. POST to `api.telegram.org/bot{token}/sendMessage`
3. Handle errors (retry once)
4. Return success/failure

**Testing**: Unit test with mock fetch

---

### T018: Message Formatter
**Description**: Implement job → Telegram message formatting
**Dependencies**: None
**Estimated LOC**: 40
**Files**:
- src/notifications/message-formatter.ts

**Format**:
```
🔔 New Embedded Job Found!

📌 {title}
🏢 {company}
📍 {location}
🔗 {applyUrl}

Source: {source}
Matched: {keywordsMatched.join(', ')}
```
**Testing**: Unit test for formatting

---

### T019: Notification Registry
**Description**: Create notification service registry
**Dependencies**: T017
**Estimated LOC**: 30
**Files**:
- src/notifications/index.ts

**Logic**:
- Export telegram service
- Factory function to create services from config

**Testing**: Unit test for registry

---

## Batch 5: Scheduler and Entry Point (Tasks T020-T022)
**Goal**: Orchestration and main entry point

### T020: Scheduler
**Description**: Implement cron-based scheduler
**Dependencies**: T011, T015, T016, T019
**Estimated LOC**: 100
**Files**:
- src/scheduler/index.ts

**Logic**:
1. Create cron jobs from config
2. For each cycle:
   - Check if already running (skip if yes)
   - Fetch from sources
   - Process through pipeline
   - Send notifications
3. Handle cleanup schedule
4. Log activity

**Testing**: Unit test with mock cron

---

### T021: Entry Point
**Description**: Create main index.ts that wires everything together
**Dependencies**: T020
**Estimated LOC**: 60
**Files**:
- src/index.ts

**Logic**:
1. Load configuration
2. Initialize database
3. Create scrapers from config
4. Create pipeline
5. Create notification services
6. Create and start scheduler
7. Handle graceful shutdown

**Testing**: Integration test

---

### T022: Config Files
**Description**: Create default configuration files
**Dependencies**: T002
**Estimated LOC**: 100
**Files**:
- config/companies.yaml
- config/keywords.yaml
- config/config.yaml

**Content**:
- companies.yaml: List of 50+ embedded companies by ATS type
- keywords.yaml: Required, bonus, excluded keywords
- config.yaml: Schedule, notifications, storage settings

**Testing**: Config loading test

---

## Batch 6: Testing and Documentation (Tasks T023-T026)
**Goal**: Quality assurance and documentation

### T023: Unit Tests
**Description**: Write unit tests for all modules
**Dependencies**: T015, T016, T017
**Estimated LOC**: 200
**Files**:
- tests/unit/normalizer.test.ts
- tests/unit/dedupe.test.ts
- tests/unit/filter.test.ts
- tests/unit/formatter.test.ts

**Coverage**:
- Normalizer: edge cases (missing fields, special chars)
- Dedupe: hash generation, collision handling
- Filter: required/excluded/bonus keywords
- Formatter: message formatting

**Testing**: All tests pass

---

### T024: Integration Tests
**Description**: Write integration tests for scrapers and storage
**Dependencies**: T011, T016
**Estimated LOC**: 150
**Files**:
- tests/integration/ats-feeds.test.ts
- tests/integration/rss-feeds.test.ts
- tests/integration/telegram.test.ts

**Approach**:
- Mock HTTP responses
- Test with real SQLite database
- Test Telegram with test bot token

**Testing**: All tests pass

---

### T025: E2E Test
**Description**: Write end-to-end test for full cycle
**Dependencies**: T021
**Estimated LOC**: 100
**Files**:
- tests/e2e/full-cycle.test.ts

**Scenario**:
1. Load config
2. Initialize system
3. Run one cycle
4. Verify jobs stored
5. Verify notifications sent (mock)

**Testing**: Test passes

---

### T026: Documentation
**Description**: Write README and setup documentation
**Dependencies**: T021
**Estimated LOC**: 150
**Files**:
- README.md
- .env.example

**Content**:
- Project overview
- Setup instructions
- Configuration guide
- Running the app
- Troubleshooting

**Testing**: Documentation complete

---

## Task Dependency Graph

```
T001 (Project Setup)
├── T002 (Config Types)
├── T003 (SQLite Setup)
└── T004 (Core Interfaces)
    ├── T005 (Greenhouse)
    ├── T006 (Lever)
    ├── T007 (Ashby)
    ├── T008 (RemoteOK)
    ├── T009 (WWR)
    ├── T010 (Jobicy)
    └── T012 (Normalizer)
        └── T013 (Dedupe)
            └── T014 (Keyword Filter)
                └── T015 (Pipeline)
                    └── T020 (Scheduler)
                        └── T021 (Entry Point)
                            ├── T025 (E2E Test)
                            └── T026 (Documentation)

T011 (Scraper Registry) ← T005-T010
T016 (SQLite Repository) ← T003, T004
T017 (Telegram Notifier) ← T004
T019 (Notification Registry) ← T017
T022 (Config Files) ← T002
T023 (Unit Tests) ← T015, T016, T017
T024 (Integration Tests) ← T011, T016
```

---

## Estimated Timeline

| Week | Days | Tasks | Focus |
|------|------|-------|-------|
| 1 | 1-2 | T001-T004 | Foundation |
| 1 | 3-5 | T005-T011 | Scrapers |
| 2 | 1-2 | T012-T015 | Pipeline |
| 2 | 3-4 | T016-T019 | Storage/Notifications |
| 2 | 5 | T020-T022 | Scheduler/Entry |
| 2 | 6-7 | T023-T026 | Testing/Docs |

---

## Total Estimates

- **Total Tasks**: 26
- **Total LOC**: ~2,100 lines
- **Estimated Hours**: 40-60 hours
- **Batch Count**: 6
- **Parallelizable**: Tasks within batches can run in parallel

---

## Risk Tasks

| Task | Risk | Mitigation |
|------|------|------------|
| T009 (WWR RSS) | XML parsing complexity | Use fast-xml-parser |
| T017 (Telegram) | API changes | Use well-documented Bot API |
| T020 (Scheduler) | Concurrency issues | Use mutex/flag pattern |

---

## Definition of Done

Each task is complete when:
1. Code is written and compiles
2. Tests are written and passing
3. Documentation is updated (if applicable)
4. Code is committed with conventional commit message
