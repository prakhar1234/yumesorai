# Build stage
FROM node:20 AS builder

WORKDIR /app

# Set SMTP configuration for build time (needed by Next.js)
ENV SMTP_HOST="smtpout.secureserver.net"
ENV SMTP_PORT="465"
ENV SMTP_SECURE="true"
ENV SMTP_USER="team@yumesorai.com"
ENV SMTP_PASSWORD="yumesorai@123"

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Add build timestamp to ensure fresh build on each deployment
RUN echo "Build timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')" > /tmp/build-info.txt

# Build Next.js app
RUN npm run build --legacy-peer-deps || (echo "Build failed!" && exit 1)

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

# Verify build artifacts exist
RUN if [ ! -d "./.next" ]; then echo "ERROR: .next folder not found!" && exit 1; fi
RUN if [ ! -f "./.next/BUILD_ID" ]; then echo "ERROR: .next/BUILD_ID not found!" && exit 1; fi
RUN echo "Build verification passed. Next.js app ready for deployment."

# Set Node environment to production
ENV NODE_ENV=production

# Set dummy DATABASE_URL for Prisma schema validation (not actually used)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"

# JWT Authentication Secret for Maestro Admin System
# This can be overridden by Railway environment variables
ENV JWT_SECRET="maestro_prod_secret_minimum_32_characters_long_key_123456"

# SMTP Email Configuration (GoDaddy)
ENV SMTP_HOST="smtpout.secureserver.net"
ENV SMTP_PORT="465"
ENV SMTP_SECURE="true"
ENV SMTP_USER="team@yumesorai.com"
ENV SMTP_PASSWORD="yumesorai@123"

# Expose port
EXPOSE 3000

# Start Next.js app
CMD ["npm", "start"]
