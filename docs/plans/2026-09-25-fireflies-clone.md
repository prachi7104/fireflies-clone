# Fireflies Clone Implementation Plan

> **For agentic workers:** executed inline in one session with superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Backend work is test-first: write the listed test, watch it fail, implement, watch it pass, commit.

**Goal:** Ship a deployed Fireflies.ai clone (meetings library, interactive transcript with a synced player, AI notes, full create/edit/delete) built on Next.js + FastAPI + SQLite, by 09:30 IST on 2026-09-26.

**Architecture:**
- Next.js App Router client pages call a FastAPI REST API (`/api`).
- FastAPI code is layered routers → services → SQLAlchemy models, over one SQLite file with FTS5.
- The backend is the source of truth for parsing, notes, search and business rules.
- Deployed as Vercel (frontend) plus Railway with a persistent volume (backend).

**Tech stack:**
- Python 3.13, FastAPI, SQLAlchemy 2, Pydantic 2 + pydantic-settings, Uvicorn, pytest, httpx.
- Next.js (latest) + TypeScript, Tailwind v4, TanStack Query v5, Radix UI (Dialog, DropdownMenu), sonner, lucide-react, Vitest.

**Spec:** `docs/specs/2026-09-25-fireflies-clone-design.md` (section numbers below refer to it).

## Global constraints

- **Stack is fixed:** Next.js + TypeScript in `frontend/`, FastAPI in `backend/`, SQLite only. No other database, even in production.
- **API:**
  - prefix `/api`;
  - error body `{"detail": "<message>"}`;
  - datetimes are ISO 8601 UTC with `Z` (stored as naive UTC);
  - media positions are integer milliseconds.
- **SQLite pragmas on every connection:** `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL`.
- **Limits:**
  - upload ≤ 1,000,000 bytes;
  - ≤ 5,000 segments;
  - ≤ 50 speakers;
  - speaker name ≤ 80 chars;
  - segment text ≤ 5,000 chars;
  - meeting title 1–200 chars;
  - action-item text 1–500 chars;
  - page size default 20, max 100.
- **Meeting `source` ∈ {`seed`, `upload`, `paste`}.** JSON create → `paste`; file import → `upload`.
- **Status codes:**
  - 401 unknown user;
  - 404 not found or owned by another user;
  - 409 rule conflict;
  - 413 too large;
  - 415 unsupported file type;
  - 422 invalid input or parse error (message names the line).
- **Code rules:**
  - routers hold no business logic;
  - `frontend/src/lib/api.ts` is the only file that calls `fetch`;
  - highlighting never uses `dangerouslySetInnerHTML`.
- **Demo user:** "Jordan Lee", `jordan@orbitlabs.example`. A missing `X-User-Id` header means the demo user.
- **Env vars:**
  - backend: `DATABASE_URL`, `CORS_ORIGINS`, `SEED_ON_STARTUP`, `LLM_PROVIDER`, `GROQ_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT_SECONDS`, `MAX_UPLOAD_BYTES`, `DEFAULT_PAGE_SIZE`;
  - frontend: `NEXT_PUBLIC_API_BASE_URL`.
- **Commits:** plain messages authored by prachi7104. **No `Co-Authored-By` trailers.** Secrets never committed.
- **Windows commands:**
  - backend Python is `backend/.venv/Scripts/python`;
  - macOS/Linux equivalents go in the README.

## Schedule and cut rules

| Checkpoint (IST) | Milestone | Tasks |
|---|---|---|
| 18:20 | M1 Skeletons deployed (Railway volume + Vercel), persistence proven | 1–3 |
| 21:00 | M2 Backend complete: models, parser, notes, meetings, search, action items, seed | 4–10 |
| 00:30 | M3 Frontend core: shell, library, meeting page, create/edit/delete UI | 11–14 |
| 01:45 | M4 Polish, deploy, live walkthrough, README draft | 15–16 |
| 02:00–06:00 | Sleep | — |
| 07:30 | M5 Should-haves, then **feature freeze** | 17–19 |
| 09:30 | M6 Final README, audit, clean-clone test, submit | 20–21 |

**If behind schedule, cut in this order:**
1. nice-to-haves;
2. Task 19;
3. Task 17;
4. Task 18 detail.

**Never cut:** deploy, persistence, sync, create/edit/delete, README.

---

## M1: Skeletons and early deploy

### Task 1: Backend skeleton with health check and persistence proof

**Files:**
- Create:
  - `backend/requirements.txt`, `backend/.python-version`, `backend/pytest.ini`, `backend/railway.json`, `backend/.env.example`
  - `backend/app/__init__.py`, `backend/app/main.py`
  - `backend/app/core/__init__.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/core/time.py`
  - `backend/app/models/__init__.py`, `backend/app/models/app_meta.py`
  - `backend/app/services/__init__.py`, `backend/app/services/meta_service.py`
  - `backend/app/routers/__init__.py`, `backend/app/routers/meta.py`
- Test: `backend/tests/conftest.py`, `backend/tests/test_health.py`

**Interfaces (produces):**
- `app.core.config.Settings`:
  - fields: `database_url: str = "sqlite:///./data/app.db"`, `cors_origins: str = "http://localhost:3000"`, `seed_on_startup: bool = True`, `llm_provider: Literal["none","groq"] = "none"`, `groq_api_key: str | None = None`, `llm_model: str | None = None`, `llm_timeout_seconds: float = 20`, `max_upload_bytes: int = 1_000_000`, `default_page_size: int = 20`;
  - property `cors_origin_list: list[str]`;
  - `model_config = SettingsConfigDict(env_file=".env", extra="ignore")`.
- `app.core.config.get_settings() -> Settings` (cached).
- `app.core.database`:
  - `Base` (DeclarativeBase);
  - `create_db_engine(url: str) -> Engine`: creates the parent dir and sets the pragmas via a `connect` event, with `check_same_thread=False`;
  - `init_db(engine) -> bool`: runs `create_all` plus FTS DDL and returns FTS5 availability.
- `app.core.time`:
  - `utcnow() -> datetime` (naive UTC);
  - `to_utc_naive(dt: datetime) -> datetime`;
  - `UTCDateTime`: an annotated datetime that serialises as `...Z`.
- `app.services.meta_service`: `get_meta(db, key) -> str | None`, `set_meta(db, key, value) -> None`, `increment_boot_count(db) -> int`.
- `app.main.create_app(settings: Settings | None = None) -> FastAPI`:
  - sets `app.state.settings`, `app.state.engine`, `app.state.SessionLocal`, `app.state.fts5_enabled`;
  - the lifespan runs init_db and increments the boot count (seeding is added in Task 10);
  - disposes the engine on shutdown.
- `GET /api/health` → `{"status":"ok","database":"ok","fts5":bool,"llm_provider":str,"boot_count":int}`.

- [ ] **Step 1: Create the venv and pin dependencies.**
  - `cd backend && py -3.13 -m venv .venv`
  - `.venv/Scripts/python -m pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings python-multipart httpx pytest`
  - Write top-level `==` pins (from `pip freeze`) into `requirements.txt`.
  - Set `.python-version` to `3.13`.
  - `pytest.ini`:
    ```ini
    [pytest]
    testpaths = tests
    pythonpath = .
    addopts = -q
    ```
- [ ] **Step 2: Write the failing tests.**
```python
# backend/tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.core.config import Settings
from app.main import create_app

@pytest.fixture
def settings(tmp_path):
    return Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        seed_on_startup=False,
        llm_provider="none",
        groq_api_key=None,
        cors_origins="http://localhost:3000",
    )

@pytest.fixture
def app(settings):
    return create_app(settings)

@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c

@pytest.fixture
def db(client):
    session = client.app.state.SessionLocal()
    try:
        yield session
    finally:
        session.close()
```
```python
# backend/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import create_app

def test_health_reports_database_and_fts(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["fts5"] is True
    assert body["llm_provider"] == "none"
    assert body["boot_count"] == 1

def test_boot_count_survives_restart_on_same_database(settings):
    with TestClient(create_app(settings)) as first:
        assert first.get("/api/health").json()["boot_count"] == 1
    with TestClient(create_app(settings)) as second:
        assert second.get("/api/health").json()["boot_count"] == 2

def test_cors_allows_configured_origin(client):
    res = client.options("/api/health", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
```
- [ ] **Step 3: Run the tests** (`.venv/Scripts/python -m pytest`). Expected: FAIL (module `app.main` not found).
- [ ] **Step 4: Implement.**
  - Pragmas via `@event.listens_for(engine, "connect")`.
  - FTS DDL, executed with `exec_driver_sql` inside `init_db` after `Base.metadata.create_all`. The FTS table itself is created in Task 4 once `transcript_segments` exists. For now `init_db` only probes FTS5 with `CREATE VIRTUAL TABLE temp.fts5_probe USING fts5(x)` followed by `DROP TABLE temp.fts5_probe`, returning `True` or `False`.
  - CORS: `CORSMiddleware(allow_origins=settings.cors_origin_list, allow_methods=["*"], allow_headers=["*"])`.
  - Health runs `SELECT 1`.
  - `railway.json`:
    ```json
    {"$schema":"https://railway.com/railway.schema.json","deploy":{"startCommand":"uvicorn app.main:create_app --factory --host 0.0.0.0 --port $PORT","healthcheckPath":"/api/health","healthcheckTimeout":60,"restartPolicyType":"ON_FAILURE"}}
    ```
  - `.env.example` lists every backend env var with safe defaults and `GROQ_API_KEY=` empty.
- [ ] **Step 5: Run the tests.** Expected: 3 passed. Also check `.venv/Scripts/python -m uvicorn app.main:create_app --factory --port 8000`: `http://localhost:8000/api/health` should return the JSON and `/docs` should load.
- [ ] **Step 6: Commit** with `git add backend && git commit -m "feat(backend): FastAPI skeleton with SQLite, health check and CORS"`.

**Done when:** the tests pass, the local server serves `/api/health` and `/docs`, and there are no secrets in the repo.
**Failure / recovery:**
- `fts5 false` locally: verified earlier that FTS5 is present, so re-check the Python interpreter used.
- Pydantic-settings `.env` interference: the tests pass explicit kwargs.

### Task 2: Frontend skeleton wired to the API

**Files:**
- Create: `frontend/` (create-next-app), `frontend/.env.example`, `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts` (Health only for now), `frontend/vitest.config.ts`
- Modify: `frontend/src/app/page.tsx` (temporary health panel)

**Interfaces (produces):**
- `API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"`
- `class ApiError extends Error { status: number; detail: string }`
- `apiFetch<T>(path: string, options?: { method?: "GET"|"POST"|"PATCH"|"DELETE"; json?: unknown; formData?: FormData; query?: Record<string, string | number | string[] | number[] | undefined | null> }): Promise<T>`:
  - always sends `X-User-Id: 1`;
  - JSON bodies get `Content-Type: application/json`;
  - `204` → `undefined`;
  - non-2xx → `ApiError` carrying the `detail` from the body.
- `getHealth(): Promise<Health>`

- [ ] **Step 1: Create the app.** From the repo root:
  ```bash
  npx create-next-app@latest frontend --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes
  ```
  If it created `frontend/.git`, remove it so the repo stays single.
- [ ] **Step 2: Install libraries.**
  - `npm i @tanstack/react-query sonner lucide-react @radix-ui/react-dialog @radix-ui/react-dropdown-menu clsx`
  - `npm i -D vitest`
- [ ] **Step 3: Write `api.ts` and a temporary `page.tsx`.** The page is a client component that calls `getHealth()` and prints status, fts5 and boot_count, or the error message. It proves CORS end to end.
- [ ] **Step 4: Verify.** Run `npm run lint`, `npx tsc --noEmit` and `npm run build` (all pass). Then, with the backend running, `npm run dev` should show the health values at `http://localhost:3000`.
- [ ] **Step 5: Commit** with `git add frontend && git commit -m "feat(frontend): Next.js skeleton calling the API health check"`.

**Done when:** the build passes and the local page shows health from the backend without CORS errors.
**Failure / recovery:**
- create-next-app flags changed: run it interactively with the same answers (TS, ESLint, Tailwind, App Router, src dir, `@/*`).

### Task 3: Deploy both skeletons and prove persistence

**Files:** none new (configuration happens in the dashboards).

- [ ] **Step 1: Push:** `git push`.
- [ ] **Step 2 (user, Railway dashboard):**
  1. New Project → Deploy from GitHub repo → `prachi7104/fireflies-clone`.
  2. Service **Settings → Root Directory** `/backend`.
  3. **Variables:** `DATABASE_URL=sqlite:////data/app.db`, `CORS_ORIGINS=http://localhost:3000`, `SEED_ON_STARTUP=true`.
  4. Right-click the service → **Attach Volume**, mount path `/data`.
  5. **Networking → Generate Domain.**
  6. Wait for a green deploy.
- [ ] **Step 3 (me):** open `https://<railway-domain>/api/health`. Expected: `fts5: true`, `boot_count: 1`.
- [ ] **Step 4 (user, Vercel):**
  1. Add New → Project → import the repo.
  2. **Root Directory** `frontend`.
  3. Env `NEXT_PUBLIC_API_BASE_URL=https://<railway-domain>` (no trailing slash).
  4. Deploy.
- [ ] **Step 5 (user, Railway):** set `CORS_ORIGINS=https://<vercel-domain>,http://localhost:3000`. This triggers a redeploy.
- [ ] **Step 6 (me):** open the Vercel URL in the built-in browser. Expected: health values shown and no CORS error in the console. `boot_count` is now 2 after the redeploy, which **proves the volume persists**.
- [ ] **Step 7:** record both URLs in the README draft notes.

**Done when:** both URLs work, `fts5` is true, and `boot_count` went up across a redeploy.
**Failure / recovery:**
- **Railway Limited Trial:** only outbound network is blocked, so deploys still work. Verify at railway.com/verify for the Groq calls later.
- **Build can't find Python 3.13:** set `.python-version` to `3.12` and push.
- **`boot_count` stays 1:** the volume isn't mounted at `/data` or `DATABASE_URL` is wrong. Fix it before continuing.
- **CORS error:** the origin must match exactly (scheme, no trailing slash).
- **Railway blocked entirely:** fall back to Render paid starter + disk, or Render free with the limitation documented. Decide with the user.

---

## M2: Backend

### Task 4: Models and schema constraints

**Files:**
- Create:
  - `backend/app/models/user.py`, `participant.py`, `meeting.py` (Meeting, MeetingParticipant), `transcript.py` (TranscriptSegment), `notes.py` (Summary, MeetingKeyword, Chapter), `action_item.py`
  - `backend/app/services/names.py`
- Modify: `backend/app/models/__init__.py` (import all), `backend/app/core/database.py` (FTS table + triggers)
- Test: `backend/tests/test_schema_constraints.py`, `backend/tests/factories.py`

**Interfaces (produces):**
- `normalize_name(raw: str) -> tuple[str, str]`: collapses whitespace, strips, and returns `(display, display.casefold())`. Raises `ValueError` if empty.
- Models exactly as spec §6. Additional details:
  - `Meeting.participant_links` is `relationship(back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True)`.
  - `MeetingParticipant.meeting` is `relationship(back_populates="participant_links")`.
  - `MeetingParticipant.participant` is `relationship(back_populates="meeting_links", lazy="joined")`.
  - `Participant.meeting_links` is `relationship(back_populates="participant")`.
  - `Meeting.segments` is ordered by `position`, `Meeting.chapters` by `position`, `Meeting.keywords` by `rank`, and `Meeting.action_items` by `id`. All use `passive_deletes=True`.
  - `Meeting.summary` has `uselist=False`.
- Composite foreign keys:
```python
ForeignKeyConstraint(["meeting_id", "speaker_id"],
    ["meeting_participants.meeting_id", "meeting_participants.participant_id"],
    name="fk_segment_speaker_in_meeting")          # on TranscriptSegment
ForeignKeyConstraint(["meeting_id", "assignee_id"],
    ["meeting_participants.meeting_id", "meeting_participants.participant_id"],
    name="fk_action_item_assignee_in_meeting")     # on ActionItem
```
- FTS DDL, run in `init_db` when FTS5 is available:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(text, content='transcript_segments', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER IF NOT EXISTS transcript_segments_ai AFTER INSERT ON transcript_segments BEGIN
  INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text); END;
CREATE TRIGGER IF NOT EXISTS transcript_segments_ad AFTER DELETE ON transcript_segments BEGIN
  INSERT INTO segments_fts(segments_fts, rowid, text) VALUES ('delete', old.id, old.text); END;
CREATE TRIGGER IF NOT EXISTS transcript_segments_au AFTER UPDATE ON transcript_segments BEGIN
  INSERT INTO segments_fts(segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text); END;
```
- `tests/factories.py`: `make_user(db, name="Other User", email="other@orbitlabs.example") -> User` and `make_meeting_rows(db, owner, *, title="Sync", people=("Ann Lee","Bob Stone"), lines=(("Ann Lee",0,5000,"We should review pricing"),)) -> Meeting`. The second inserts rows directly through the models (participants, links, segments) and commits.

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_schema_constraints.py
import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from app.models import ActionItem, Chapter, Meeting, MeetingKeyword, MeetingParticipant, Participant, Summary, TranscriptSegment, User
from app.core.time import utcnow
from tests.factories import make_meeting_rows, make_user

@pytest.fixture
def owner(db):
    return make_user(db, name="Owner", email="owner@orbitlabs.example")

def test_speaker_must_be_participant_of_that_meeting(db, owner):
    m = make_meeting_rows(db, owner, people=("Ann Lee",), lines=(("Ann Lee", 0, 1000, "hello"),))
    outsider = Participant(name="Zed Outsider", name_key="zed outsider")
    db.add(outsider); db.commit()
    db.add(TranscriptSegment(meeting_id=m.id, position=1, speaker_id=outsider.id, start_ms=1000, end_ms=2000, text="hi"))
    with pytest.raises(IntegrityError):
        db.commit()

def test_assignee_must_be_participant_of_that_meeting(db, owner):
    m = make_meeting_rows(db, owner)
    outsider = Participant(name="Zed Outsider", name_key="zed outsider")
    db.add(outsider); db.commit()
    db.add(ActionItem(meeting_id=m.id, text="Do it", assignee_id=outsider.id, source="user"))
    with pytest.raises(IntegrityError):
        db.commit()

def test_unassigned_action_item_is_allowed(db, owner):
    m = make_meeting_rows(db, owner)
    db.add(ActionItem(meeting_id=m.id, text="Do it", assignee_id=None, source="user"))
    db.commit()

def test_completed_at_must_match_is_done(db, owner):
    m = make_meeting_rows(db, owner)
    db.add(ActionItem(meeting_id=m.id, text="Do it", source="user", is_done=True, completed_at=None))
    with pytest.raises(IntegrityError):
        db.commit()

def test_removing_a_speaker_from_the_meeting_is_blocked(db, owner):
    m = make_meeting_rows(db, owner)
    ann_id = db.scalar(select(Participant.id).where(Participant.name_key == "ann lee"))
    db.execute(delete(MeetingParticipant).where(MeetingParticipant.meeting_id == m.id, MeetingParticipant.participant_id == ann_id))
    with pytest.raises(IntegrityError):
        db.commit()

def test_deleting_a_meeting_cascades_to_everything_including_search_index(db, owner):
    m = make_meeting_rows(db, owner)
    seg_id = db.scalar(select(TranscriptSegment.id).where(TranscriptSegment.meeting_id == m.id))
    db.add_all([
        Summary(meeting_id=m.id, overview="o", notes=["n"], generated_by="rules", generated_at=utcnow()),
        MeetingKeyword(meeting_id=m.id, term="pricing", rank=1),
        Chapter(meeting_id=m.id, position=0, title="Intro", start_ms=0),
        ActionItem(meeting_id=m.id, text="Follow up", source="ai", segment_id=seg_id),
    ])
    db.commit()
    assert db.execute(text("SELECT count(*) FROM segments_fts WHERE segments_fts MATCH 'pricing'")).scalar() == 1
    db.execute(delete(Meeting).where(Meeting.id == m.id)); db.commit()
    for model in (MeetingParticipant, TranscriptSegment, Summary, MeetingKeyword, Chapter, ActionItem):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    assert db.execute(text("SELECT count(*) FROM segments_fts WHERE segments_fts MATCH 'pricing'")).scalar() == 0
    assert db.scalar(select(func.count()).select_from(Participant)) >= 2  # people outlive meetings

def test_keyword_is_unique_per_meeting(db, owner):
    m = make_meeting_rows(db, owner)
    db.add_all([MeetingKeyword(meeting_id=m.id, term="pricing", rank=1), MeetingKeyword(meeting_id=m.id, term="pricing", rank=2)])
    with pytest.raises(IntegrityError):
        db.commit()
```
- [ ] **Step 2: Run** `.venv/Scripts/python -m pytest tests/test_schema_constraints.py`. Expected: FAIL (import errors).
- [ ] **Step 3: Implement** the models, the FTS DDL in `init_db`, `names.py` and `factories.py`. Use `CheckConstraint` for the source enums and `is_done = (completed_at IS NOT NULL)`, and the `server_default`/`default=utcnow` timestamps.
- [ ] **Step 4: Run all tests.** Expected: PASS.
  - If the cascade test shows FTS rows remaining, the trigger isn't firing for cascade deletes. Fix it in `delete_meeting` (Task 7) by deleting segments explicitly first, and change this test to delete through that function.
- [ ] **Step 5: Commit** with `git commit -m "feat(backend): schema with composite FKs, cascades and FTS5 index"`.

**Done when:** all constraint tests pass, which proves the invariants in spec §6.
**Failure / recovery:**
- SQLAlchemy ambiguous-join errors on relationships: pass `foreign_keys=[...]` explicitly.
- The composite FK fails on create: `meeting_participants` must have its composite PK declared before dependent tables. Import order in `models/__init__.py` should go user → participant → meeting → transcript → notes → action_item.

### Task 5: Transcript parser

**Files:**
- Create: `backend/app/core/errors.py`, `backend/app/services/transcript_parser.py`
- Test: `backend/tests/test_transcript_parser.py`

**Interfaces (produces):**
- `errors.py`:
  - `DomainError(Exception)` with `status_code` and `detail`;
  - subclasses `NotFoundError` 404, `ConflictError` 409, `InvalidInputError` 422, `PayloadTooLargeError` 413, `UnsupportedMediaError` 415, `UnauthorizedError` 401;
  - `register_exception_handlers(app)` maps `DomainError` → `JSONResponse({"detail": e.detail}, e.status_code)` and `IntegrityError` → 409 `{"detail": "Request conflicts with existing data"}`.
- `@dataclass(frozen=True) class ParsedSegment: speaker: str; start_ms: int; end_ms: int; text: str`
- `class TranscriptParseError(InvalidInputError)`
- `detect_format(raw: str) -> Literal["txt","vtt","json"]`
- `parse_timestamp(value: str | int | float) -> int`: numbers are seconds; strings are `SS`, `MM:SS`, `HH:MM:SS`, optionally with `.fff` or `,fff`.
- `parse_transcript(raw: str, fmt: Literal["auto","txt","vtt","json"] = "auto") -> list[ParsedSegment]`
- Constants: `MAX_SEGMENTS = 5000`, `MAX_SPEAKERS = 50`, `MAX_SPEAKER_LEN = 80`, `MAX_TEXT_LEN = 5000`, `WORDS_PER_MINUTE = 150`, `MIN_SEGMENT_MS = 2000`.
- Rules (spec §8):
  - A TXT speaker line matches `^\s*\[?(?P<ts>(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s+(?P<speaker>[^:\[\]]{1,80}?):\s+(?P<text>\S.*)$`.
  - An untimed speaker line matches `^\s*(?P<speaker>[A-Z][\w.'-]*(?: [A-Z][\w.'-]*){0,3}):\s+(?P<text>\S.*)$`.
  - Any other non-empty line continues the previous segment. With no previous segment → 422.
  - A timed transcript that also contains an untimed speaker line → 422 naming that line.
  - Estimated duration = `max(MIN_SEGMENT_MS, words * 400)`.
  - End = the given end, else the next start (if greater), else start + estimate.

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_transcript_parser.py
import pytest
from app.services.transcript_parser import ParsedSegment, TranscriptParseError, detect_format, parse_timestamp, parse_transcript

def test_parse_timestamp_variants():
    assert parse_timestamp("00:05") == 5000
    assert parse_timestamp("1:02:03") == 3723000
    assert parse_timestamp("00:01.5") == 1500
    assert parse_timestamp("00:00:01,250") == 1250
    assert parse_timestamp(62) == 62000
    assert parse_timestamp(1.5) == 1500

def test_detect_format():
    assert detect_format("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhi") == "vtt"
    assert detect_format('[{"speaker": "Ann", "text": "hi"}]') == "json"
    assert detect_format("[00:01] Ann: hi") == "txt"

def test_txt_bracketed_timestamps():
    segs = parse_transcript("[00:05] Priya Nair: Let's review pricing.\n[00:12] Marcus Chen: Sounds good to me.")
    assert [(s.speaker, s.start_ms, s.end_ms) for s in segs] == [("Priya Nair", 5000, 12000), ("Marcus Chen", 12000, 14000)]
    assert segs[0].text == "Let's review pricing."

def test_txt_hours_without_brackets():
    assert parse_transcript("01:02:03 Ann Lee: Hi there")[0].start_ms == 3723000

def test_txt_continuation_line_joins_previous_segment():
    segs = parse_transcript("[00:01] Ann Lee: First part\nand the second part\n[00:09] Bob Stone: Reply")
    assert segs[0].text == "First part and the second part"
    assert len(segs) == 2

def test_txt_untimed_transcript_gets_estimated_times():
    segs = parse_transcript("Ann Lee: one two three four five six seven eight nine ten\nBob Stone: ok")
    assert (segs[0].start_ms, segs[0].end_ms) == (0, 4000)
    assert (segs[1].start_ms, segs[1].end_ms) == (4000, 6000)

def test_txt_mixing_timed_and_untimed_speaker_lines_is_rejected():
    with pytest.raises(TranscriptParseError, match="[Ll]ine 2"):
        parse_transcript("[00:01] Ann Lee: hi\nBob Stone: hello")

def test_txt_leading_text_without_speaker_is_rejected():
    with pytest.raises(TranscriptParseError, match="[Ll]ine 1"):
        parse_transcript("just some words\n[00:01] Ann Lee: hi")

def test_vtt_voice_tags_and_name_prefix():
    raw = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.500\n<v Ann Lee>Hello team</v>\n\n00:00:05.000 --> 00:00:07.000\nBob Stone: Hi Ann\n"
    segs = parse_transcript(raw)
    assert [(s.speaker, s.start_ms, s.end_ms, s.text) for s in segs] == [
        ("Ann Lee", 1000, 4500, "Hello team"), ("Bob Stone", 5000, 7000, "Hi Ann")]

def test_vtt_cue_without_speaker_uses_unknown_speaker():
    segs = parse_transcript("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\njust words\n")
    assert segs[0].speaker == "Unknown speaker"

def test_json_list_and_object_forms():
    a = parse_transcript('[{"speaker": "Ann Lee", "start": 1.5, "text": "Hi"}]')
    b = parse_transcript('{"segments": [{"speaker": "Ann Lee", "start": "00:01.5", "end": "00:03", "text": "Hi"}]}')
    assert a[0].start_ms == 1500 and b[0].start_ms == 1500 and b[0].end_ms == 3000

def test_json_item_without_text_is_rejected():
    with pytest.raises(TranscriptParseError):
        parse_transcript('[{"speaker": "Ann Lee", "start": 0}]')

def test_segments_are_sorted_and_whitespace_collapsed():
    segs = parse_transcript("[00:10] Bob   Stone:  later   words\n[00:02] Ann Lee: earlier")
    assert [s.speaker for s in segs] == ["Ann Lee", "Bob Stone"]
    assert segs[1].text == "later words"
    assert all(s.end_ms >= s.start_ms for s in segs)

def test_empty_input_is_rejected():
    with pytest.raises(TranscriptParseError, match="empty"):
        parse_transcript("  \n  ")

def test_too_many_speakers_is_rejected():
    raw = "\n".join(f"[00:{i:02d}] Person{i}: hi" for i in range(51))
    with pytest.raises(TranscriptParseError, match="speakers"):
        parse_transcript(raw)
```
- [ ] **Step 2: Run** `.venv/Scripts/python -m pytest tests/test_transcript_parser.py`. Expected: FAIL (import error).
- [ ] **Step 3: Implement** `errors.py` and `transcript_parser.py` as specified. Register the exception handlers in `create_app`.
- [ ] **Step 4: Run the tests.** Expected: all pass.
- [ ] **Step 5: Commit** with `git commit -m "feat(backend): transcript parser for txt, vtt and json"`.

**Done when:** all parser tests pass.
**Failure / recovery:** regex edge cases. Keep the test list as the contract; if a case is ambiguous, the explicit error path wins over guessing.

### Task 6: Rules-based notes generator and dispatcher

**Files:**
- Create: `backend/app/services/notes/__init__.py`, `types.py`, `rules.py`, `llm.py` (the `NotesProvider` protocol only; Groq comes in Task 17)
- Test: `backend/tests/test_notes_rules.py`, `backend/tests/test_notes_fallback.py`

**Interfaces (produces):**
```python
@dataclass(frozen=True)
class GeneratedChapter: title: str; start_ms: int; gist: str | None
@dataclass(frozen=True)
class GeneratedActionItem: text: str; assignee: str | None; segment_index: int | None
@dataclass(frozen=True)
class GeneratedNotes:
    overview: str; notes: list[str]; keywords: list[str]
    chapters: list[GeneratedChapter]; action_items: list[GeneratedActionItem]
    generated_by: Literal["seed", "rules", "llm"]; model: str | None = None

class NotesProvider(Protocol):
    name: str
    def generate(self, title: str, participants: list[str], segments: list[ParsedSegment], duration_ms: int) -> GeneratedNotes: ...

def generate_rules_notes(title: str, participants: list[str], segments: list[ParsedSegment], duration_ms: int) -> GeneratedNotes
def generate_notes(title, participants, segments, duration_ms, provider: NotesProvider | None = None) -> GeneratedNotes
    # provider None → rules; provider raises anything → log warning, return rules
def provider_from_settings(settings: Settings) -> NotesProvider | None   # Task 6: always None; Task 17 returns Groq
```
The algorithm follows spec §9 exactly:
- stopwords live in a module constant;
- ties are broken alphabetically or by position so output is deterministic;
- chapter count is `clamp(round(duration_min / 5), 2, 8)`, limited to the number of segments.

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_notes_rules.py
from app.services.notes.rules import generate_rules_notes
from app.services.transcript_parser import ParsedSegment

PEOPLE = ["Priya Nair", "Marcus Chen", "Emily Park"]
SEGMENTS = [
    ParsedSegment("Priya Nair", 0, 40000, "Welcome everyone. Today we need to finalize the pricing page and agree on the launch timeline."),
    ParsedSegment("Marcus Chen", 40000, 90000, "The pricing page design is nearly ready. I'll share the final pricing page mockups by Friday."),
    ParsedSegment("Priya Nair", 90000, 150000, "Great work. Marcus, can you also update the onboarding checklist before the launch?"),
    ParsedSegment("Emily Park", 150000, 220000, "For the launch timeline we need to confirm the press date with the marketing agency this week."),
    ParsedSegment("Marcus Chen", 220000, 290000, "Customer interviews showed the annual plan toggle on the pricing page confused people."),
    ParsedSegment("Emily Park", 290000, 360000, "Let's run a small experiment on the annual plan toggle after the launch timeline is locked."),
]

def notes():
    return generate_rules_notes("Weekly Product Sync", PEOPLE, SEGMENTS, 360000)

def test_output_is_deterministic():
    assert notes() == notes()

def test_generated_by_rules_without_model():
    n = notes()
    assert n.generated_by == "rules" and n.model is None

def test_keywords_prefer_repeated_phrases_and_skip_stopwords():
    kws = notes().keywords
    assert "pricing page" in kws
    assert 1 <= len(kws) <= 6
    assert not {"the", "and", "we", "this"} & set(kws)

def test_overview_and_notes_are_sentences_from_the_transcript():
    n = notes()
    transcript = " ".join(s.text for s in SEGMENTS)
    assert n.overview
    for bullet in n.notes:
        assert bullet in transcript

def test_chapters_are_ordered_and_start_on_segment_boundaries():
    chapters = notes().chapters
    starts = [c.start_ms for c in chapters]
    assert 2 <= len(chapters) <= 8
    assert starts == sorted(starts) and starts[0] == 0
    assert set(starts) <= {s.start_ms for s in SEGMENTS}
    assert all(c.title for c in chapters)

def test_action_items_find_commitments_and_requests_with_assignees():
    items = notes().action_items
    by_text = {i.text.lower(): i for i in items}
    mockups = next(i for t, i in by_text.items() if "mockups" in t)
    assert mockups.assignee == "Marcus Chen" and mockups.segment_index == 1
    checklist = next(i for t, i in by_text.items() if "onboarding checklist" in t)
    assert checklist.assignee == "Marcus Chen"
    assert any("press date" in t for t in by_text)
    assert len(items) <= 8
```
```python
# backend/tests/test_notes_fallback.py
from app.services.notes import generate_notes
from tests.test_notes_rules import PEOPLE, SEGMENTS

class ExplodingProvider:
    name = "test:explode"
    def generate(self, *args, **kwargs):
        raise RuntimeError("provider down")

def test_no_provider_uses_rules():
    assert generate_notes("T", PEOPLE, SEGMENTS, 360000, provider=None).generated_by == "rules"

def test_provider_failure_falls_back_to_rules():
    assert generate_notes("T", PEOPLE, SEGMENTS, 360000, provider=ExplodingProvider()).generated_by == "rules"
```
- [ ] **Step 2: Run.** Expected: FAIL (imports).
- [ ] **Step 3: Implement** `types.py`, `rules.py`, `llm.py` (Protocol) and `__init__.py`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(backend): deterministic rules-based meeting notes with provider fallback"`.

**Done when:** the rules and fallback tests pass.
**Failure / recovery:** if assignee detection is flaky, simplify to the two rules only (a first-person commitment → speaker; `<Name>, can/could you` → that name) and keep the tests.

### Task 7: Meetings API (create, import, get, patch, delete) and mock auth

**Files:**
- Create:
  - `backend/app/core/deps.py`
  - `backend/app/schemas/__init__.py`, `common.py`, `user.py`, `participant.py`, `meeting.py`, `action_item.py`
  - `backend/app/services/user_service.py`, `participant_service.py`, `meeting_service.py`
  - `backend/app/routers/users.py`, `backend/app/routers/meetings.py`
- Modify: `backend/app/main.py` (routers; `ensure_demo_user` in the lifespan)
- Test: `backend/tests/test_meetings_api.py`

**Interfaces (produces):**
- `DEMO_USER_EMAIL = "jordan@orbitlabs.example"`, `DEMO_USER_NAME = "Jordan Lee"`
- `ensure_demo_user(db) -> User` also ensures a Participant linked to the user.
- `get_db(request) -> Iterator[Session]`
- `get_current_user(db, x_user_id: int | None = Header(None)) -> User`: `None` → the demo user; unknown → `UnauthorizedError`.
- `get_or_create_participants(db, names: Iterable[str]) -> list[Participant]`: matches by `name_key` and preserves input order, without duplicates.
- `meeting_service`:
```python
def create_meeting(db, owner, *, title: str, raw_text: str, fmt: str = "auto", source: Literal["seed","upload","paste"],
                   started_at: datetime | None = None, extra_participants: Sequence[str] = (),
                   notes: GeneratedNotes | None = None, provider: NotesProvider | None = None) -> Meeting
def get_meeting(db, owner, meeting_id: int) -> Meeting                 # NotFoundError
def update_meeting(db, owner, meeting_id: int, fields: dict) -> Meeting  # keys: title, started_at, participants
def delete_meeting(db, owner, meeting_id: int) -> None
def to_detail(meeting: Meeting) -> MeetingDetail
```
- `update_meeting` with `participants`:
  1. normalise names;
  2. if any current speaker is missing → `ConflictError("Cannot remove <names>: they speak in this transcript")`;
  3. clear `assignee_id` on this meeting's action items for removed people;
  4. delete the removed links and add the new ones;
  5. bump `updated_at`.
- Schemas follow spec §7. `MeetingCreate.title` has `min_length=1, max_length=200` and is stripped. `MeetingUpdate` fields are all optional. `participants: list[str] | None` has `max_length=50`.
- Routes:
  - `POST /api/meetings` (201), `POST /api/meetings/import` (201), `GET|PATCH|DELETE /api/meetings/{meeting_id}` (200/200/204), `GET /api/me`.
  - Import reads at most `max_upload_bytes + 1` bytes:
    - too large → 413;
    - extension not in {.txt, .vtt, .json} → 415;
    - not UTF-8 → 422 (UTF-8 BOM is stripped).
  - Default title = the file stem with `_`/`-` turned into spaces, stripped. `participants` form field is comma-separated.

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_meetings_api.py
from sqlalchemy import func, select, text
from app.models import ActionItem, TranscriptSegment
from tests.factories import make_user

TRANSCRIPT = (
    "[00:00] Priya Nair: Welcome everyone. Today we review the pricing page and the launch plan.\n"
    "[00:20] Marcus Chen: I'll send the final pricing page mockups by Friday.\n"
    "[00:45] Priya Nair: Marcus, can you also update the onboarding checklist?\n"
)

def create(client, **overrides):
    payload = {"title": "Weekly Sync", "transcript": TRANSCRIPT} | overrides
    res = client.post("/api/meetings", json=payload)
    assert res.status_code == 201, res.text
    return res.json()

def test_me_returns_demo_user(client):
    assert client.get("/api/me").json()["email"] == "jordan@orbitlabs.example"

def test_unknown_user_header_is_rejected(client):
    assert client.get("/api/me", headers={"X-User-Id": "999"}).status_code == 401

def test_create_from_pasted_text_builds_transcript_and_notes(client):
    m = create(client)
    assert m["title"] == "Weekly Sync" and m["source"] == "paste"
    assert [s["start_ms"] for s in m["segments"]] == [0, 20000, 45000]
    assert {p["name"] for p in m["participants"]} == {"Priya Nair", "Marcus Chen"}
    assert all(p["is_speaker"] for p in m["participants"])
    assert m["duration_ms"] >= 45000
    assert m["summary"]["generated_by"] == "rules"
    assert m["chapters"] and m["keywords"] and m["action_items"]
    assert m["started_at"].endswith("Z")

def test_create_with_extra_participant_who_does_not_speak(client):
    m = create(client, participants=["Emily Park"])
    emily = next(p for p in m["participants"] if p["name"] == "Emily Park")
    assert emily["is_speaker"] is False

def test_create_rejects_blank_title_and_unparseable_transcript(client):
    assert client.post("/api/meetings", json={"title": " ", "transcript": TRANSCRIPT}).status_code == 422
    assert client.post("/api/meetings", json={"title": "x", "transcript": "   "}).status_code == 422

def test_import_vtt_file(client):
    files = {"file": ("design_review.vtt", b"WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<v Ann Lee>Hi team</v>\n", "text/vtt")}
    res = client.post("/api/meetings/import", files=files)
    assert res.status_code == 201, res.text
    assert res.json()["title"] == "design review" and res.json()["source"] == "upload"

def test_import_rejects_unsupported_type(client):
    res = client.post("/api/meetings/import", files={"file": ("notes.pdf", b"%PDF-1.7", "application/pdf")})
    assert res.status_code == 415

def test_import_rejects_too_large_file(client, settings):
    big = b"[00:00] Ann Lee: " + b"a" * settings.max_upload_bytes
    res = client.post("/api/meetings/import", files={"file": ("big.txt", big, "text/plain")})
    assert res.status_code == 413

def test_get_unknown_meeting_is_404(client):
    assert client.get("/api/meetings/9999").status_code == 404

def test_other_users_meeting_is_404(client, db):
    m = create(client)
    other = make_user(db)
    assert client.get(f"/api/meetings/{m['id']}", headers={"X-User-Id": str(other.id)}).status_code == 404

def test_patch_title_only_keeps_participants(client):
    m = create(client, participants=["Emily Park"])
    res = client.patch(f"/api/meetings/{m['id']}", json={"title": "Renamed"})
    assert res.status_code == 200
    assert res.json()["title"] == "Renamed"
    assert {p["name"] for p in res.json()["participants"]} == {"Priya Nair", "Marcus Chen", "Emily Park"}

def test_patch_participants_adds_and_removes_non_speakers(client):
    m = create(client, participants=["Emily Park"])
    res = client.patch(f"/api/meetings/{m['id']}", json={"participants": ["Priya Nair", "Marcus Chen", "Ravi Menon"]})
    assert res.status_code == 200
    assert {p["name"] for p in res.json()["participants"]} == {"Priya Nair", "Marcus Chen", "Ravi Menon"}

def test_patch_cannot_remove_a_speaker(client):
    m = create(client)
    res = client.patch(f"/api/meetings/{m['id']}", json={"participants": ["Priya Nair"]})
    assert res.status_code == 409
    assert "Marcus Chen" in res.json()["detail"]

def test_delete_meeting_removes_it_and_its_children(client, db):
    m = create(client)
    assert client.delete(f"/api/meetings/{m['id']}").status_code == 204
    assert client.get(f"/api/meetings/{m['id']}").status_code == 404
    assert db.scalar(select(func.count()).select_from(TranscriptSegment)) == 0
    assert db.scalar(select(func.count()).select_from(ActionItem)) == 0
    assert db.execute(text("SELECT count(*) FROM segments_fts WHERE segments_fts MATCH 'pricing'")).scalar() == 0
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the deps, schemas, services and routers. Business logic stays in the services only.
- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(backend): meetings create/import/read/update/delete with mock auth"`.

**Done when:** all tests pass, and `/docs` shows the endpoints with request/response schemas.

### Task 8: Library search, filters, pagination and participants

**Files:**
- Create: `backend/app/services/search_service.py`, `backend/app/routers/participants.py`
- Modify: `backend/app/routers/meetings.py` (`GET /api/meetings`), `backend/app/services/participant_service.py` (`list_participants`)
- Test: `backend/tests/test_search_api.py`

**Interfaces (produces):**
```python
@dataclass
class MeetingFilters:
    q: str | None = None
    participant_ids: list[int] = field(default_factory=list)
    date_from: datetime | None = None
    date_to: datetime | None = None
    sources: list[str] = field(default_factory=list)
    sort: Literal["newest", "oldest"] = "newest"
    limit: int = 20
    offset: int = 0

def escape_like(value: str) -> str            # escapes \ % _ with backslash
def build_fts_query(q: str) -> str | None     # '"tok1" "tok2"*' or None when no word tokens
def list_meetings(db, owner, filters: MeetingFilters, *, use_fts: bool) -> MeetingListPage
def list_participants(db, owner, q: str | None) -> list[ParticipantListItem]
```
- The FTS part is one raw query:
  ```sql
  SELECT ts.meeting_id, ts.id, ts.start_ms, ts.text
  FROM segments_fts
  JOIN transcript_segments ts ON ts.id = segments_fts.rowid
  WHERE segments_fts MATCH :q
  ORDER BY bm25(segments_fts)
  ```
  The first row per meeting becomes `match`. The meeting ids feed `Meeting.id.in_(...)`, OR'ed with the title and participant LIKE conditions.
- When `use_fts` is False: `TranscriptSegment.text.ilike` instead.
- `open_action_items` is counted with `GROUP BY` over the page ids.
- The route parses `participant_id: list[int] = Query([])` and `source: list[str] = Query([])`. `limit` is 1..100, `offset` ≥ 0, and `use_fts` comes from `request.app.state.fts5_enabled`.

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_search_api.py
import pytest
from app.services.search_service import build_fts_query, escape_like

def make(client, title, started_at, transcript, participants=()):
    res = client.post("/api/meetings", json={"title": title, "started_at": started_at, "transcript": transcript, "participants": list(participants)})
    assert res.status_code == 201, res.text
    return res.json()

@pytest.fixture
def three(client):
    a = make(client, "Roadmap Review", "2026-09-01T10:00:00Z", "[00:00] Priya Nair: The Q4 roadmap has three themes.\n[00:30] Marcus Chen: Mobile first.")
    b = make(client, "Design Critique", "2026-09-10T10:00:00Z", "[00:00] Marcus Chen: The onboarding flow needs fewer steps.\n[00:40] Emily Park: Agreed.", ["Sofia Alvarez"])
    c = make(client, "Customer Call", "2026-09-20T10:00:00Z", "[00:00] Sofia Alvarez: They asked about pricing tiers.\n[00:25] Hannah Schmidt: Yes, pricing matters.")
    return a, b, c

def titles(res):
    return [i["title"] for i in res.json()["items"]]

def test_build_fts_query_quotes_tokens_and_prefixes_last():
    assert build_fts_query("pricing pa") == '"pricing" "pa"*'
    assert build_fts_query('"; DROP') == '"DROP"*'
    assert build_fts_query("*** ()") is None

def test_escape_like():
    assert escape_like("50%_off\\") == "50\\%\\_off\\\\"

def test_default_sort_is_newest_first(client, three):
    assert titles(client.get("/api/meetings")) == ["Customer Call", "Design Critique", "Roadmap Review"]

def test_sort_oldest(client, three):
    assert titles(client.get("/api/meetings", params={"sort": "oldest"}))[0] == "Roadmap Review"

def test_q_matches_title_case_insensitively(client, three):
    assert titles(client.get("/api/meetings", params={"q": "design"})) == ["Design Critique"]

def test_q_matches_participant_name(client, three):
    assert set(titles(client.get("/api/meetings", params={"q": "sofia"}))) == {"Design Critique", "Customer Call"}

def test_q_matches_transcript_text_with_match_snippet(client, three):
    res = client.get("/api/meetings", params={"q": "roadm"})
    item = res.json()["items"][0]
    assert item["title"] == "Roadmap Review"
    assert "roadmap" in item["match"]["text"].lower() and item["match"]["start_ms"] == 0

def test_q_with_special_characters_never_errors(client, three):
    for q in ['"', "*", "(", "pricing OR", "NEAR(", "%", "_", "\\", "a:b", "'"]:
        assert client.get("/api/meetings", params={"q": q}).status_code == 200

def test_filter_by_participants_matches_any(client, three):
    people = {p["name"]: p["id"] for p in client.get("/api/participants").json()}
    res = client.get("/api/meetings", params={"participant_id": [people["Priya Nair"], people["Hannah Schmidt"]]})
    assert set(titles(res)) == {"Roadmap Review", "Customer Call"}

def test_filter_by_date_range_inclusive_start_exclusive_end(client, three):
    res = client.get("/api/meetings", params={"date_from": "2026-09-10T10:00:00Z", "date_to": "2026-09-20T10:00:00Z"})
    assert titles(res) == ["Design Critique"]

def test_filter_by_source(client, three):
    assert client.get("/api/meetings", params={"source": ["upload"]}).json()["total"] == 0
    assert client.get("/api/meetings", params={"source": ["paste", "upload"]}).json()["total"] == 3

def test_pagination_reports_total(client, three):
    body = client.get("/api/meetings", params={"limit": 2, "offset": 0}).json()
    assert body["total"] == 3 and len(body["items"]) == 2 and body["limit"] == 2
    assert len(client.get("/api/meetings", params={"limit": 2, "offset": 2}).json()["items"]) == 1

def test_list_item_shape(client, three):
    item = client.get("/api/meetings").json()["items"][0]
    assert set(item) >= {"id", "title", "started_at", "duration_ms", "source", "participants", "open_action_items", "match"}
    assert item["match"] is None

def test_participants_endpoint_counts_meetings(client, three):
    people = {p["name"]: p for p in client.get("/api/participants").json()}
    assert people["Marcus Chen"]["meeting_count"] == 2
    assert [p["name"] for p in client.get("/api/participants", params={"q": "han"}).json()] == ["Hannah Schmidt"]

def test_transcript_search_falls_back_to_like_without_fts(client, db, three):
    from app.models import User
    from app.services.search_service import MeetingFilters, list_meetings
    from app.services.user_service import DEMO_USER_EMAIL
    from sqlalchemy import select
    owner = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    page = list_meetings(db, owner, MeetingFilters(q="roadmap"), use_fts=False)
    assert [i.title for i in page.items] == ["Roadmap Review"]
    assert page.items[0].match is not None
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the search service, route and participants endpoint.
- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(backend): library search with FTS5, filters, sorting and pagination"`.

### Task 9: Action items API

**Files:**
- Create: `backend/app/services/action_item_service.py`, `backend/app/routers/action_items.py`
- Test: `backend/tests/test_action_items_api.py`

**Interfaces (produces):**
```python
def create_action_item(db, owner, meeting_id: int, *, text: str, assignee_id: int | None) -> ActionItem
def update_action_item(db, owner, item_id: int, fields: dict) -> ActionItem  # keys: text, assignee_id, is_done
def delete_action_item(db, owner, item_id: int) -> None
def to_action_item_out(item: ActionItem) -> ActionItemOut   # start_ms from the linked segment, else None
```
- An assignee who isn't in the meeting → `InvalidInputError("Assignee must be a participant of this meeting")`.
- `is_done=True` sets `completed_at=utcnow()`; `False` clears it.
- Ownership is checked through the item's meeting (404 otherwise).
- Routes:
  - `POST /api/meetings/{meeting_id}/action-items` (201);
  - `PATCH /api/action-items/{item_id}` (200) using `model_dump(exclude_unset=True)`;
  - `DELETE /api/action-items/{item_id}` (204).

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_action_items_api.py
from tests.test_meetings_api import create
from tests.factories import make_user

def person_id(meeting, name):
    return next(p["id"] for p in meeting["participants"] if p["name"] == name)

def test_create_assigned_action_item(client):
    m = create(client)
    res = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Draft recap", "assignee_id": person_id(m, "Priya Nair")})
    assert res.status_code == 201
    body = res.json()
    assert body["text"] == "Draft recap" and body["source"] == "user" and body["is_done"] is False

def test_assignee_must_be_in_the_meeting(client):
    m = create(client)
    other = create(client, participants=["Ravi Menon"])
    res = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x", "assignee_id": person_id(other, "Ravi Menon")})
    assert res.status_code == 422

def test_blank_text_is_rejected(client):
    m = create(client)
    assert client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "  "}).status_code == 422

def test_complete_and_uncomplete(client):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Ship it"}).json()
    done = client.patch(f"/api/action-items/{item['id']}", json={"is_done": True}).json()
    assert done["is_done"] is True and done["completed_at"]
    undone = client.patch(f"/api/action-items/{item['id']}", json={"is_done": False}).json()
    assert undone["is_done"] is False and undone["completed_at"] is None

def test_explicit_null_unassigns_but_omitting_keeps_assignee(client):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x", "assignee_id": person_id(m, "Marcus Chen")}).json()
    kept = client.patch(f"/api/action-items/{item['id']}", json={"text": "renamed"}).json()
    assert kept["assignee_id"] == person_id(m, "Marcus Chen") and kept["text"] == "renamed"
    cleared = client.patch(f"/api/action-items/{item['id']}", json={"assignee_id": None}).json()
    assert cleared["assignee_id"] is None

def test_delete_action_item(client):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x"}).json()
    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204
    assert client.patch(f"/api/action-items/{item['id']}", json={"text": "y"}).status_code == 404

def test_other_users_action_item_is_404(client, db):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x"}).json()
    other = make_user(db)
    res = client.patch(f"/api/action-items/{item['id']}", json={"text": "y"}, headers={"X-User-Id": str(other.id)})
    assert res.status_code == 404

def test_removing_participant_unassigns_their_action_items(client):
    m = create(client, participants=["Emily Park"])
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x", "assignee_id": person_id(m, "Emily Park")}).json()
    res = client.patch(f"/api/meetings/{m['id']}", json={"participants": ["Priya Nair", "Marcus Chen"]})
    assert res.status_code == 200
    updated = next(a for a in res.json()["action_items"] if a["id"] == item["id"])
    assert updated["assignee_id"] is None
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(backend): action items create, update, complete and delete"`.

### Task 10: Seed data and startup seeding

**Files:**
- Create:
  - `backend/app/seed/__init__.py`, `backend/app/seed/__main__.py`, `backend/app/seed/seed.py`
  - `backend/app/seed/data/meetings.json`
  - 8 transcripts in `backend/app/seed/data/*.txt`
- Modify: `backend/app/main.py` (lifespan: `if settings.seed_on_startup: seed_database(db)`)
- Test: `backend/tests/test_seed.py`

**Interfaces (produces):**
- `seed_database(db, *, now: datetime | None = None) -> bool`:
  - `False` if `app_meta.seeded_at` exists;
  - otherwise creates every meeting through `create_meeting(..., source=<json source>, notes=<hand-written GeneratedNotes with generated_by="seed">)`, sets `seeded_at` and returns `True`.
- `python -m app.seed [--reset]`: `--reset` deletes the SQLite file from `DATABASE_URL` first (local development only).
- `meetings.json` item shape:
  ```
  {"file": "01_weekly_product_sync.txt", "title": "...", "days_ago": 0, "hours_ago": 3, "source": "seed",
   "extra_participants": [],
   "notes": {"overview": "...", "notes": ["..."], "keywords": ["..."],
             "chapters": [{"title": "...", "at": "MM:SS", "gist": "..."}],
             "action_items": [{"text": "...", "assignee": "Name" | null, "at": "MM:SS" | null, "done": bool}]}}
  ```
  Here `at` is mapped to the segment starting at or before that time. A `done` item gets `completed_at = started_at + 1 day`, clamped to `now`.
- Content follows spec §12:
  - eight meetings;
  - 40–60 segments each;
  - original dialogue between the nine fictional people;
  - "pricing" in meetings 1, 2, 3, 6 and 8;
  - every chapter and action item actually appears in its transcript;
  - meetings 6 and 8 have `source: "upload"`.

- [ ] **Step 1: Write the failing tests.**
```python
# backend/tests/test_seed.py
from datetime import datetime
from sqlalchemy import func, select
from fastapi.testclient import TestClient
from app.main import create_app
from app.models import Meeting, Participant
from app.seed.seed import seed_database
from app.services.user_service import ensure_demo_user

NOW = datetime(2026, 9, 25, 12, 0, 0)

def test_seed_creates_eight_complete_meetings(db):
    ensure_demo_user(db)
    assert seed_database(db, now=NOW) is True
    meetings = db.scalars(select(Meeting)).all()
    assert len(meetings) == 8
    for m in meetings:
        assert 40 <= len(m.segments) <= 60
        assert m.summary is not None and m.summary.generated_by == "seed"
        assert m.chapters and m.keywords and m.action_items
    assert {m.source for m in meetings} == {"seed", "upload"}

def test_seed_is_idempotent(db):
    ensure_demo_user(db)
    assert seed_database(db, now=NOW) is True
    assert seed_database(db, now=NOW) is False
    assert db.scalar(select(func.count()).select_from(Meeting)) == 8

def test_every_seeded_person_attends_a_meeting(db):
    ensure_demo_user(db)
    seed_database(db, now=NOW)
    for person in db.scalars(select(Participant)).all():
        assert person.meeting_links, person.name

def test_startup_seeding_makes_the_app_usable(settings):
    settings.seed_on_startup = True
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/meetings").json()["total"] == 8
        assert client.get("/api/meetings", params={"q": "pricing"}).json()["total"] >= 4
        newest_id = client.get("/api/meetings").json()["items"][0]["id"]
        detail = client.get(f"/api/meetings/{newest_id}").json()
        assert detail["summary"]["generated_by"] == "seed"
        assert any(a["is_done"] for a in detail["action_items"]) or len(detail["action_items"]) >= 3
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Write the eight transcripts and `meetings.json`, then implement `seed.py`, `__main__.py` and the lifespan hook.** (Add `meeting_links` back-populates on `Participant` if it's missing.)
- [ ] **Step 4: Run the full suite.** Expected: PASS. Then run `.venv/Scripts/python -m app.seed --reset` and the local server, and check `/api/meetings` in the browser.
- [ ] **Step 5: Commit, push and redeploy.** Commit with `git commit -m "feat(backend): seed eight realistic meetings on first start"`, then `git push`.
- [ ] **Step 6: Reset the database on Railway.** The schema changed after the skeleton deploy, so the old database must go. With the user in the Railway dashboard: detach and delete the volume, attach a new one at `/data`, then redeploy. Check `https://<railway>/api/meetings` → `total: 8`.

**Done when:** tests pass and the live API serves 8 seeded meetings.
**Failure / recovery:** if content writing overruns 45 minutes, ship six meetings of about 40 segments, keeping every person, date spread and the "pricing" rule. Update the tests' counts and spec §12 to match.

---

## M3: Frontend core

### Task 11: Frontend foundation (tokens, shell, API layer, shared UI, placeholder pages)

**Files:**
- Create:
  - `src/app/providers.tsx`
  - `src/components/layout/{AppShell,Sidebar,Topbar,ProfileMenu,NotificationsButton,Logo}.tsx`
  - `src/components/ui/{Button,Dialog,DropdownMenu,Avatar,AvatarStack,Skeleton,EmptyState,ComingSoon,HighlightedText}.tsx`
  - `src/lib/{types,format,colors,queries,highlight}.ts`
  - `src/app/settings/page.tsx`
  - `src/app/{integrations,analytics,team,live,askfred}/page.tsx`
  - `src/app/not-found.tsx`, `src/app/error.tsx`
  - `src/lib/format.test.ts`, `src/lib/highlight.test.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (→ `redirect("/meetings")`), `src/lib/api.ts` (all endpoint functions)

**Interfaces (produces):**
- `types.ts`: `User`, `ParticipantRef`, `MeetingParticipant`, `ParticipantListItem`, `Segment`, `Summary`, `Chapter`, `ActionItem`, `TranscriptMatch`, `MeetingListItem`, `MeetingListPage`, `MeetingDetail`, `MeetingCreateInput`, `MeetingUpdateInput`, `ActionItemCreateInput`, `ActionItemUpdateInput`, `Health`, `MeetingListParams`. Field names match the API's snake_case exactly.
- `api.ts`: `getMe`, `listMeetings(params)`, `getMeeting(id)`, `createMeeting(input)`, `importMeeting(formData)`, `updateMeeting(id, input)`, `deleteMeeting(id)`, `listParticipants(q?)`, `createActionItem(meetingId, input)`, `updateActionItem(id, input)`, `deleteActionItem(id)`, `exportMeetingUrl(id, fmt)`.
- `format.ts`:
  - `formatClock(ms)`: `"0:05"`, `"12:03"`, `"1:02:03"`;
  - `formatDuration(ms)`: `"45 sec"`, `"32 min"`, `"1 hr 5 min"`;
  - `formatMeetingDate(iso)`: local, e.g. `"Thu, Sep 25 · 10:30 AM"`;
  - `formatShortDate(iso)`.
- `colors.ts`: `participantColor(id: number): string` (a stable pick from an 8-colour palette).
- `highlight.ts`:
  - `type TextMatch = { segmentIndex: number; start: number; end: number }`;
  - `findMatches(texts: string[], query: string): TextMatch[]`: case-insensitive, non-overlapping, in order; an empty or whitespace query → `[]`;
  - `splitByRanges(text: string, ranges: {start: number; end: number}[]): { text: string; match: boolean }[]`.
- `HighlightedText` props: `{ text: string; ranges: { start: number; end: number }[]; activeRange?: { start: number; end: number } }`. Renders `<mark>` spans from `splitByRanges`, with no raw HTML. The active range gets a stronger style.
- `queries.ts`:
  - hooks `useMe`, `useMeetings(params)`, `useMeeting(id)`, `useParticipants(q)`, `useCreateMeeting`, `useImportMeeting`, `useUpdateMeeting`, `useDeleteMeeting`, `useCreateActionItem(meetingId)`, `useUpdateActionItem(meetingId)`, `useDeleteActionItem(meetingId)`;
  - query keys `['me']`, `['meetings', params]`, `['meeting', id]`, `['participants', q]`;
  - mutations invalidate `['meetings']` and the affected `['meeting', id]`.
- `providers.tsx`: `QueryClientProvider` whose `QueryCache` and `MutationCache` `onError` call `toast.error(err.detail ?? err.message)`, plus `<Toaster richColors position="bottom-right" />`.
- **Tokens** in `globals.css` via `@theme`:
  - brand purple, sidebar background, borders, text scale, radius, shadow, font;
  - taken from the user's Fireflies screenshots;
  - until those arrive, provisional values: primary `#7c3aed`, sidebar `#f8f7fc`, border `#e7e5ef`, text `#1f1d2b` / `#6b6880`, radius `10px`, Inter via `next/font`.
- **Shell:**
  - fixed left sidebar (logo, Meetings, Uploads (should), AskFred, Integrations, Analytics, Team, Live bot, Settings), with "Soon" badges on placeholders;
  - top bar with a search box (submits to `/meetings?q=`), an Upload button (opens `CreateMeetingDialog` from Task 14; until then a disabled button), a notifications button (popover "You're all caught up"), and the profile menu (name/email from `useMe`; Settings; Sign out disabled with a "Coming soon" tooltip);
  - footer note "Educational clone · not affiliated with Fireflies.ai".

- [ ] **Step 1: Write the failing test** `src/lib/format.test.ts`.
```ts
import { describe, expect, it } from "vitest";
import { formatClock, formatDuration } from "./format";

describe("formatClock", () => {
  it("formats seconds, minutes and hours", () => {
    expect(formatClock(5000)).toBe("0:05");
    expect(formatClock(723000)).toBe("12:03");
    expect(formatClock(3723000)).toBe("1:02:03");
    expect(formatClock(-10)).toBe("0:00");
  });
});
describe("formatDuration", () => {
  it("uses sec, min and hr units", () => {
    expect(formatDuration(45000)).toBe("45 sec");
    expect(formatDuration(32 * 60000 + 10000)).toBe("32 min");
    expect(formatDuration(65 * 60000)).toBe("1 hr 5 min");
  });
});
```
```ts
// src/lib/highlight.test.ts
import { describe, expect, it } from "vitest";
import { findMatches, splitByRanges } from "./highlight";

describe("findMatches", () => {
  it("is case-insensitive across segments", () => {
    expect(findMatches(["Pricing and pricing", "no", "PRICING"], "pricing")).toEqual([
      { segmentIndex: 0, start: 0, end: 7 }, { segmentIndex: 0, start: 12, end: 19 }, { segmentIndex: 2, start: 0, end: 7 }]);
  });
  it("treats regex characters literally", () => {
    expect(findMatches(["cost (est.) $5?"], "(est.)")).toEqual([{ segmentIndex: 0, start: 5, end: 11 }]);
  });
  it("ignores blank queries", () => expect(findMatches(["abc"], "  ")).toEqual([]));
});
describe("splitByRanges", () => {
  it("splits text into highlighted and plain parts", () => {
    expect(splitByRanges("hello world", [{ start: 6, end: 11 }])).toEqual([
      { text: "hello ", match: false }, { text: "world", match: true }]);
  });
});
```
- [ ] **Step 2: Run** `npx vitest run`. Expected: FAIL.
- [ ] **Step 3: Implement** everything listed under Files.
- [ ] **Step 4: Verify.** `npx vitest run` passes; `npm run lint`, `npx tsc --noEmit` and `npm run build` pass; `npm run dev` shows the shell, the placeholder pages and Settings with the demo user.
- [ ] **Step 5: Commit** with `git commit -m "feat(frontend): app shell, API layer, shared UI and placeholder pages"`.

### Task 12: Meetings library

**Files:**
- Create:
  - `src/app/meetings/page.tsx` (Suspense + `MeetingsLibrary`)
  - `src/components/meetings/{MeetingsLibrary,MeetingFilters,MeetingList,MeetingRow}.tsx`
  - `src/hooks/useMeetingFilters.ts`, `src/hooks/useDebouncedValue.ts`
  - `src/lib/filters.ts`, `src/lib/filters.test.ts`

**Interfaces (produces):**
- `type DatePreset = "any" | "7d" | "30d" | "custom"`
- `type LibraryFilters = { q: string; participantIds: number[]; preset: DatePreset; from: string | null; to: string | null; sort: "newest" | "oldest"; view: "all" | "uploads" }`
- `parseFilters(params: URLSearchParams): LibraryFilters`
- `serializeFilters(f: LibraryFilters): URLSearchParams` (defaults are omitted)
- `toApiParams(f: LibraryFilters, now: Date): MeetingListParams`:
  - `7d` → `date_from` = local midnight 6 days ago;
  - `30d` → local midnight 29 days ago;
  - `custom` → `from` is local `YYYY-MM-DD` at midnight, and `to` is the local midnight *after* the `to` date (exclusive);
  - `uploads` → `source: ["upload", "paste"]`.
- `useMeetingFilters(): { filters: LibraryFilters; setFilters(patch: Partial<LibraryFilters>): void; reset(): void }` uses `router.replace` with `scroll: false`.

- [ ] **Step 1: Write the failing test** `src/lib/filters.test.ts`.
```ts
import { describe, expect, it } from "vitest";
import { parseFilters, serializeFilters, toApiParams } from "./filters";

const now = new Date(2026, 8, 25, 15, 0, 0); // local time, Sep 25 2026 15:00

describe("filters", () => {
  it("round-trips through the URL and omits defaults", () => {
    const f = parseFilters(new URLSearchParams("q=pricing&participant=3&participant=5&sort=oldest"));
    expect(f).toMatchObject({ q: "pricing", participantIds: [3, 5], sort: "oldest", preset: "any", view: "all" });
    expect(serializeFilters(f).toString()).toBe("q=pricing&participant=3&participant=5&sort=oldest");
  });
  it("turns the 7-day preset into a local-midnight lower bound", () => {
    const p = toApiParams(parseFilters(new URLSearchParams("preset=7d")), now);
    expect(new Date(p.date_from!).getTime()).toBe(new Date(2026, 8, 19, 0, 0, 0).getTime());
    expect(p.date_to).toBeUndefined();
  });
  it("makes custom ranges inclusive of the end day", () => {
    const p = toApiParams(parseFilters(new URLSearchParams("preset=custom&from=2026-09-10&to=2026-09-12")), now);
    expect(new Date(p.date_from!).getTime()).toBe(new Date(2026, 8, 10).getTime());
    expect(new Date(p.date_to!).getTime()).toBe(new Date(2026, 8, 13).getTime());
  });
  it("maps the uploads view to imported sources", () => {
    expect(toApiParams(parseFilters(new URLSearchParams("view=uploads")), now).source).toEqual(["upload", "paste"]);
  });
});
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the filters library and hook, and the components:
  - **Search** is debounced by 300 ms.
  - **Participant filter** is a multi-select dropdown with checkboxes from `useParticipants`.
  - **Date filter** is a preset dropdown, with date inputs shown for `custom`.
  - **Sort** is a newest/oldest toggle, and "Clear filters" appears when anything is set.
  - **Each row** shows the title (link), date, duration, avatar stack with "+N", a source icon, the open-action-items count, and the transcript match snippet highlighted with `HighlightedText` against `q`. Its ⋯ menu has Edit and Delete (wired in Task 14).
  - **States:** 6 skeleton rows while loading; an empty state for no meetings; an empty state with a clear button when no filters match; an error state with Retry; and "Load more" pagination (offset += 20).
- [ ] **Step 4: Verify.** vitest, lint, tsc and build pass. In the browser:
  - every filter updates the URL;
  - refresh keeps the filters and Back restores the previous ones;
  - searching "pricing" shows snippets.
- [ ] **Step 5: Commit** with `git commit -m "feat(frontend): meetings library with URL-driven search, filters and sort"`.

### Task 13: Meeting page (transcript, player, two-way sync, transcript search, notes panel)

**Files:**
- Create:
  - `src/app/meetings/[id]/page.tsx`
  - `src/components/meeting-detail/{MeetingDetailView,MeetingHeader,NotesPanel,TranscriptPanel,TranscriptLine,TranscriptSearchBar,PlayerBar}.tsx`
  - `src/hooks/{usePlaybackClock,useActiveSegment,useTranscriptSearch,useAutoFollow}.ts`
  - `src/lib/sync.ts`, `src/lib/sync.test.ts`

**Interfaces:**
- Consumes: `findMatches`, `splitByRanges`, `TextMatch` and `HighlightedText` from Task 11.
- Produces:
  - `findActiveIndex(starts: number[], t: number): number`: the last index with `starts[i] <= t`, or −1. Binary search.
  - `usePlaybackClock(durationMs)` returns `{ currentMs, isPlaying, rate, play, pause, toggle, seek(ms), skip(deltaMs), setRate(r) }`:
  - a `requestAnimationFrame` loop;
  - the time is clamped to [0, duration];
  - it auto-pauses at the end.
- `useActiveSegment(segments, currentMs)` → the index (memoised starts plus `findActiveIndex`).
- `useTranscriptSearch(segments, query)` → `{ matches, activeIndex, next, prev, count }`.
- `useAutoFollow(containerRef, activeIndex)` → `{ following, resume }`. It pauses following for 4 s after a wheel, touch or scroll-key event.

- [ ] **Step 1: Write the failing tests.**
```ts
// src/lib/sync.test.ts
import { describe, expect, it } from "vitest";
import { findActiveIndex } from "./sync";

describe("findActiveIndex", () => {
  const starts = [0, 5000, 12000, 30000];
  it("returns -1 before the first line", () => expect(findActiveIndex([1000, 2000], 500)).toBe(-1));
  it("finds the line being spoken", () => {
    expect(findActiveIndex(starts, 0)).toBe(0);
    expect(findActiveIndex(starts, 4999)).toBe(0);
    expect(findActiveIndex(starts, 5000)).toBe(1);
    expect(findActiveIndex(starts, 29999)).toBe(2);
  });
  it("stays on the last line after it starts", () => expect(findActiveIndex(starts, 999999)).toBe(3));
  it("handles empty transcripts", () => expect(findActiveIndex([], 10)).toBe(-1));
});
```
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Layout:** a header (back link, title, date · duration, participant avatars, and a ⋯ menu for Edit, Export (should) and Delete, wired in Task 14).
  - **Two panels:** notes on the left and the transcript on the right, with a sticky `PlayerBar` at the bottom.
  - **NotesPanel** sections in this order:
    1. Keywords chips;
    2. Overview;
    3. Notes bullets;
    4. Outline (chapter rows with a timestamp chip that seeks);
    5. Action items slot (Task 14).
    It also shows a provenance label ("Seeded notes" / "Generated by rules" / "Generated by Groq · <model>").
  - **TranscriptLine** is a `React.memo` with avatar, name, clock and text. It highlights through `HighlightedText`, the active line gets a tinted background, and clicking seeks.
  - **TranscriptSearchBar:** input, "3 of 12", ↑ and ↓ buttons, Enter/Shift+Enter, and Esc to clear. The active match scrolls into view.
  - **PlayerBar:** play/pause, −15 s, +15 s, time "1:23 / 32:10", a range input for seeking, a speed menu (0.75/1/1.25/1.5/2), and a label "Simulated playback · no audio".
  - **"Resume auto-scroll"** button appears while following is paused.
  - **404:** calls `notFound()` when the API returns 404.
- [ ] **Step 4: Verify.** vitest, lint, tsc and build pass. In the browser:
  - press play and the highlight advances and scrolls;
  - clicking a line jumps the player;
  - dragging the seek bar moves the highlight;
  - a chapter click seeks;
  - search "pricing" highlights matches and the arrows move between them;
  - manual scroll pauses following and Resume works.
- [ ] **Step 5: Commit** with `git commit -m "feat(frontend): meeting page with synced transcript, player, search and AI notes"`.

### Task 14: Create, edit, delete and action-item UI

**Files:**
- Create:
  - `src/components/meetings/{MeetingForm,CreateMeetingDialog,EditMeetingDialog,DeleteMeetingDialog,ParticipantInput}.tsx`
  - `src/components/meeting-detail/{ActionItemsList,ActionItemRow}.tsx`
  - `frontend/public/samples/{standup.txt,design-review.vtt,customer-call.json}`
- Modify: `Topbar.tsx` (Upload opens the create dialog), `MeetingRow.tsx` and `MeetingHeader.tsx` (Edit/Delete menu items), `NotesPanel.tsx` (renders `ActionItemsList`)

**Interfaces (produces):**
- `MeetingForm` props: `{ mode: "create" | "edit"; value: MeetingFormValue; lockedParticipants?: string[]; onChange(v): void }`, where `MeetingFormValue = { title: string; startedAtLocal: string; participants: string[] }`. The same fields serve both dialogs.
- `CreateMeetingDialog`:
  - tabs **Upload file** (drop zone and file picker; `.txt,.vtt,.json`; 1 MB checked client-side) | **Paste transcript** (textarea with a format hint);
  - `MeetingForm` above the tabs;
  - "Download a sample" links to `/samples/*`;
  - submit → `importMeeting(FormData)` or `createMeeting(json)`;
  - on success, toast "Meeting created" and `router.push('/meetings/' + id)`;
  - the submit button shows "Generating notes…" while pending;
  - server errors appear inline and as a toast.
- `EditMeetingDialog`: speakers render as locked chips with a lock icon and the tooltip "Speaks in this meeting". Saving sends only the fields that changed.
- `DeleteMeetingDialog`: a confirm button labelled "Delete meeting". On success, toast and navigate to `/meetings` when on the meeting page.
- `ActionItemsList`:
  - an add input (Enter to add);
  - `ActionItemRow` has a checkbox (optimistic toggle with rollback), click-to-edit text (Enter saves, Esc cancels), an assignee dropdown (meeting participants plus "Unassigned"), a timestamp chip that seeks, and a delete button;
  - open items come first and done items are struck through.

- [ ] **Step 1: Write the sample files.** Each has 12–15 lines using the three formats from spec §8, and includes at least two action-item phrases ("I'll …", "<Name>, can you …").
- [ ] **Step 2: Implement** the components and wire them in.
- [ ] **Step 3: Verify** lint, tsc and build. In the browser:
  - create by upload for each sample file;
  - create by paste;
  - invalid input shows an error;
  - edit the title, add a participant, and try to remove a speaker (locked);
  - delete from the list and from the meeting page;
  - add, edit, reassign, complete, uncomplete and delete action items;
  - reload keeps everything.
- [ ] **Step 4: Commit** with `git commit -m "feat(frontend): create, edit and delete meetings and manage action items"`.

---

## M4: Polish, deploy, README draft

### Task 15: Polish UX, deploy and walk through the live site

**Files:** modify components as needed; add `src/app/meetings/[id]/loading.tsx` if useful.

- [ ] **Step 1: Polish:**
  - loaders and empty states everywhere;
  - focus-visible rings;
  - buttons disabled while pending;
  - Esc closes pop-ups;
  - at widths under 1024 px the sidebar collapses to icons and the meeting page stacks notes above the transcript;
  - long titles truncate with a tooltip.
- [ ] **Step 2:** `npm run lint && npx tsc --noEmit && npm run build` and the backend `pytest` all pass. Then `git push`, and Vercel and Railway redeploy.
- [ ] **Step 3: Walk through every row of spec §17 in the built-in browser on the live URL**, in a clean profile. Record evidence (what was checked, and screenshot filenames) in the traceability table.
- [ ] **Step 4:** Fix defects: blocking ones immediately, cosmetic ones listed for Task 18.
- [ ] **Step 5: Commit** with `git commit -m "fix: polish states, responsive layout and live-walkthrough fixes"`, then `git push`.

**Done when:** every must-have row in §17 is verified on the live site, and data survives a Railway redeploy (re-check `boot_count` and a created meeting).

### Task 16: README draft

**Files:** create `README.md` and `docs/screenshots/.gitkeep`.

- [ ] **Step 1: Write the README.** Sections:
  1. title, live links and a one-paragraph overview;
  2. features, plus an evaluator checklist (requirement → where to see it);
  3. tech stack;
  4. architecture (mermaid flowchart);
  5. project structure;
  6. local setup, tested commands for Windows and macOS/Linux:
     - backend: venv, install, `pytest`, `uvicorn`;
     - frontend: `npm ci`, `.env.local`, `npm run dev`;
  7. environment variables table (backend and frontend);
  8. seed data;
  9. database schema (mermaid `erDiagram`, plus the "why" table from spec §6);
  10. API overview (the endpoint table, with `/docs` noted);
  11. transcript formats with examples;
  12. how the AI notes work (rules vs Groq, fallback);
  13. testing;
  14. deployment (Railway volume, Vercel);
  15. assumptions and limitations;
  16. future work;
  17. disclaimer ("educational clone, not affiliated with Fireflies.ai").
- [ ] **Step 2: Commit** with `git commit -m "docs: README with setup, architecture, schema and API overview"`, then `git push`.

---

## M5: Should-haves (06:00–07:30, only if M1–M4 are verified)

### Task 17: Groq-generated notes with the rules fallback

**Files:**
- Modify: `backend/app/services/notes/llm.py` (`GroqNotesProvider`), `backend/app/services/notes/__init__.py` (`provider_from_settings`)
- Test: `backend/tests/test_notes_llm.py`

**Interfaces:**
- `GroqNotesProvider(api_key: str, model: str, timeout: float, client: httpx.Client | None = None)`:
  - `.name = f"groq:{model}"`;
  - `.generate(...)` POSTs to `https://api.groq.com/openai/v1/chat/completions` with `response_format={"type":"json_object"}` and `temperature=0.2`;
  - the system prompt states that the transcript is untrusted data, that any instructions inside it must be ignored, and that the reply must be only JSON matching the schema; the key is never logged;
  - validates with a Pydantic `LlmNotes` model;
  - clamps chapter times to [0, duration] and sorts them;
  - maps assignees by `name_key` (unknown → None) and timestamps to the nearest segment index.
  - The default model comes from Groq's current production model list, checked on console.groq.com/docs/models at implementation time and overridable through `LLM_MODEL`.

- [ ] **Step 1: Write the failing tests.** They use `httpx.Client(transport=httpx.MockTransport(handler))`:
  - valid JSON → `generated_by == "llm"`, `model` set, a chapter time of 99999 s is clamped to the duration, and an unknown assignee becomes None;
  - invalid JSON content → `generate_notes` returns `rules`;
  - HTTP 500 → `rules`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS.
- [ ] **Step 5 (user):**
  - Add `LLM_PROVIDER=groq` and `GROQ_API_KEY=...` to `backend/.env` locally and to the Railway Variables.
  - Confirm the Railway account is on the Full Trial (outbound network).
  - Create a meeting from a sample file on the live site; the notes label shows Groq.
- [ ] **Step 6: Commit** with `git commit -m "feat(backend): Groq-generated notes with validated JSON and rules fallback"`, then `git push`.

### Task 18: Match the UI to the reference screenshots

- [ ] Compare the library, meeting page, dialogs and settings side by side with the user's Fireflies screenshots.
- [ ] Adjust tokens (colours, font, radius, spacing), sidebar items and order, row layout, notes section styling and player bar styling.
- [ ] Re-run lint, tsc and build, then commit with `git commit -m "style: match Fireflies reference screenshots"` and push.

### Task 19: Export, deep links, keyboard shortcuts

**Files:**
- Backend: `services/export_service.py`, route `GET /api/meetings/{id}/export`, and `tests/test_export.py`:
  - `md` includes the title, overview, action items and transcript lines;
  - `txt` works;
  - an unknown format → 422.
- Frontend:
  - the Export menu item downloads through `exportMeetingUrl`;
  - `?t=<seconds>` seeks on load, and the "Copy link at current time" button writes it;
  - keyboard shortcuts (ignored inside inputs): Space play/pause, ←/→ ±5 s, `/` focuses transcript search.

- [ ] Test-first for the export endpoint; manual check for the frontend. Commit with `git commit -m "feat: export notes, timestamp deep links and player shortcuts"`, then push.

**Nice-to-haves** (only if Tasks 17–19 are done before 07:15): dark mode tokens and toggle; the AskFred question box (`POST /api/meetings/{id}/ask`, Groq, 503 without a provider); speaker talk-time bar; keyword filter chips in the library (`keyword` query param over `meeting_keywords`); Gemini as a second `NotesProvider`. Each gets its own commit and must not touch core flows.

**07:30 feature freeze. From here on, only fixes.**

---

## M6: Final (07:30–09:30)

### Task 20: Final README, screenshots and evidence

- [ ] Capture screenshots of the live site into `docs/screenshots/`:
  - library;
  - meeting page;
  - search;
  - create dialog;
  - edit dialog;
  - action items.
- [ ] Embed the screenshots in the README.
- [ ] Fill in spec §17 Evidence/Status for every row.
- [ ] Update the README with the final live URLs.
- [ ] Commit and push.

### Task 21: Audit, clean-clone test and submission

- [ ] **Fresh clone** into the scratchpad from GitHub. Follow the README **exactly**:
  - backend venv install → `pytest` → `uvicorn`;
  - frontend `npm ci` → `npm run build` → `npm run dev`;
  - the app runs locally with seeded data.
  Fix anything the README missed.
- [ ] **Secrets scan:** run `git log -p | grep -iE "gsk_|api[_-]?key\s*=\s*\S{8,}|secret"`. There must be no hits in committed content.
- [ ] **Repo and live checks:**
  - check `git status` is clean and `git log origin/main..main` is empty;
  - view the repo logged out: it's public and contains `frontend/` and `backend/`;
  - open the live URL in a private window: it loads in a few seconds, and one create → edit → delete round trip works.
- [ ] **Red-team checklist:**
  - empty and huge inputs;
  - special characters in search;
  - a deleted meeting's URL shows the 404 page;
  - double-submitting the create dialog;
  - behaviour when the backend is offline (toast and retry).
- [ ] **Submission:**
  - The user submits both links by 09:30 and keeps the confirmation.
  - Do the Phase 17 checklist together before pressing submit: deadline, links, visibility, branch, commit, README, demo, secrets.
