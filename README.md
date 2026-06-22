# LabelSpace UI (artist-space-ui)

Artist portal frontend for the LabelSpace platform. Built with Bun, @targoninc/jess, and Chart.js. Serves as the admin panel for artists to manage profiles, tracks, albums, view statistics, request payments, and configure MFA.

## Prerequisites

- [Bun](https://bun.sh) 1.x
- LabelSpace API running (see artist-space-backend)

## Quick Start (Development)

1. Copy the env template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to point to your API:
   ```
   PORT=3050
   API_URL=http://localhost:8090
   ```

3. Install dependencies and start:
   ```bash
   bun install
   bun run start-bun
   ```

## Docker

### Run with full stack (recommended)

From the repository root:

```bash
docker compose up -d
```

Or run just the UI alongside a running API:

```bash
docker compose up -d ui
```

### Build and run standalone

```bash
docker build -t loudar/labelspace-ui .
docker run -p 3050:3050 -e API_URL=http://localhost:8090 loudar/labelspace-ui
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3050) |
| `API_URL` | Yes | URL of the LabelSpace API |
