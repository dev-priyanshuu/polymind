# PolyMind 🧠

**Multi-LLM Validation & Intelligence Platform**

> "Stop trusting one AI. Validate with many."

PolyMind sends your prompt to multiple AI models simultaneously, then has a "chef" model synthesize the best answer — showing exactly where models agree, disagree, and contradict each other.

---

## Phase 1 — Foundation (Weeks 1–10)

### What's built

| Feature | Status |
|---|---|
| Unified API Gateway (6 providers) | ✅ |
| Parallel fan-out with `asyncio.gather` | ✅ |
| SSE streaming to frontend | ✅ |
| Side-by-side streaming response panes | ✅ |
| Chef Aggregator (verified/disputed/unverified) | ✅ |
| Confidence scoring | ✅ |
| Markdown rendering in panes | ✅ |
| Per-model cost + latency tracking | ✅ |
| Copy response button | ✅ |
| Shareable session URLs | ✅ |
| PostgreSQL session persistence | ✅ |
| AES-256 encrypted API key storage | ✅ |
| Landing page | ✅ |

### Providers supported

| Provider | Model |
|---|---|
| OpenAI | GPT-4o |
| Anthropic | Claude Sonnet 4.5 |
| Google | Gemini 2.0 Flash |
| xAI | Grok 3 |
| Cohere | Command R+ |
| Mistral | Mistral Large |

---

## Project Structure

```
PolyMind/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── adapters/            # One adapter per LLM provider
│   │   │   ├── base.py
│   │   │   ├── openai_adapter.py
│   │   │   ├── anthropic_adapter.py
│   │   │   ├── google_adapter.py
│   │   │   ├── xai_adapter.py
│   │   │   ├── cohere_adapter.py
│   │   │   └── mistral_adapter.py
│   │   ├── models/              # Pydantic + SQLAlchemy models
│   │   │   ├── llm.py
│   │   │   └── db.py
│   │   ├── routers/             # API routes
│   │   │   ├── completion.py    # /complete, /stream, /chef
│   │   │   ├── sessions.py      # /sessions, /share
│   │   │   └── users.py         # /users, API keys
│   │   └── services/
│   │       ├── gateway.py       # Parallel fan-out engine
│   │       ├── chef.py          # Chef aggregator
│   │       └── encryption.py    # AES-256 key encryption
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── compare/page.tsx     # Main compare UI
│   │   └── globals.css          # Design system
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── PromptInput.tsx
│   │   ├── ResponsePane.tsx
│   │   ├── ResponseGrid.tsx
│   │   └── ChefPanel.tsx
│   ├── lib/
│   │   ├── store.ts             # Zustand state
│   │   └── api.ts               # API client + SSE
│   └── .env.local
│
└── docker-compose.yml           # Postgres + Redis + Backend
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your API keys in .env

# Option A: Docker (recommended)
cd ..
docker compose up -d postgres redis
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Option B: Full Docker
docker compose up
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 3. API Docs

Once backend is running: **http://localhost:8000/docs**

---

## Key Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/complete` | Non-streaming parallel completion |
| POST | `/api/v1/stream` | SSE streaming parallel completion |
| POST | `/api/v1/chef` | Chef aggregator |
| GET | `/api/v1/models` | List supported models |
| GET | `/api/v1/sessions/{id}` | Get session |
| GET | `/api/v1/sessions/share/{token}` | Public shared session |
| POST | `/api/v1/users/{id}/api-keys` | Save encrypted API key |

---

## Tech Stack

- **Backend:** Python 3.12 + FastAPI + asyncio
- **Streaming:** Server-Sent Events (SSE)
- **Database:** PostgreSQL (SQLAlchemy async)
- **Cache:** Redis
- **Frontend:** Next.js 15 + Tailwind CSS + Zustand
- **Encryption:** AES-256 (Fernet)

---

> Phase 2 (Truth Engine + Debate Mode) starts after 20 real users have tested Phase 1.
