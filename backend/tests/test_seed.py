from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import func, select

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


def test_seeded_action_items_keep_their_done_state_and_transcript_links(db):
    ensure_demo_user(db)
    seed_database(db, now=NOW)
    items = [item for m in db.scalars(select(Meeting)).all() for item in m.action_items]
    assert any(item.is_done and item.completed_at is not None for item in items)
    assert any(not item.is_done for item in items)
    assert all(item.segment_id is not None for item in items)


def test_startup_seeding_makes_the_app_usable(settings):
    settings.seed_on_startup = True
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/meetings").json()["total"] == 8
        assert client.get("/api/meetings", params={"q": "pricing"}).json()["total"] >= 4
        newest_id = client.get("/api/meetings").json()["items"][0]["id"]
        detail = client.get(f"/api/meetings/{newest_id}").json()
        assert detail["summary"]["generated_by"] == "seed"
        assert any(a["is_done"] for a in detail["action_items"]) or len(detail["action_items"]) >= 3
