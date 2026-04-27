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

# Install build tools for native modules (sqlite3) + Docker CLI + curl for Railpack
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 make g++ \
      ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli && \
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
