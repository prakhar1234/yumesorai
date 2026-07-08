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
RUN npm run build --legacy-peer-deps

# Production stage
FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with legacy peer deps flag
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY prisma ./prisma
COPY .env.production ./

# Set dummy DATABASE_URL for Prisma schema validation (not actually used)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"

# Expose port
EXPOSE 3000

# Start Next.js app
CMD ["npm", "start"]
