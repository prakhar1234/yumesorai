# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma schema (needed for runtime)
COPY prisma ./prisma

# Install production dependencies only with legacy peer deps flag
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start Next.js app
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
