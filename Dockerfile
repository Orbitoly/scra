FROM node:18-alpine

# Install dependencies for Playwright browsers
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Install Playwright browsers (this step was missing!)
RUN pnpm exec playwright install chromium

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

# Set Playwright environment variables for the non-root user
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
RUN mkdir -p /app/.playwright && chown -R nextjs:nodejs /app/.playwright

USER nextjs

# Expose port
EXPOSE 3000

# Health check using wget (included in Alpine by default)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/scrape || exit 1

# Start the application
CMD ["pnpm", "start"] 