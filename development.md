# DAM CRM — Development Guide

## Architecture Overview

We self-host [Twenty CRM](https://twenty.com) on a DigitalOcean droplet. This gives us all Pro features at a flat $12/month instead of $12/user/month on Twenty's cloud.

| Component | Details |
|-----------|---------|
| CRM URL | https://crm.damfellows.com |
| Server IP | 143.198.25.158 |
| Reverse proxy | Caddy (auto-SSL via Let's Encrypt) |
| Docker services | twenty-server, twenty-worker, postgres:16, redis |
| Twenty version | v1.19.0 |

## Connecting to the server

### SSH access

```bash
ssh root@143.198.25.158
```

Ask Krish for the root password.

### Where things live on the server

| Path | What it is |
|------|-----------|
| `~/twenty/` | Docker Compose setup |
| `~/twenty/.env` | Environment variables (API keys, OAuth, SERVER_URL) |
| `~/twenty/docker-compose.yml` | Service definitions and port mappings |
| `/etc/caddy/Caddyfile` | Reverse proxy config (domain → localhost:3000) |

### Common server commands

```bash
# Check if Twenty is running
cd ~/twenty && docker compose ps

# View server logs
docker compose logs server --tail=50

# View worker logs (sync jobs run here)
docker compose logs worker --tail=50

# Restart Twenty
docker compose down && docker compose up -d

# Restart Caddy (after changing domain config)
systemctl reload caddy
```

## API Access

Twenty exposes REST and GraphQL APIs.

### Getting your API key
1. Log into https://crm.damfellows.com
2. Settings > API & Webhooks > Create API Key

### Key API endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /rest/people` | Create a person record |
| `GET /rest/people` | List people |
| `POST /rest/metadata/fields` | Create custom fields |
| `GET /rest/metadata/objects` | List all objects and their IDs |
| `GET /healthz` | Health check |

### People object ID
`a9b197d4-39ea-4163-8bd4-b9414cd280ea` — needed for creating custom fields.

### Example: Create a person via API

```bash
curl -X POST https://crm.damfellows.com/rest/people \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": {"firstName": "Jane", "lastName": "Doe"},
    "emails": {"primaryEmail": "jane@example.com", "additionalEmails": []},
    "linkedinLink": {"primaryLinkUrl": "https://linkedin.com/in/janedoe", "primaryLinkLabel": "LinkedIn", "secondaryLinks": []},
    "jobTitle": "CEO @ Acme",
    "city": "Boston",
    "contactType": "MENTOR",
    "expertise": ["SALES", "FUNDRAISING"],
    "industry": ["FINTECH"],
    "availability": "NOT_CONTACTED",
    "sourceList": ["A_TIER"]
  }'
```

### Field type reference

| Field | API Type | Values |
|-------|----------|--------|
| contactType | SELECT | MENTOR, ECOSYSTEM_PARTNER, BOTH, INVESTOR |
| expertise | MULTI_SELECT | SALES, MARKETING, TECHNOLOGY, ENGINEERING, FUNDRAISING, INVESTOR, CONNECTIONS, OPERATIONS |
| industry | MULTI_SELECT | FINTECH, HEALTHTECH, MARKETINGTECH, SAAS_TECH, ECOMMERCE_RETAIL, SUSTAINABILITY, CANNABIS, FOOD_BEVERAGE, REAL_ESTATE, CAREER_SERVICES, VENTURE_CAPITAL, CONSULTING, LOGISTICS, OTHER |
| availability | SELECT | NOT_CONTACTED, OUTREACH_ATTEMPTED, AGREED_TO_MENTOR, ACTIVE_MENTOR, TOO_BUSY, CONNECTIONS_ONLY, NOT_STRONG_ENOUGH |
| mentorshipScore | NUMBER | 1-10 |
| founderStage | SELECT | IDEA, PRE_SEED, SEED, SERIES_A_PLUS |
| facilitator | SELECT | KRISH, SEAN, KELLEN, JOAO |
| mentorNotes | TEXT | free text |
| sourceList | MULTI_SELECT | A_TIER, ALUMNI_FOUNDERS, VCS, EXECUTIVES, BIG_TECH, STARTUP_ADJACENT, OTHER_BABSON, SPINELLI_CONNECTS, ACQUIRED_FOUNDERS |

## Google OAuth Setup

Gmail and Calendar integration requires Google Cloud OAuth credentials. These are configured in `~/twenty/.env` and must also be uncommented in `~/twenty/docker-compose.yml` under both `server:` and `worker:` sections.

Required env vars:
```
AUTH_GOOGLE_ENABLED=true
MESSAGING_PROVIDER_GMAIL_ENABLED=true
CALENDAR_PROVIDER_GOOGLE_ENABLED=true
AUTH_GOOGLE_CLIENT_ID=<from Google Cloud Console>
AUTH_GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
AUTH_GOOGLE_CALLBACK_URL=https://crm.damfellows.com/auth/google/redirect
AUTH_GOOGLE_APIS_CALLBACK_URL=https://crm.damfellows.com/auth/google-apis/get-access-token
```

Required Google Cloud APIs: Gmail API, Google Calendar API.

Required OAuth scopes: `gmail.modify`, `gmail.send`, `calendar.events`, `calendar.readonly`.

## Local Project Structure

```
DAMcrm/
├── People/              # Source CSVs + merged_crm.csv (1304 contacts)
├── scripts/
│   ├── create_fields.sh   # Creates all 9 custom fields via API
│   └── import_contacts.py # Imports merged_crm.csv via API
├── development.md       # This file
├── common_mistakes.md   # Setup pitfalls and fixes
└── CLAUDE.md            # AI assistant instructions
```

## Scripts

### create_fields.sh
Creates all 9 custom fields on the People object. Run on the droplet:
```bash
cd ~/twenty
export API_KEY="your_key"
bash create_fields.sh
```

### import_contacts.py
Imports the merged CSV into Twenty. Run on the droplet:
```bash
cd ~/twenty
export API_KEY="your_key"
python3 import_contacts.py
```

## Questions?

Reach out to Krish for server access, API tokens, or help getting set up.
