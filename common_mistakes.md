# Twenty CRM Self-Hosting — Common Mistakes & Fixes

This document captures every issue encountered during the DAM CRM setup on DigitalOcean. Use this as a reference when setting up Twenty CRM for another organization to avoid repeating these mistakes.

## 1. DigitalOcean Droplet Sizing

**Mistake:** Choosing the $4/month (512MB) or $6/month (1GB) droplet.

**What happens:** Twenty requires at least 2GB RAM. The server runs out of memory during startup and crashes or fails healthchecks.

**Fix:** Use the $12/month droplet (2GB RAM, 1 CPU) minimum. Select Basic > Shared CPU > Regular (SSD).

**Don't confuse:** GPU Droplets (expensive, for AI/ML) with regular Droplets. You want Droplets > Basic > Shared CPU.

---

## 2. Podman/Docker Conflict on Ubuntu

**Mistake:** Running the Twenty install script on a droplet that has podman pre-installed (common on Ubuntu 24.04).

**What happens:** Multiple failures:
- `docker-compose` is outdated or uses podman emulation
- Port binding fails: `docker ps` shows `3000/tcp` instead of `0.0.0.0:3000->3000/tcp`
- DNS resolution fails: server can't resolve hostname `db` (the postgres container)
- iptables DOCKER chain has a blanket DROP rule blocking all traffic
- `conmon` (podman's container monitor) holds ports even after containers are stopped

**Fix:** Before running the Twenty installer, remove podman entirely and install Docker properly:
```bash
# Remove podman and its networking stack
apt-get remove -y podman* containers* conmon* netavark* aardvark*

# Install Docker properly
curl -fsSL https://get.docker.com | sh

# Verify
docker --version
docker compose version
```

**Then** run the Twenty installer:
```bash
bash <(curl -sL https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-docker/scripts/install.sh)
```

---

## 3. Docker Compose Plugin Missing

**Mistake:** Running the install script without Docker Compose v2.

**What happens:** Error: `Docker Compose is not installed or not in PATH` or `Docker Compose is outdated`.

**Fix:** If you installed Docker via `curl -fsSL https://get.docker.com | sh`, Compose v2 is included. If not:
```bash
apt-get install -y docker-compose-plugin
```

---

## 4. Port 3000 Not Exposed to the Internet

**Mistake:** Assuming `docker compose up -d` makes the app publicly accessible.

**What happens:** `curl localhost:3000/healthz` works on the server, but the browser can't reach it.

**Diagnosis:** Run `docker ps` and check the PORTS column:
- Bad: `3000/tcp` (only internal)
- Good: `0.0.0.0:3000->3000/tcp` (publicly accessible)

**Root cause:** Usually the podman/Docker conflict (see #2). Can also be caused by:
- Another process holding port 3000 (check with `ss -tlnp | grep 3000`)
- DigitalOcean cloud firewall blocking port 3000

**Fix:**
```bash
# Kill anything on port 3000
kill $(lsof -t -i:3000) 2>/dev/null

# Restart
docker compose down && docker compose up -d

# Verify
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## 5. SERVER_URL Set to localhost

**Mistake:** Leaving `SERVER_URL=http://localhost:3000` in the `.env` file.

**What happens:** The Twenty frontend loads but shows "Unable to Reach Back-end" because it tries to call the API at `localhost` (the user's browser), not the server.

**Fix:** Set SERVER_URL to the actual public URL:
```bash
# In ~/twenty/.env
SERVER_URL=https://yourdomain.com
# or
SERVER_URL=http://YOUR_IP:3000
```

Always restart after changing .env:
```bash
docker compose down && docker compose up -d
```

---

## 6. Healthcheck Timeout on First Boot

**Mistake:** Not increasing the healthcheck retries for slower servers.

**What happens:** `Container twenty-server-1 Error dependency server failed to start` — the healthcheck times out before the NestJS server finishes booting, especially on 2GB RAM.

**Fix:** In `docker-compose.yml`, increase the server healthcheck retries:
```yaml
healthcheck:
  test: curl --fail http://localhost:3000/healthz
  interval: 5s
  timeout: 5s
  retries: 60  # default is 20, increase for slower servers
```

---

## 7. Domain Setup — Caddy Caddyfile Not Taking Effect

**Mistake:** Installing Caddy but not overwriting the default Caddyfile.

**What happens:** Visiting the domain shows Caddy's default "Congratulations!" page instead of Twenty.

**Fix:** Overwrite the Caddyfile completely:
```bash
echo 'yourdomain.com {
    reverse_proxy localhost:3000
}' > /etc/caddy/Caddyfile

systemctl reload caddy
```

**Important:** Use a subdomain like `crm.yourdomain.com` instead of a subpath like `yourdomain.com/crm`. Twenty doesn't handle subpath routing well.

**DNS requirement:** Add an A record pointing the subdomain to the droplet IP before Caddy can issue an SSL certificate.

---

## 8. Google OAuth — Missing AUTH_GOOGLE_ENABLED

**Mistake:** Setting `MESSAGING_PROVIDER_GMAIL_ENABLED=true` and the client ID/secret, but forgetting `AUTH_GOOGLE_ENABLED=true`.

**What happens:** The "Connect with Google" button never appears in Settings > Accounts. Instead, you only see the IMAP/SMTP manual setup form.

**Fix:** Add to `.env`:
```
AUTH_GOOGLE_ENABLED=true
```

---

## 9. Google OAuth — Docker Compose Env Vars Commented Out

**Mistake:** Adding Google OAuth values to `.env` but not uncommenting them in `docker-compose.yml`.

**What happens:** Same as #8 — no Google connect option. The `.env` values exist but Docker Compose doesn't pass them into the containers because the variable references in `docker-compose.yml` are commented out with `#`.

**Fix:** In `docker-compose.yml`, uncomment these lines under BOTH the `server:` and `worker:` sections:
```yaml
MESSAGING_PROVIDER_GMAIL_ENABLED: ${MESSAGING_PROVIDER_GMAIL_ENABLED}
CALENDAR_PROVIDER_GOOGLE_ENABLED: ${CALENDAR_PROVIDER_GOOGLE_ENABLED}
AUTH_GOOGLE_CLIENT_ID: ${AUTH_GOOGLE_CLIENT_ID}
AUTH_GOOGLE_CLIENT_SECRET: ${AUTH_GOOGLE_CLIENT_SECRET}
AUTH_GOOGLE_CALLBACK_URL: ${AUTH_GOOGLE_CALLBACK_URL}
AUTH_GOOGLE_APIS_CALLBACK_URL: ${AUTH_GOOGLE_APIS_CALLBACK_URL}
```

---

## 10. Google OAuth — Redirect URI Mismatch

**Mistake:** The redirect URI in Google Cloud Console doesn't exactly match what Twenty sends.

**What happens:** `Error 400: redirect_uri_mismatch` when trying to connect Google.

**Fix:** Add these exact URIs in Google Cloud Console > Clients > your OAuth client > Authorized redirect URIs:
```
https://yourdomain.com/auth/google-apis/get-access-token
https://yourdomain.com/auth/google/redirect
```

These must match the `AUTH_GOOGLE_CALLBACK_URL` and `AUTH_GOOGLE_APIS_CALLBACK_URL` in your `.env` exactly.

---

## 11. Google OAuth — Client Secret Not Visible

**Mistake:** Creating an OAuth client in the new Google Auth Platform UI and not copying the secret at creation time.

**What happens:** After creation, the Client Secret is hidden in the new console. There's no obvious way to view it again.

**Fix options:**
1. Look for a download icon on the Credentials page — it downloads a JSON with both ID and secret
2. Delete the client and create a new one — copy the secret from the creation popup immediately
3. In the client details page, look for an eye icon or "Add client secret" button

**Prevention:** Always copy the Client Secret immediately when creating the OAuth client. Google only shows it clearly at creation time.

---

## 12. Google OAuth — Missing API Enablement

**Mistake:** Not enabling the Gmail API and Google Calendar API in the Google Cloud project.

**What happens:** Account connects but sync fails. Server logs show errors like:
```
Google Calendar API has not been used in project XXXXX before or it is disabled
```

**Fix:** Go to Google Cloud Console > APIs & Services > Library and enable:
- Gmail API
- Google Calendar API

Wait 1-2 minutes after enabling before reconnecting.

---

## 13. Google OAuth — Missing Scopes

**Mistake:** Not adding Gmail and Calendar scopes to the OAuth consent screen.

**What happens:** Account connects but sync fails because Twenty doesn't have permission to access Gmail/Calendar data.

**Fix:** In Google Cloud Console > Google Auth Platform > Data access, add these scopes:
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`

---

## 14. Google OAuth — App in Testing Mode Without Test Users

**Mistake:** OAuth app is in "Testing" mode but the user's email isn't added as a test user.

**What happens:** Google refuses the OAuth flow or returns an error saying the app is not approved.

**Fix:** Keep the app in Testing mode (production mode requires Google verification which takes weeks). Add all team members' emails as test users under Audience > Test users.

---

## 15. HTTPS Required for Clipboard

**Mistake:** Accessing Twenty over HTTP (not HTTPS).

**What happens:** "Clipboard requires a secure connection (HTTPS)" error when trying to copy anything.

**Fix:** Set up Caddy for auto-HTTPS (see #7), or as a browser workaround:
```
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```
Add your HTTP URL and restart Chrome.

---

## 16. SSH Command Line Splitting

**Mistake:** Pasting multi-line commands into the SSH terminal.

**What happens:** Long commands get split across lines, causing errors like `sed: no input files` or `grep: invalid option`. The terminal interprets the second line as a separate command.

**Fix:** Either:
- Paste commands as a single line
- Use `nano` to edit files instead of `sed`
- Write commands to a script file and execute it

---

## 17. Vercel/Serverless Won't Work

**Mistake:** Trying to host Twenty on Vercel, Netlify, or similar serverless platforms.

**What happens:** Twenty requires a full Linux server running multiple services simultaneously (app, database, Redis). Serverless platforms can't support this.

**Fix:** Use a VPS: DigitalOcean Droplet ($12/month), Railway, Render, or any provider that gives you a persistent server with Docker support and at least 2GB RAM.

---

## Setup Checklist

Use this checklist when setting up Twenty for a new organization:

```
[ ] Create DigitalOcean Droplet: Ubuntu 22.04/24.04, 2GB RAM, Basic/Regular
[ ] Remove podman: apt-get remove -y podman* containers* conmon* netavark* aardvark*
[ ] Install Docker: curl -fsSL https://get.docker.com | sh
[ ] Run Twenty installer: bash <(curl -sL https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-docker/scripts/install.sh)
[ ] Increase healthcheck retries to 60 in docker-compose.yml
[ ] Set SERVER_URL in .env to public IP or domain
[ ] Verify: curl localhost:3000/healthz returns {"status":"ok"}
[ ] Verify: docker ps shows 0.0.0.0:3000->3000/tcp
[ ] DNS: Add A record pointing domain to droplet IP
[ ] Install Caddy: apt install -y caddy
[ ] Configure Caddyfile with domain + reverse_proxy localhost:3000
[ ] Reload Caddy: systemctl reload caddy
[ ] Verify: https://yourdomain.com loads Twenty
[ ] Google Cloud: Create project, enable Gmail API + Calendar API
[ ] Google Cloud: Create OAuth client (Web Application), copy ID + Secret immediately
[ ] Google Cloud: Add redirect URIs (auth/google/redirect + auth/google-apis/get-access-token)
[ ] Google Cloud: Add Gmail + Calendar scopes in Data access
[ ] Google Cloud: Add team emails as test users (if in Testing mode)
[ ] .env: Set AUTH_GOOGLE_ENABLED=true + all Google OAuth vars
[ ] docker-compose.yml: Uncomment all Google env vars in server AND worker sections
[ ] Restart: docker compose down && docker compose up -d
[ ] Twenty UI: Settings > Accounts > Connect with Google
[ ] Verify sync status is not "failed"
[ ] Create custom fields via API (create_fields.sh)
[ ] Import contacts via API (import_contacts.py)
[ ] Invite team members: Settings > Members
```
