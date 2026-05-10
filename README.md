# 🎬 AutoTube Factory

Automated YouTube video asset generator — research, script, scenes, image prompts, and voiceover in one pipeline.

---

## 🚀 Quick Start (Docker — Recommended)

> **No coding knowledge required.** Just Docker Desktop + your AWS credentials.

### Step 1 — Install Docker Desktop

Download and install: https://www.docker.com/products/docker-desktop/

After installing, start Docker Desktop and wait until the whale icon in the system tray is green ("Docker Desktop is running").

---

### Step 2 — Set up your credentials

1. Copy the example env file:
   - Duplicate `.env.example` and rename it to `.env.local`
   - Open `.env.local` in Notepad (right-click → Open with → Notepad)

2. Fill in your AWS credentials:
```
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6
```

3. Optionally add free API keys (the app works without them — Bedrock covers everything):
   - `GROQ_API_KEY` — free at https://console.groq.com
   - `GOOGLE_AI_KEY` — free at https://aistudio.google.com
   - `UNSPLASH_ACCESS_KEY` — free at https://unsplash.com/developers

---

### Step 3 — Run the app

**Double-click `START.bat`** — that's it.

The first run downloads and builds the app (~2 minutes). On every subsequent run it starts in seconds.

The app will open automatically at: **http://localhost:3001**

---

### Stopping the app

**Double-click `STOP.bat`** or press `Ctrl+C` in the terminal window.

---

## 🖥️ Manual Docker Commands

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and delete all data
docker compose down -v
```

---

## 🛠️ Local Development (for developers)

Requirements: Node.js 20+, npm

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Start dev server
npm run dev
```

App runs at http://localhost:3001

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | ✅ | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS secret key |
| `AWS_REGION` | ✅ | e.g. `us-east-1` |
| `BEDROCK_MODEL_ID` | ✅ | `us.anthropic.claude-sonnet-4-6` |
| `GROQ_API_KEY` | Optional | Free at console.groq.com |
| `GOOGLE_AI_KEY` | Optional | Free at aistudio.google.com |
| `OPENROUTER_API_KEY` | Optional | Free tier at openrouter.ai |
| `UNSPLASH_ACCESS_KEY` | Optional | Free stock photos |
| `PEXELS_API_KEY` | Optional | Free stock photos |

Full list in `.env.example`.

---

## 📁 Project Structure

```
autotube-factory/
├── START.bat          ← Double-click to start (Windows)
├── STOP.bat           ← Double-click to stop (Windows)
├── .env.local         ← Your secrets (create from .env.example)
├── .env.example       ← Template — copy and fill in
├── Dockerfile
├── docker-compose.yml
├── app/               ← Next.js pages & API routes
├── lib/               ← AI, LLM router, Bedrock client
└── prisma/            ← Database schema & migrations
```

---

## 🤖 AI Models

The app uses **AWS Bedrock Claude Sonnet 4.6** by default. It also supports:

- **Groq** (ultra-fast, free tier)
- **Google Gemini** (free tier)
- **OpenRouter** (100+ models, free tier)
- **Ollama** (fully local, no API key)
- **LM Studio** (local GUI)

Configure providers in the app at **Settings → AI Models**.

---

## 🆘 Troubleshooting

**Docker not found / "docker is not recognized"**
→ Install Docker Desktop and make sure it's running before double-clicking START.bat

**Port 3001 already in use**
→ Run `docker compose down` then try again, or change the port in `docker-compose.yml`

**AWS auth error**
→ Check your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env.local`

**App shows blank page after starting**
→ Wait 20 seconds and refresh — the database migration runs on first startup
