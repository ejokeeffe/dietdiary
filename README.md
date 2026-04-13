# Food & Exercise Diary

A personal health diary with AI-powered natural language entry logging, editing, and querying.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite (TypeScript) |
| Backend | FastAPI (Python) |
| Database | SQLite via SQLAlchemy 2 |
| AI parsing | Anthropic Claude (`claude-sonnet-4-20250514`) |
| DB Q&A | LangChain SQL Agent |
| Charts | Recharts |

---

## Running locally

### Prerequisites
- Python with `uv` installed
- Node.js

### Setup

```bash
# 1. Clone the repo, then set up the backend environment
cd backend
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

uv sync

# 2. Start the backend (port 8001)
uv run uvicorn main:app --reload --port 8001

# 3. In a separate terminal, start the frontend (port 5173)
cd frontend
npm install
npm run dev
```

Or run both at once from the repo root:

```bash
bash run.sh
```

Open [http://localhost:5173](http://localhost:5173).

The SQLite database (`backend/diary.db`) is created automatically on first run. Startup migrations run safely on every boot.

### Running tests

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && uv run pytest tests/ -v
```

---

## Architecture

### Overview

```
┌─────────────────────────────────────┐
│           Browser (React)           │
│  ProfileSwitcher · DateNav · Chat   │
│  Dashboard · ChartsTab              │
└────────────────┬────────────────────┘
                 │ HTTP (Vite proxy /api → :8001)
┌────────────────▼────────────────────┐
│           FastAPI Backend           │
│  routes/chat.py                     │
│  routes/diary.py                    │
│  routes/profiles.py                 │
└──────┬──────────────┬───────────────┘
       │              │
┌──────▼──────┐ ┌─────▼──────────────┐
│claude_parser│ │ langchain_agent.py │
│  (Anthropic │ │  (LangChain SQL    │
│   Claude)   │ │   Agent)           │
└─────────────┘ └────────────────────┘
       │              │
┌──────▼──────────────▼───────────────┐
│         SQLite  (diary.db)          │
│  profiles · diary_entries           │
│  food_log · drink_log · exercise_log│
└─────────────────────────────────────┘
```

### Data model

Each `DiaryEntry` row has a `profile_id`, `entry_date`, `entry_time`, and `entry_type` (`food` | `drink` | `exercise`). A child row in `food_log`, `drink_log`, or `exercise_log` holds the detail. All child rows cascade-delete with their parent entry.

---

## Chat flows

All user messages go through `POST /api/chat`. Claude classifies the intent in a single call, then the backend routes accordingly.

### Adding an entry

```
User types message
        │
        ▼
POST /api/chat  { message, date, profile_id }
        │
        ▼
claude_parser.py  ─── Claude API ───►  { type: "entry",
        │                                entry_type, entry_date,
        │                                item_name, calories, ... }
        ▼
chat.py resolves entry_date
  • If Claude returned a date  → use it
  • Otherwise                  → use the viewed date from the request
        │
        ▼
INSERT diary_entries + food_log / drink_log / exercise_log
        │
        ▼
ChatResponse { type: "entry", confirmation, entry }
        │
        ▼
Frontend refreshes the day summary
```

**Key detail:** Claude always receives today's actual date as `Current date` (not the viewed date), so relative terms like "yesterday" resolve correctly even when the user is browsing a past date.

---

### Editing an entry

```
User types e.g. "actually my porridge was 500 calories"
        │
        ▼
POST /api/chat  { message, date, profile_id }
        │
        ▼
claude_parser.py  ─── Claude API ───►  { type: "edit",
        │                                search_entry_type: "food",
        │                                search_item: "porridge",
        │                                search_time: null,
        │                                updates: { calories: 500 } }
        ▼
_apply_edit() in chat.py:
  1. Query diary_entries for the viewed date + entry_type
  2. Filter by item name (case-insensitive substring match)
  3. If search_time given → pick closest time match
     Otherwise           → pick most recently created
  4. Apply field updates to the child log row
  5. If updates include entry_date → move entry to that day
        │
        ▼
UPDATE committed to DB
        │
        ▼
ChatResponse { type: "edit", confirmation, entry }
        │
        ▼
Frontend refreshes the day summary
```

---

### Asking a question

```
User types e.g. "how many calories did I eat this week?"
        │
        ▼
POST /api/chat  { message, date, profile_id }
        │
        ▼
claude_parser.py  ─── Claude API ───►  { type: "question" }
        │
        ▼
langchain_agent.py
  • Prepends: "Restrict all queries to diary_entries rows
               where profile_id = <id>"
  • LangChain SQL Agent generates + runs SQL against diary.db
  • Returns natural language answer
        │
        ▼
ChatResponse { type: "answer", answer: "You ate 1,840 kcal on average..." }
        │
        ▼
Frontend displays answer in chat (no dashboard refresh)
```

---

## Multi-profile support

Profiles are stored in the `profiles` table with a `sex` field (`male` | `female`). The active profile is persisted in `localStorage`. All diary entries, queries, and NHS daily targets are scoped to the active profile. Targets differ by sex:

| Metric | Men | Women |
|---|---|---|
| Calories | 2,500 kcal | 2,000 kcal |
| Protein | 55 g | 45 g |
| Carbs | 300 g | 260 g |
| Fat | 97 g | 78 g |
| Fibre | 30 g | 30 g |
| Alcohol | 14 units/week | 14 units/week |
