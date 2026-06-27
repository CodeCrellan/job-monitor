# Job Monitor

Monitor de búsquedas laborales para posiciones de **embedded software / firmware**. Scrapea ATS (Greenhouse, Lever, Ashby), RSS (RemoteOK, WeWorkRemotely, Jobicy) y APIs agregadoras (freehire.dev), filtra por keywords, ubicación y experiencia, guarda en SQLite y envía notificaciones por Telegram.

Sin costo en fuentes de datos — solo APIs públicas y gratuitas.

## Features

- **7 fuentes de datos**: Greenhouse, Lever, Ashby, RemoteOK, WeWorkRemotely, Jobicy, freehire.dev
- **Filtro por keywords**: required (OR), matchAll (AND entre grupos, OR dentro de cada grupo), bonus, excluded — configurable vía YAML
- **Filtro de ubicación**: jobs en tu país, remotos, o con visa sponsorship
- **Filtro de experiencia**: excluye roles senior y posiciones que requieran más de N años
- **Deduplicación**: SHA256 hash sobre título + compañía + URL. Cada trabajo se notifica UNA SOLA VEZ — si reaparece en ciclos posteriores, se detecta como visto y no se reenvía
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

# 2. Configurar Telegram (ver sección "Configurar Telegram" abajo)
cp .env.example .env

# 3. Ejecutar
npm run dev          # desarrollo (hot-reload)
npm start            # producción
```

### Configurar Telegram

#### 1. Crear un bot y obtener el token

1. Abrí Telegram y buscá **BotFather** (el usuario oficial: `@BotFather`)
2. Iniciá un chat y enviale `/newbot`
3. Te va a pedir un nombre — ponele el que quieras, ej: `Mi Job Monitor`
4. Después te pide un username **terminado en `bot`** — ej: `mi_job_monitor_bot`
5. BotFather te responde con algo como:

```
Done! Congratulations on your new bot.
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklmNOPqrSTUvWXyz-ABCDEFghij
```

Ese string largo es tu `TELEGRAM_BOT_TOKEN`. Copialo.

#### 2. Obtener el Chat ID

**Opción fácil (recomendada)** — con `@userinfobot`:

1. En Telegram, buscá **@userinfobot** e iniciá un chat
2. Enviale cualquier mensaje (ej: `/start`)
3. Te va a responder un número: `Id: 123456789` — ese número es tu `TELEGRAM_CHAT_ID`

**Opción manual** — con `getUpdates`:

1. Buscá tu bot nuevo (por el username que le pusiste) e **iniciá un chat** con él
2. Enviale cualquier mensaje, ej: `/start`
3. Abrí en tu navegador esta URL (reemplazando `TOKEN` por el de tu bot):

```
https://api.telegram.org/botTOKEN/getUpdates
```

4. Buscá en la respuesta JSON un campo `"chat":{"id":123456789,...}` — ese número es el `TELEGRAM_CHAT_ID`

> 💡 **Tip con `curl`**: si tenés curl, después de mandarle el mensaje al bot:
> ```bash
> curl -s "https://api.telegram.org/botTU_TOKEN/getUpdates" | grep -o '"chat":{"id":[0-9-]*'
> ```

#### 3. Completar `.env`

Abrí `.env` y pegalos:

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklmNOPqrSTUvWXyz-ABCDEFghij
TELEGRAM_CHAT_ID=123456789
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

Compañías monitoreadas por ATS (Greenhouse, Lever, Ashby).  
**Solo aplica a fuentes ATS** — las fuentes RSS/API (RemoteOK, WWR, Jobicy, freehire.dev) traen resultados de **cualquier empresa** según las keywords, estén o no en esta lista.

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

Palabras clave + filtros de experiencia y ubicación — todo en un solo archivo:

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

# Filtro de experiencia: excluye senior roles y posiciones con muchos años
experience:
  enabled: true
  maxYears: 3

# Filtro de ubicación: solo jobs en tu país, remotos, o con visa sponsorship
location:
  enabled: true
  userCountry: "MX"
  allowRemote: false
  allowVisaSponsorship: false
```

### `config/config.yaml`

Configuración de scheduler, notificaciones y storage:

```yaml
schedule:
  ats: "0 */6 * * *"    # Empresas de config/companies.yaml (Greenhouse, Lever, Ashby)
  rss: "0 */6 * * *"    # Fuentes generales (RemoteOK, WWR, Jobicy, freehire.dev)
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
| `npm run dev`     | Desarrollo con hot-reload (tsx watch) — reinicia solo al cambiar código |
| `npm start`       | Producción desde `dist/` (correr `npm run build` primero)              |
| `npm run build`   | Compilar TypeScript a `dist/`                                           |
| `npm test`        | Tests en watch mode (para desarrollo)     |
| `npm run test:run`| Tests una sola vez (para CI / verificar)  |
| `npm run lint`    | ESLint — revisa código                    |
| `npm run clean`   | Borra `dist/`                             |

> 💡 **Flujo típico**: `npm run dev` para probar cambios, `npm run build && npm start` para producción. Si lo dejás corriendo con `./start.sh`, primero hacé `npm run build`.

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

### Local: mantenerlo corriendo con tmux (recomendado)

En Linux/WSL, el monitor sigue vivo aunque cerrés la terminal si lo corrés dentro de **tmux**:

```bash
# Una sola vez: arrancar en sesión tmux desacoplada
./start.sh

# Revisar que está corriendo
tmux has-session -t job-monitor && echo "Running" || echo "Stopped"

# Para ver logs en vivo
tmux attach -t job-monitor
# (Ctrl+B, d para desacoplarte sin matar el proceso)
```

> 💡 **Auto-start al abrir terminal**: agregá `~/job-monitor/start.sh` al final de tu `.bashrc` y el monitor arranca solo cada vez que abrís una terminal. Si ya está corriendo, no hace nada.

## Licencia

MIT
