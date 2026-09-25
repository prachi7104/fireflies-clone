"""Loads the demo meetings: original transcripts in data/*.txt plus hand-written notes in data/meetings.json.

Transcripts go through the same parser and create_meeting() path as user uploads. Dates are relative to the
first start, so the library always looks recent. The seed runs once per database (see app_meta.seeded_at).
"""

import json
from bisect import bisect_right
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.services.meeting_service import create_meeting
from app.services.meta_service import get_meta, set_meta
from app.services.notes import GeneratedActionItem, GeneratedChapter, GeneratedNotes
from app.services.transcript_parser import parse_timestamp, parse_transcript
from app.services.user_service import ensure_demo_user

DATA_DIR = Path(__file__).parent / "data"
SEEDED_KEY = "seeded_at"


def seed_database(db: Session, *, now: datetime | None = None) -> bool:
    """Create the demo meetings. Returns False (and changes nothing) if this database was already seeded."""
    if get_meta(db, SEEDED_KEY):
        return False
    now = now or utcnow()
    owner = ensure_demo_user(db)
    entries = json.loads((DATA_DIR / "meetings.json").read_text(encoding="utf-8"))

    for entry in entries:
        raw = (DATA_DIR / entry["file"]).read_text(encoding="utf-8")
        starts = [segment.start_ms for segment in parse_transcript(raw, "txt")]
        started_at = now - timedelta(days=entry["days_ago"], hours=entry["hours_ago"])
        meeting = create_meeting(
            db,
            owner,
            title=entry["title"],
            raw_text=raw,
            fmt="txt",
            source=entry["source"],
            started_at=started_at,
            extra_participants=entry.get("extra_participants", []),
            notes=_notes_from_entry(entry["notes"], starts),
        )
        # Items are stored in the order they're listed, so the JSON's done flags line up with them.
        for item, spec in zip(meeting.action_items, entry["notes"]["action_items"]):
            if spec.get("done"):
                item.is_done = True
                item.completed_at = min(started_at + timedelta(days=1), now)
        db.commit()

    set_meta(db, SEEDED_KEY, now.isoformat())
    return True


def _segment_index(starts: list[int], at: str) -> int:
    """The transcript line being spoken at a given "MM:SS"."""
    return max(0, bisect_right(starts, parse_timestamp(at)) - 1)


def _notes_from_entry(notes: dict, starts: list[int]) -> GeneratedNotes:
    return GeneratedNotes(
        overview=notes["overview"],
        notes=list(notes["notes"]),
        keywords=list(notes["keywords"]),
        chapters=[
            GeneratedChapter(title=chapter["title"], start_ms=parse_timestamp(chapter["at"]), gist=chapter.get("gist"))
            for chapter in notes["chapters"]
        ],
        action_items=[
            GeneratedActionItem(
                text=item["text"],
                assignee=item.get("assignee"),
                segment_index=_segment_index(starts, item["at"]) if item.get("at") else None,
            )
            for item in notes["action_items"]
        ],
        generated_by="seed",
    )
