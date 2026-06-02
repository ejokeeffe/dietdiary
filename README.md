# Health Diary

A personal health tracking app you talk to. Log food, drink, exercise, weight, and health events by typing plain English — Claude figures out what you mean, estimates nutritional values, and stores structured data. Ask questions about your diary and get answers back in plain English. View trends on an interactive charts dashboard.

No forms to fill in. No menus to navigate. Just type.

## Features

**Natural language logging** — describe what you ate, drank, or did. Claude parses nutritional values, alcohol units, exercise stats, and dates automatically. Relative dates like "yesterday" and "last Monday" resolve correctly even when you're browsing a past date.

**Five entry types:**
- **Food** — calories, protein, carbs, fat, fibre, sugar estimated from your description
- **Drink** — calories and alcohol units calculated from volume and ABV
- **Exercise** — type, duration, distance, and estimated calories burned
- **Weight** — accepts kg, lbs, or stone; stored and displayed in all three
- **Health events** — log injuries and illnesses with optional severity (1–5) and end date; tracked as active spans across your charts

**Inline editing** — edit or delete any entry from the daily log, including moving it to a different date.

**Multi-profile support** — separate diary data and NHS targets per person; active profile persisted in the browser.

**NHS daily targets** — progress bars for calories, protein, carbs, fat, and fibre, adjusted by sex.

**Charts dashboard** — visualise trends over 7, 30, or 90 days:
- Nutrition — per-nutrient line chart, daily vs. weekly average toggle, NHS reference line
- Exercise — stacked bar chart by type; injury and illness periods shaded as coloured overlays
- Alcohol — daily/weekly bar chart, 7-day moving average, NHS 14 units/week reference
- Weight — line chart with kg and stone/lbs on hover
- Health timeline — Gantt-style view showing injuries and illnesses as proportional spans with severity and duration

**Natural language Q&A** — ask anything about your diary ("how many calories did I eat last week?", "what was my average protein in May?") answered via a LangChain SQL agent scoped to your profile.

## Example chat input

```
Had porridge with banana for breakfast around 8am
30 min run, 4.5km
Can of Guinness 440ml
I'm 11 stone 8 today
I twisted my ankle this morning, severity 3
Been ill with flu since Monday, severity 4
My ankle injury ended yesterday
Actually my porridge was 400 calories
How many calories did I eat this week?
What was my longest run last month?
```

## Tooling, Languages & External Services

| Tool / Service | Type | Architecture Layer |
|---|---|---|
| **Python 3.12+** | Language | Backend |
| **TypeScript** | Language | Frontend |
| **FastAPI** | Web framework | Backend API server |
| **SQLAlchemy 2** | ORM | Backend data access |
| **SQLite** | Database | Persistence (`backend/diary.db`) |
| **Pydantic** | Schema validation | Backend request/response models |
| **uv** | Python package manager | Backend tooling |
| **React 19** | UI framework | Frontend |
| **Vite** | Build tool / dev server | Frontend tooling |
| **Recharts** | Charting library | Frontend charts dashboard |
| **Anthropic Claude API** (`claude-sonnet-4-20250514`) | External AI API | NL parsing & intent classification (`claude_parser.py`) |
| **LangChain LCEL** | AI orchestration framework | Prompt chaining in `claude_parser.py` |
| **LangChain SQL Agent** (`langchain-community`) | AI agent | Natural language → SQL query execution (`langchain_agent.py`) |
| **`langchain-anthropic`** | LangChain integration | Connects LangChain agents to Claude API |
| **pytest** | Test framework | Backend tests |
| **Vitest** | Test framework | Frontend tests |

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite (TypeScript) |
| Backend | FastAPI (Python) |
| ORM | SQLAlchemy 2 |
| Database | SQLite (`backend/diary.db`) |
| AI parsing | `claude-sonnet-4-20250514` via LangChain LCEL |
| DB Q&A | LangChain SQL Agent (`langchain-anthropic` + `langchain-community`) |
| Charts | Recharts |
| Python env | `uv` |

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

The SQLite database (`backend/diary.db`) is created automatically on first run. Startup migrations run safely on every boot — safe to run against an existing database.

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
┌─────────────────────────────────────────┐
│             Browser (React)             │
│  ProfileSwitcher · DateNav · Chat       │
│  Dashboard · ChartsTab                  │
└──────────────────┬──────────────────────┘
                   │ HTTP (Vite proxy /api → :8001)
┌──────────────────▼──────────────────────┐
│             FastAPI Backend             │
│  routes/chat.py                         │
│  routes/diary.py                        │
│  routes/profiles.py                     │
└──────┬────────────────┬─────────────────┘
       │                │
┌──────▼──────┐  ┌──────▼──────────────────┐
│claude_parser│  │   langchain_agent.py    │
│  (LangChain │  │   (LangChain SQL Agent) │
│   + Claude) │  └─────────────────────────┘
└─────────────┘          │
       │                 │
┌──────▼─────────────────▼─────────────────┐
│              SQLite  (diary.db)           │
│  profiles · diary_entries                 │
│  food_log · drink_log · exercise_log      │
│  weight_log · health_event_log            │
└───────────────────────────────────────────┘
```

### Data model

Each `DiaryEntry` has a `profile_id`, `entry_date`, `entry_time`, and `entry_type`. A child row in the corresponding detail table holds the structured data. All child rows cascade-delete with their parent entry.

| Entry type | Detail table | Key fields |
|---|---|---|
| `food` | `food_log` | item_name, calories, protein, carbs, fat, fibre, sugar |
| `drink` | `drink_log` | item_name, quantity_ml, calories, is_alcoholic, alcohol_units |
| `exercise` | `exercise_log` | exercise_type, duration_minutes, distance_km, calories_burned |
| `weight` | `weight_log` | weight_kg |
| `health` | `health_event_log` | event_type (injury/illness), description, severity (1–5), end_date |

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
INSERT diary_entries + detail row (food_log / drink_log / ...)
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
  2. Filter by item name / description (case-insensitive substring match)
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
```

---

## Multi-profile support

Profiles are stored in the `profiles` table with a `sex` field (`male` | `female`). The active profile is persisted in `localStorage`. All diary entries, queries, and NHS daily targets are scoped to the active profile.

NHS targets by sex:

| Metric | Men | Women |
|---|---|---|
| Calories | 2,500 kcal | 2,000 kcal |
| Protein | 55 g | 45 g |
| Carbs | 300 g | 260 g |
| Fat | 97 g | 78 g |
| Fibre | 30 g | 30 g |
| Alcohol | 14 units/week | 14 units/week |

## License

MIT — see [LICENSE](LICENSE).
