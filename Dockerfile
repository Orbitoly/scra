FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package manager files
COPY package.json pnpm-lock.yaml ./

# Install PNPM + project deps
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Force playwright browser install in correct path
RUN PLAYWRIGHT_BROWSERS_PATH=/app/.playwright \
    pnpm exec playwright install --with-deps chromium

# Copy rest of source
COPY . .

# Create writable path for browsers
RUN mkdir -p /app/.playwright && chown -R 1001:1001 /app/.playwright

# Create non-root user and switch
RUN adduser --disabled-password --gecos "" nextjs && \
    chown -R nextjs:nextjs /app
USER nextjs

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run app
CMD ["pnpm", "start"]
