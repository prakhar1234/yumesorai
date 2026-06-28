#!/bin/bash
set -e

echo "Starting application..."
echo "Running Prisma migrations..."
npx prisma migrate deploy --skip-generate

echo "Starting Next.js server..."
npm start
