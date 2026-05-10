# 🎬 AutoTube Factory — Setup Guide

## ⚡ Quick Start (5 minutes, free)

### 1. Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop/

> Docker is the only thing you need to install. Everything else (Node.js, Python, fonts, TTS) runs inside the container.

---

### 2. Get a Free API Key
You only need **one** key to get started:

| Provider | Free Tier | Get Key |
|---|---|---|
| **Groq** ⚡ (Recommended) | Unlimited on free plan | [console.groq.com](https://console.groq.com) |
| Google AI 🔵 | 15 RPM free | [aistudio.google.com](https://aistudio.google.com) |
| OpenRouter 🌐 | Many free models | [openrouter.ai/keys](https://openrouter.ai/keys) |

> Image generation uses **Pollinations.ai** — completely free, no key needed.  
> Voice generation uses **Edge TTS** — completely free, built-in.

---

### 3. Run the App

**Windows:**
```
Double-click START.bat
```

**Mac/Linux:**
```bash
cp .env.example .env.local
# Edit .env.local and add your GROQ_API_KEY
docker compose up -d --build
```

Then open: **http://localhost:3001**

---

### 4. Create Your First Video

1. Click **"🎬 New Video"** in the top nav
2. Enter a topic title (e.g. "How to Start Dropshipping in 2025")
3. Enter a target audience (e.g. "Beginners aged 18-30")
4. Click **"🚀 Generate Asset Pack"**
5. Wait ~60–90 seconds
6. Download your ZIP (script, image prompts, voiceover, thumbnail, subtitles)

---

## 🔧 Optional Integrations

Add these to `.env.local` to enable extra features:

### Airtable — Export run data to a spreadsheet
```
AIRTABLE_API_KEY=patXXX...
AIRTABLE_BASE_ID=appXXX...
AIRTABLE_RUNS_TABLE_ID=tblXXX...
AIRTABLE_ASSETS_TABLE_ID=tblXXX...
AIRTABLE_PROMPTS_TABLE_ID=tblXXX...
```
Get a token at: [airtable.com/create/tokens](https://airtable.com/create/tokens)

### Notion — Create a page per project
```
NOTION_API_KEY=ntn_...
NOTION_PARENT_PAGE_ID=<32-char page ID from URL>
```
Create integration at: [notion.so/my-integrations](https://www.notion.so/my-integrations)

### Slack — Notifications when projects complete
```
SLACK_BOT_TOKEN=xoxb-...     ← Must start with xoxb- (Bot Token), NOT xapp-
SLACK_CHANNEL_ID=C0XXXXXXX
```
Create app at: [api.slack.com/apps](https://api.slack.com/apps) → OAuth & Permissions → `chat:write` scope

### AWS Bedrock — Claude Sonnet, Nova, Llama
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6
```
> ⚠️ Region must be `us-east-1` for cross-region inference profiles (`us.anthropic.*`)

### Perplexity — Real-time web search for Research step
```
PERPLEXITY_API_KEY=pplx-...
```
Get at: [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)

---

## 🔄 Applying Changes to `.env.local`

After editing `.env.local`, restart the container:
```bash
docker compose down && docker compose up -d
```
> ⚠️ `docker compose restart` does NOT re-read `.env.local` — always use `down && up`.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| "No projects generating" | Check that your API key is set in `.env.local` |
| Slack not working | Token must start with `xoxb-` not `xapp-` |
| AWS errors | Make sure `AWS_REGION=us-east-1` (not eu-west) |
| Port 3001 in use | Change `"3001:3001"` to `"3002:3001"` in `docker-compose.yml` |
| View live logs | `docker compose logs -f` |
| Rebuild from scratch | `docker compose down && docker compose up -d --build` |

---

## 📁 Project Structure

```
autotube-factory/
├── START.bat            ← Windows one-click launcher
├── STOP.bat             ← Windows one-click stopper
├── docker-compose.yml   ← Container config
├── .env.example         ← Template — copy to .env.local
├── .env.local           ← Your keys (never commit this!)
├── app/                 ← Next.js pages and API routes
├── lib/                 ← AI providers, integrations, pipeline
└── prisma/              ← Database schema and migrations
```

---

## 🛑 Stopping the App

**Windows:** Double-click `STOP.bat`

**Mac/Linux:**
```bash
docker compose down
```
