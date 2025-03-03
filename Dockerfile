# ========================================
# Base Image with Dependencies
# ========================================
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies needed for the app and build process
RUN apk add --no-cache libc6-compat curl bash

# Install pnpm globally using npm
RUN npm install -g pnpm

# ========================================
# Install Dependencies
# ========================================
FROM base AS deps

# Copy package manager files for caching
COPY package.json pnpm-lock.yaml ./

# Set pnpm store directory for consistency
RUN pnpm config set store-dir /app/.pnpm-store

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# ========================================
# Build Stage
# ========================================
FROM base AS build

# Set NODE_ENV (default to production)
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the entire project
COPY . .

# Install ts-node globally (needed for build script)
RUN npm install -g ts-node

# Generate Supabase types (tolerate failures)
RUN pnpm run types || echo "Skipping Supabase types generation (for now)."

# Build the Next.js application
RUN pnpm build

# ========================================
# Production Image
# ========================================
FROM base AS runner

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# Copy built assets and dependencies
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Set ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose Next.js port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]