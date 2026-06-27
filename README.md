# Job Monitor

Monitor de búsquedas laborales para posiciones de **embedded software / firmware**. Scrapea ATS (Greenhouse, Lever, Ashby) y RSS (RemoteOK, WeWorkRemotely, Jobicy), filtra por keywords, guarda en SQLite y envía notificaciones por Telegram.

Sin costo en fuentes de datos — solo APIs públicas y gratuitas.

## Features

- **6 fuentes de datos**: Greenhouse, Lever, Ashby, RemoteOK, WeWorkRemotely, Jobicy
- **Filtro por keywords**: required / bonus / excluded, configurable vía YAML
- **Deduplicación**: SHA256 hash sobre título + compañía + URL
- **Notificaciones**: Telegram Bot API
- **SQLite**: cero config, file-based, con cleanup automático
- **Scheduler**: cron configurable (ATS cada 6h, RSS diario, cleanup semanal)
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
  - name: Espressif Systems
    token: espressif

ashby:
  - name: Anthropic
    token: anthropic
```

### `config/keywords.yaml`

Palabras clave para filtrar resultados:

```yaml
required:
  - embedded
  - firmware
  - rtos
  - microcontroller

bonus:
  - arm
  - stm32
  - esp32

excluded:
  - sales
  - manager
  - intern
```

### `config/config.yaml`

Configuración de scheduler y storage:

```yaml
schedule:
  ats: "0 */6 * * *"    # cada 6 horas
  rss: "0 0 * * *"      # diario a medianoche
  cleanup: "0 0 * * 0"  # domingo a medianoche

notifications:
  telegram:
    enabled: true

storage:
  retention_days: 90
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

```
npm run test:run
```

```
✓ tests/unit/normalizer.test.ts           (9 tests)
✓ tests/unit/dedupe.test.ts               (11 tests)
✓ tests/unit/filter.test.ts               (14 tests)
✓ tests/unit/message-formatter.test.ts    (12 tests)
✓ tests/integration/scrapers.test.ts      (20 tests)
✓ tests/integration/storage.test.ts       (9 tests)
✓ tests/e2e/full-cycle.test.ts            (3 tests)
──────────────────────────────────────────────
  7 test files  |  78 tests  |  all passing
```

## Arquitectura

```
src/
├── index.ts                  # Entry point
├── config/                   # Carga de config (YAML + .env)
├── scrapers/                 # 6 source fetchers (ATS + RSS)
├── pipeline/                 # Normalizer → Dedup → Filter
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
