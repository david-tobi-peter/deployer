# ── Stage 1: Build ──
FROM node:22-slim AS build

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ── Stage 2: Runtime ──
FROM node:22-slim

# Copy Docker CLI from official image (more robust than apt-get during builds)
COPY --from=docker:cli /usr/local/bin/docker /usr/local/bin/docker

# Install build tools for native modules (sqlite3) + curl for Railpack
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 make g++ \
      ca-certificates curl git && \
    rm -rf /var/lib/apt/lists/*

# Install Railpack CLI
RUN curl -fsSL https://railpack.com/install.sh | bash

WORKDIR /app

# Copy production dependencies (needs build tools for sqlite3 native addon)
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled output
COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
