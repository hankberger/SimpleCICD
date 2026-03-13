# Project Understanding & Next Steps

## What This Project Is

A simple CI/CD webhook server (Node.js/Express) that receives GitHub webhooks and triggers deployment scripts. Currently configured to deploy a Portfolio project.

## Current Architecture

- **Server:** `cicd.js` - Express server on port 5000
- **Deploy Script:** `deploy.sh` - Runs git pull, npm install, build, pm2 restart
- **Auth:**
  - GitHub HMAC-SHA256 signature verification via `GITHUB_WEBHOOK_SECRET` env var
  - API key auth via `API_KEY` env var (for phone/automation endpoints)

### Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | None | Health check |
| `/` | GET | None | Redirect to h4nk.com |
| `/webhook` | POST | GitHub Signature | CI/CD trigger (Portfolio) |
| `/webhook/cfa` | POST | GitHub Signature | CI/CD trigger (CreativeFellowshipArtifact) |
| `/minecraft` | GET | API Key | Start Minecraft server |
| `/minecraft/start` | GET | API Key | Start Minecraft server |
| `/minecraft/stop` | GET | API Key | Stop Minecraft server |
| `/minecraft/restart` | GET | API Key | Restart Minecraft server |
| `/minecraft/health` | GET | API Key | Check Minecraft controller health |

### Proxied Services

- **Minecraft Server Controller** at `75.100.4.245:3000` - proxied via `/minecraft/*` routes

## Goal: General Utility/Automation Server

Transform this into a general-purpose automation server that a phone can hit without needing the GitHub webhook secret (which should remain GitHub-only).

## What Needs To Be Done

1. **Add phone-friendly authentication**
   - API key or Bearer token auth (separate from GitHub secret)
   - Store in env var (e.g., `API_KEY`)
   - Middleware to validate on new endpoints

2. **Create new automation endpoints**
   - Generic script runner endpoint
   - Specific action endpoints as needed
   - All protected by the new API key auth

3. **Keep CI/CD separate**
   - `/webhook` stays GitHub-only with signature verification
   - New endpoints use API key auth

## Next Steps

- [x] Add API key authentication middleware
- [x] Add Minecraft server proxy routes
- [ ] Create `/api/run` endpoint for general script execution (if needed)
- [ ] Test phone connectivity
- [ ] Add more proxy routes as needed
