# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite (TypeScript) — `frontend/` |
| Backend | FastAPI (Python) — `backend/` |
| ORM | SQLAlchemy 2 |
| Database | SQLite (`backend/diary.db`) — persists across restarts |
| AI parsing | Anthropic SDK `claude-sonnet-4-20250514` |
| DB Q&A | LangChain SQL Agent (`langchain-anthropic` + `langchain-community`) |
| Charts | Recharts |
| Python env | `uv` (`backend/pyproject.toml`) |

## Running locally

```bash
# Backend
cd backend
cp .env.example .env    # add ANTHROPIC_API_KEY
uv sync
uv run uvicorn main:app --reload --port 8001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # → http://localhost:5173

# Or both at once from repo root:
bash run.sh
```

```bash
# Run frontend tests
cd frontend && npm test

# Run backend tests
cd backend && uv run pytest tests/ -v
```

The SQLite database is created automatically at `backend/diary.db` on first run. `main.py` runs migrations on every startup (safe to re-run): adds `profile_id` and `sex` columns if missing. Profiles are created by users via the UI.

## Architecture

### Profiles
Multi-user support via the `Profile` model. Each `DiaryEntry` has a `profile_id` FK. Profiles have a `sex` field (`"male"` | `"female"`) which controls which NHS daily targets are shown in the summary bar. Active profile is persisted in `localStorage`.

### Chat flow (unified)
`POST /api/chat` receives `{ message, date, profile_id }`. `claude_parser.py` calls Claude with a structured prompt that classifies the message AND parses it in one call. Three intent types:
- `"entry"` → saved to DB under the given profile, confirmation returned + dashboard refresh
- `"edit"` → finds matching entry by name/type/time on the given date, applies field updates
- `"question"` → forwarded to LangChain SQL agent in `langchain_agent.py`, scoped to profile_id

Claude also parses dates from natural language ("yesterday", "last Monday") and returns an `entry_date` in `YYYY-MM-DD` format; the backend uses this instead of the viewed date when present.

### Backend structure
- `main.py` — app factory, CORS, `create_all`, startup migrations
- `config.py` — Pydantic settings (reads `.env`)
- `database.py` — SQLAlchemy engine, `SessionLocal`, `get_db()` dependency
- `models.py` — `Profile`, `DiaryEntry`, `FoodLog`, `DrinkLog`, `ExerciseLog` (all cascade delete)
- `schemas.py` — Pydantic schemas including `DaySummary`, `ChatResponse`, `HistoryResponse`, `ProfileSchema`
- `routes/chat.py` — `POST /api/chat` (classify → parse/edit/query)
- `routes/diary.py` — `GET /api/day`, `GET/PUT/DELETE /api/entry/{id}`, `GET /api/history`
- `routes/profiles.py` — `GET /api/profiles`, `POST /api/profiles`
- `claude_parser.py` — single Claude call returning flat JSON; handles entry/edit/question classification and date parsing
- `langchain_agent.py` — lazy-initialised SQL agent; `query_diary(question, profile_id)` prepends profile scope
- `tests/conftest.py` — pytest fixtures: in-memory SQLite via `StaticPool`, FastAPI test app with overridden `get_db`
- `tests/test_chat_date.py` — tests for date-saving bugs: entry_date fallback, server timezone guard, and "yesterday" relative-date resolution

### Frontend structure
- `src/App.tsx` — root state: `activeProfile`, `currentDate`, `summary`, `activeTab`; loads profiles from API on mount, restores last profile from `localStorage`; `visibilitychange` handler auto-advances `currentDate` to today if the app was left open past midnight
- `src/components/Chat.tsx` — unified chat; passes `profileId` to all API calls
- `src/components/Dashboard.tsx` — Daily Log tab content: SummaryBar + Food/Drink/Exercise sections
- `src/components/SummaryBar.tsx` — NHS daily targets vary by `sex`; progress bars per nutrient
- `src/components/EntryCard.tsx` — inline edit form with all fields including `entry_date`; PUT/DELETE
- `src/components/DateNav.tsx` — prev/next day; uses local date parts (not `toISOString`) to avoid UTC timezone bugs; exports `toLocalDateStr`, `addDays`, `formatDisplay`
- `src/components/ProfileSwitcher.tsx` — pill toggle buttons for profile selection; includes inline form to create new profiles (name + sex)
- `src/components/ChartsTab.tsx` — fetches `/api/history`, renders NutritionChart + ExerciseChart + AlcoholChart; time range selector (7/30/90 days)
- `src/components/charts/NutritionChart.tsx` — Recharts line chart; nutrient selector; Daily vs Weekly avg toggle; NHS reference line
- `src/components/charts/ExerciseChart.tsx` — Recharts stacked bar chart; one colour per exercise type; duration in minutes
- `src/components/charts/AlcoholChart.tsx` — Recharts bar chart; Daily vs Weekly total toggle; 7-day moving average line (daily view only); NHS 14 units/week reference line
- `src/components/__tests__/dateNav.test.ts` — tests for `toLocalDateStr`, `addDays`, `formatDisplay`; includes UTC-shift regression test
- `src/components/__tests__/Chat.test.tsx` — tests that Chat sends the correct `currentDate` to the API
- `src/api/client.ts` — typed fetch wrappers for all endpoints
- `src/types/index.ts` — TypeScript interfaces mirroring Pydantic schemas

Vite proxies `/api/*` → `http://localhost:8001` (configured in `vite.config.ts`).

### NHS daily targets
Used in `SummaryBar.tsx` and `NutritionChart.tsx`. Defined in each component as `NHS_TARGETS.male` / `NHS_TARGETS.female`:

| Metric | Men | Women |
|---|---|---|
| Calories | 2,500 kcal | 2,000 kcal |
| Protein | 55g | 45g |
| Carbs | 300g | 260g |
| Fat | 97g | 78g |
| Fibre | 30g | 30g |
| Alcohol | 14 units/week | 14 units/week |

### Key non-obvious details
- **Startup migrations**: `main.py` uses `inspect(engine)` to check existing columns before running `ALTER TABLE` — safe to run on an existing DB.
- **Edit matching**: `_apply_edit()` in `routes/chat.py` does case-insensitive substring matching on item name, then sorts by time proximity if `search_time` is given, else by most recently created.
- **LangChain scoping**: `query_diary()` prepends `[Restrict all queries to diary_entries rows where profile_id = X]` to the question before passing to the agent.
- **DateNav timezone fix**: `addDays()` uses local year/month/day parts instead of `toISOString()` to avoid UTC shift errors.
- **Stale date fix**: App.tsx listens for `visibilitychange` and advances `currentDate` to today if it has fallen behind (app left open past midnight). Without this, Chat would log entries to the previous day.
- **Weekly avg chart**: groups days into 7-day blocks from start of range, averages non-zero days only per block.
- **Alcohol chart moving average**: computed as a trailing 7-day window (`days.slice(Math.max(0, i-6), i+1)`); early days use a shorter window rather than being null. Only shown in daily view.
- **`DayHistory` includes `alcohol_units`**: the `/api/history` endpoint aggregates `drink_log.alcohol_units` per day, used by `AlcoholChart`.
- **`EntryUpdate` includes `entry_date`**: the `PUT /api/entry/{id}` endpoint accepts `entry_date` (YYYY-MM-DD) to move an entry to a different day.
- **Backend test setup**: uses `StaticPool` so all SQLAlchemy sessions share the same in-memory SQLite connection — required because `:memory:` databases are per-connection by default.
- **Relative date parsing**: `claude_parser.py` always passes `date.today().isoformat()` as `Current date` in the Claude prompt — not the viewed date. This ensures "yesterday" and other relative terms resolve correctly regardless of which date the user is browsing. `default_date` (the viewed date) is kept only as the fallback for `entry_date=null` in `chat.py`. Regression test: `test_parse_message_sends_todays_date_as_current_date_not_viewed_date` in `tests/test_chat_date.py`.
