# Deployer

A self-hostable, container-orchestrated CI/CD platform that automates application builds and handles dynamic routing.

## 🚀 Overview

Deployer is a standalone, production-ready platform designed to simplify the deployment lifecycle of web applications. It provides an automated build pipeline, container isolation, and a unified gateway for all your services.

### Key Features
- **Idempotency & Version Control**: Ensures only one container exists for a specific GitHub repository at a given commit level. Users can specify any commit hash for targeted builds.
- **Background Pipeline**: The build and deployment automation runs asynchronously in the background, allowing the platform to remain responsive.
- **Event-Driven Monitoring**: Avoids inefficient polling by using Server-Sent Events (SSE) to stream both build logs and container status updates in real-time.
- **Zero-Config Builds**: Leverages Railpack to automatically detect project environments and generate optimized, layered Docker images.
- **Dynamic Gateway**: Integrates Caddy to automatically route traffic from `localhost/d/{id}` to isolated containers without manual port management.
- **Lifecycle Management**: Full control to list, restart, or delete active deployments directly from the dashboard.
- **Persistent Deployment Logs**: Build and runtime logs are stored persistently, ensuring history is available even after system restarts.

---

## 🏗️ Architecture & Philosophy

The platform is built as a multi-container stack orchestrated via Docker Compose:

- **Control Plane**: A TypeScript/Express backbone managing resource lifecycle and Docker orchestration.
- **Build Engine**: A dedicated BuildKit service for concurrent, isolated image construction.
- **Reverse Proxy**: Caddy handles the unified entry point and dynamic service discovery.

### Node.js Best Practices (Error Handling)
The platform strictly follows the [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) for error handling:
- **Operational vs. Programmer Errors**: We differentiate between expected failures (like a failed build) and unexpected system crashes.
- **Graceful Shutdown**: Upon encountering an uncaught exception, the API performs a graceful exit. Because the state of a single-threaded JS application becomes unpredictable after such errors, we rely on Docker's restart policies to bring the service back to a clean, known-good state.
- **Comprehensive Error Handling**: Every stage of the pipeline is wrapped in robust error catch blocks with automated log capture.

---

## 🛡️ Technical Deep Dive

### Dynamic Routing
Caddy uses `path_regexp` to map incoming requests (e.g., `/d/deploy-xyz/*`) to the corresponding container name on the internal `deployer-net`. This removes the need for host-level port exposure and provides a seamless URL structure for all apps.

### Build Stability
To ensure reliable dependency fetching (NPM, etc.) on any network, the BuildKit service is configured with `networkMode = "host"`, and various protocol timeouts (`MISE_HTTP_TIMEOUT`) are tuned for robustness.

---

## 🛠️ Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 22+

### Quick Start
1. **Prepare Environment**:
   ```bash
   cp sample.env .env
   ```

2. **Launch Stack**:
   ```bash
   docker compose up --build -d
   ```

3. **Deploy an App**:
   Navigate to [http://localhost](http://localhost), paste a Git URL, and watch the event-streamed pipeline handle the rest.
