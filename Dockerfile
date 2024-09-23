# Base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy pnpm-lock.yaml and package.json to install dependencies
COPY pnpm-lock.yaml package.json ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all the project files to the working directory
COPY . .

# Build the Next.js app
RUN pnpm build

# Expose port 3000
EXPOSE 3000

# Start the app using Next.js
CMD ["pnpm", "start"]
