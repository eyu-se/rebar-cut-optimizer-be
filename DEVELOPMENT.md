# Backend Development Guide

This document outlines the setup, execution, and deployment processes for the Rebar Cut Optimizer backend.

## 1. Local Development Setup

To run the server locally using Node.js:

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Environment Variables**:
   Ensure you have a `.env` file based on any required configurations (e.g., `DATABASE_URL`, `JWT_SECRET`, `PORT`).
3. **Start the development server**:
   ```bash
   npm run dev
   ```
   This will run `tsx watch src/server.ts` with hot-reloading.
4. **Build for production**:
   ```bash
   npm run build
   ```

## 2. Docker Local Setup

To run the backend application using Docker locally:

1. **Build the Docker Image**:
   ```bash
   docker build -t rebar-cut-optimizer-be:local .
   ```
2. **Run the Image**:
   ```bash
   docker run -p 5000:5000 -e NODE_ENV=production -e JWT_SECRET=your_dev_secret rebar-cut-optimizer-be:local
   ```

Alternatively, using the provided `docker-compose.yml` (which pulls the built image from GitHub Container Registry):
```bash
export GITHUB_REPOSITORY_OWNER="yourusername"
docker-compose up -d
```

## 3. GitHub Actions & Server Deployment Setup

This repository uses GitHub Actions (`.github/workflows/deploy.yml`) to automatically build and deploy to your VPS.

### On GitHub (Secrets Configuration)
Add the following **Repository Secrets** in your GitHub repository settings (`Settings` > `Secrets and variables` > `Actions`):

- `VPS_HOST`: The IP address of your Ubuntu server.
- `VPS_USERNAME`: The SSH username (e.g., `root`, `ubuntu`).
- `VPS_SSH_KEY`: The private SSH key for server access.

The action automatically handles pushing to `ghcr.io` through your repository's default token.

### On Server (Deployment Operations)
The workflow handles the server deployment automatically on pushing to `main` or `master`. The actions performed on the server through SSH are:
1. Creates the directory `~/rebar-cut-backend`.
2. Generates a `docker-compose.yml` file locally on the server that:
   - Exposes port 5000 (`5000:5000`).
   - Mounts a SQLite data volume `sqlite_data:/app/data` to ensure persistent database storage.
   - Sets environment variables including `NODE_ENV`, `PORT`, `DATABASE_URL`, and `JWT_SECRET`.
3. Pulls the latest Docker image from the GitHub Container Registry (`ghcr.io`).
4. Re-creates the container (`docker-compose up -d`) and prunes old unused Docker images.

Ensure that the target VPS has `docker` and `docker-compose` installed. The SQLite database will persist across deployments thanks to the configured Docker volumes.
