# BIU Scraper

A web scraper service built with Node.js, TypeScript, Express, and Playwright to scrape the BIU Shoham Kabala website.

## Features

- Express.js REST API
- Playwright web scraping with mobile user agent
- Bot challenge detection
- Cookie extraction and curl command generation
- Docker containerization for easy deployment

## API Endpoints

- `GET /scrape` - Scrapes the BIU Shoham Kabala website and returns detailed information including:
  - Final URL
  - HTTP status
  - Bot challenge detection
  - Headers and cookies
  - Generated curl command
  - HTML preview

## Local Development

1. Install dependencies:

```bash
pnpm install
```

2. Run in development mode:

```bash
pnpm dev
```

3. The server will start on `http://localhost:3000`

## Docker Deployment

### Build and run locally:

```bash
docker-compose up --build
```

### Deploy on Coolify

1. **Create a new project** in Coolify
2. **Connect your Git repository** containing this code
3. **Set the deployment method** to "Docker Compose"
4. **Configure environment variables** (optional):

   - `PORT` - Port to run the service (default: 3000)
   - `NODE_ENV` - Environment mode (default: production)

5. **Deploy** - Coolify will automatically build and deploy using the `docker-compose.yml`

### Coolify Configuration

The service is configured with:

- **Health checks** - Ensures the service is running properly
- **Resource limits** - 512MB memory limit, 256MB reservation
- **Automatic restart** - Service restarts if it crashes
- **Security settings** - Configured for Playwright browser execution

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Node environment (default: production)

## Technical Details

- Uses Alpine Linux for smaller image size
- Installs Chromium browser dependencies
- Runs as non-root user for security
- Includes health checks for container orchestration
- Playwright configured to use system Chromium

## Usage Example

```bash
curl http://localhost:3000/scrape
```

Response includes:

- URL and status information
- Bot challenge detection results
- Extracted cookies
- Ready-to-use curl command
- HTML content preview
