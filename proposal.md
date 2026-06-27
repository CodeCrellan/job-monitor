# Job Monitor MVP — Change Proposal

## Intent
Build a job monitoring application that alerts users when new embedded software positions are posted on job boards and company career pages.

## Scope
- **Duration**: 2 weeks
- **Budget**: $0-10/mo (free tiers only)
- **Notifications**: Telegram Bot
- **Location**: Remote + On-site (configurable)

## Approach

### Data Sources (Free)

| Source | Method | Cost | Coverage |
|--------|--------|------|----------|
| Greenhouse ATS | Public JSON API | Free | 1000+ tech companies |
| Lever ATS | Public JSON API | Free | Growth-stage startups |
| Ashby ATS | Public JSON API | Free | AI/tech companies |
| RemoteOK | Public API | Free | Remote embedded jobs |
| WeWorkRemotely | RSS feed | Free | Remote tech jobs |
| Jobicy | Public API | Free | Remote jobs |

### Architecture

```
┌─────────────────────────────────────────────────┐
│           SCHEDULER (node-cron)                  │
│  - Every 6 hours: ATS feeds (Greenhouse/Lever)  │
│  - Every 24 hours: RSS feeds (RemoteOK/WWR)     │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         SCRAPER LAYER                            │
│  - ats-feeds.ts (Greenhouse/Lever/Ashby)        │
│  - rss-feeds.ts (RemoteOK/WWR/Jobicy)           │
│  - HTTP fetch + JSON parse (no browser needed)   │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         PIPELINE                                 │
│  - normalize.ts (canonical job schema)           │
│  - dedupe.ts (SHA256 hash)                       │
│  - filter.ts (keyword matching)                  │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         STORAGE (SQLite)                         │
│  - jobs table (title, company, url, location)    │
│  - seen_jobs table (hash for dedup)              │
│  - config table (keywords, companies)            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         NOTIFICATIONS                            │
│  - Telegram Bot API (free, instant)              │
│  - Email via nodemailer (optional)               │
└─────────────────────────────────────────────────┘
```

### Tech Stack
- **Runtime**: Node.js + TypeScript
- **Storage**: SQLite (better-sqlite3)
- **Scheduling**: node-cron
- **HTTP**: native fetch
- **Notifications**: Telegram Bot API

## Success Criteria
1. ✅ Monitor 50+ embedded-focused companies via ATS feeds
2. ✅ Detect new job postings within 6 hours
3. ✅ Filter by keywords: embedded, firmware, RTOS, bare metal, microcontroller
4. ✅ Send Telegram notification with job title, company, location, apply link
5. ✅ Deduplicate jobs across sources
6. ✅ Zero cost for data sources

## Non-Goals
- ❌ LinkedIn scraping (risky, expensive)
- ❌ Paid APIs (SerpAPI, Bright Data)
- ❌ Web dashboard (future enhancement)
- ❌ Resume parsing or application automation

## Target Companies (Embedded Software)

### Tier 1 — Semiconductor/MCU
- NXP Semiconductors
- STMicroelectronics
- Texas Instruments (TI)
- Microchip Technology
- Espressif Systems
- Nordic Semiconductor
- Renesas Electronics
- Infineon Technologies
- Qualcomm (IoT division)
- Analog Devices

### Tier 2 — Automotive/Medical
- Bosch (automotive)
- Continental
- ZF Friedrichshafen
- Medtronic
- Abbott (medical devices)
- Siemens Healthineers

### Tier 3 — IoT/Embedded Software
- Espressif (ESP-IDF)
- Particle.io
- Twilio (IoT)
- Hologram.io
- Blues Wireless
- Soracom

### Tier 4 — Tech with Embedded Teams
- Google (Android Things, Pixel)
- Apple (hardware teams)
- Amazon (AWS IoT, Ring)
- Meta (Quest hardware)
- Microsoft (Azure IoT)

## Keywords

### Required (must match at least one)
- embedded
- firmware
- RTOS
- bare metal
- microcontroller
- MCU
- SoC
- device driver
- BSP
- hardware abstraction

### Bonus (increase priority)
- ARM
- Cortex-M
- STM32
- ESP32
- Zephyr
- FreeRTOS
- Linux kernel
- Yocto
- Buildroot

### Excluded (filter out)
- sales
- marketing
- manager
- director
- VP
- intern
- co-op
- fresh graduate

## Open Questions
1. Do you have specific companies to prioritize beyond this list?
2. Any specific microcontroller platforms you specialize in? (STM32, ESP32, etc.)
3. Do you want location filtering (specific countries/cities)?
4. Telegram Bot setup: do you already have a bot token?

## Estimated Tasks
1. Project setup (TypeScript, SQLite, dependencies)
2. ATS feed scrapers (Greenhouse, Lever, Ashby)
3. RSS feed scrapers (RemoteOK, WWR)
4. Job normalization and deduplication
5. Keyword filtering engine
6. SQLite schema and storage layer
7. Telegram notification system
8. Scheduler configuration
9. Configuration management (YAML configs)
10. Testing and documentation
