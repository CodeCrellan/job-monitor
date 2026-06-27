# Job Monitor

Monitor de búsquedas laborales para posiciones de **embedded software / firmware**. Scrapea ATS (Greenhouse, Lever, Ashby), RSS (RemoteOK, WeWorkRemotely, Jobicy) y APIs agregadoras (freehire.dev), filtra por keywords, ubicación y experiencia, guarda en SQLite y envía notificaciones por Telegram.

Sin costo en fuentes de datos — solo APIs públicas y gratuitas.

## Features

- **7 fuentes de datos**: Greenhouse, Lever, Ashby, RemoteOK, WeWorkRemotely, Jobicy, freehire.dev
- **Filtro por keywords**: required (OR), matchAll (AND entre grupos, OR dentro de cada grupo), bonus, excluded — configurable vía YAML
- **Filtro de ubicación**: jobs en tu país, remotos, o con visa sponsorship
- **Filtro de experiencia**: excluye roles senior y posiciones que requieran más de N años
- **Deduplicación**: SHA256 hash sobre título + compañía + URL
- **Notificaciones**: Telegram Bot API con mensajes de separación por batch
- **SQLite**: cero config, file-based, con cleanup automático
- **Scheduler**: cron configurable, ciclo inmediato al arrancar
- **Graceful shutdown**: maneja SIGINT/SIGTERM

## Stack

| Capa          | Tecnología                          |
| ------------- | ----------------------------------- |
| Runtime       | Node.js 18+ / TypeScript 5          |
| Base de datos | SQLite (better-sqlite3)             |
| Scheduling    | node-cron                           |
| Notificaciones| Telegram Bot API                    |
| Config        | YAML + .env                         |
| Tests         | Vitest                              |

## Quick Start

```bash
# 1. Clonar e instalar
git clone https://github.com/CodeCrellan/job-monitor.git
cd job-monitor
npm install

# 2. Configurar Telegram
cp .env.example .env
# Editar .env con TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
# (conseguí el token en https://t.me/botfather)

# 3. Ejecutar
npm run dev          # desarrollo (hot-reload)
npm start            # producción
```

## Configuración

### `.env`

| Variable             | Descripción                     | Default               |
| -------------------- | ------------------------------- | --------------------- |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram       | — (requerido)         |
| `TELEGRAM_CHAT_ID`   | Chat ID donde recibir alerts    | — (requerido)         |
| `DB_PATH`            | Ruta a la base SQLite           | `./data/jobs.db`      |
| `LOG_LEVEL`          | Nivel de log                    | `info`                |

### `config/companies.yaml`

Lista de compañías a monitorear, organizadas por tipo de ATS:

```yaml
greenhouse:
  - name: NXP Semiconductors
    token: nxp
  - name: STMicroelectronics
    token: stmicroelectronics

lever:
  - name: Nordic Semiconductor
    token: nordic
  - name: Espressif Systems
    token: espressif

ashby:
  - name: Anthropic
    token: anthropic
```

### `config/keywords.yaml`

Palabras clave para filtrar resultados:

```yaml
# Al menos una de estas debe matchear (OR)
required:
  - embedded
  - firmware
  - rtos
  - microcontroller

# TODOS los grupos deben matchear (AND entre grupos, OR dentro de cada grupo)
# Ejemplo: [[CAN, UDS], [diagnostic]] → (CAN OR UDS) AND (diagnostic)
match_all:
  - [CAN, UDS, CAN bus, CAN FD]

# Informacional — aumentan prioridad
bonus:
  - arm
  - cortex-m
  - stm32
  - esp32
  - zephyr
  - freertos

# Excluir si alguna matchea
excluded:
  - sales
  - manager
  - intern
```

### `config/config.yaml`

Configuración de scheduler, filtros y storage:

```yaml
schedule:
  ats: "0 */6 * * *"    # cada 6 horas
  rss: "0 */6 * * *"    # cada 6 horas
  cleanup: "0 0 * * 0"  # domingo a medianoche

notifications:
  telegram:
    enabled: true

storage:
  retention_days: 90

# Filtro de experiencia: excluye senior roles y posiciones con muchos años
experience:
  enabled: true
  maxYears: 3

# Filtro de ubicación: solo jobs en tu país, remotos, o con visa
location:
  enabled: true
  userCountry: "MX"
  allowRemote: true
  allowVisaSponsorship: true
```

## Scripts

| Comando           | Descripción                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Desarrollo con hot-reload (tsx watch)    |
| `npm start`       | Producción (desde dist/)                 |
| `npm run build`   | Compilar TypeScript                      |
| `npm test`        | Correr tests en watch mode               |
| `npm run test:run`| Correr tests una sola vez                |
| `npm run lint`    | ESLint                                   |
| `npm run clean`   | Limpiar dist/                            |

## Tests

```bash
npm run test:run
```

```
✓ tests/unit/normalizer.test.ts               (9 tests)
✓ tests/unit/dedupe.test.ts                   (11 tests)
✓ tests/unit/filter.test.ts                   (21 tests)
✓ tests/unit/message-formatter.test.ts        (12 tests)
✓ tests/unit/experience-filter.test.ts        (12 tests)
✓ tests/unit/location-filter.test.ts          (18 tests)
✓ tests/integration/scrapers.test.ts          (20 tests)
✓ tests/integration/storage.test.ts           (9 tests)
✓ tests/e2e/full-cycle.test.ts                (3 tests)
──────────────────────────────────────────────
  9 test files  |  115 tests  |  all passing
```

## Arquitectura

```
src/
├── index.ts                  # Entry point (startup cycle incluido)
├── config/                   # Carga de config (YAML + .env)
├── scrapers/                 # 7 source fetchers (ATS + RSS + API)
│   ├── greenhouse.ts         # Greenhouse ATS
│   ├── lever.ts              # Lever ATS
│   ├── ashby.ts              # Ashby ATS
│   ├── remoteok.ts           # RemoteOK RSS
│   ├── wwr.ts                # WeWorkRemotely RSS
│   ├── jobicy.ts             # Jobicy RSS
│   └── freehire.ts           # freehire.dev API (70+ fuentes agregadas)
├── pipeline/                 # Normalizer → Dedup → KeywordFilter → ExperienceFilter → LocationFilter
├── storage/                  # SQLite repository
├── notifications/            # Telegram Bot + formatter
└── scheduler/                # Cron orchestration
```

## Deploy

Opciones gratuitas recomendadas:

| Plataforma | Free Tier                        |
| ---------- | -------------------------------- |
| Railway    | 500 horas/mes                    |
| Render     | Workers gratuitos                |
| Fly.io     | 3 VMs compartidas                |
| Local      | `npm start` (requiere siempre-on)|

## Licencia

MIT
