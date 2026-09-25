"""Creating, reading, updating and deleting meetings. All meeting business rules live here."""

from collections.abc import Sequence
from datetime import datetime
from pathlib import PurePath
from typing import Literal

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, InvalidInputError, NotFoundError, PayloadTooLargeError, UnsupportedMediaError
from app.core.time import to_utc_naive, utcnow
from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingKeyword,
    MeetingParticipant,
    Participant,
    Summary,
    TranscriptSegment,
    User,
)
from app.schemas.meeting import ChapterOut, MeetingDetail, SegmentOut, SummaryOut
from app.schemas.participant import MeetingParticipantOut
from app.services.action_item_service import to_action_item_out
from app.services.names import normalize_name
from app.services.notes import GeneratedActionItem, GeneratedChapter, GeneratedNotes, NotesProvider, generate_notes
from app.services.participant_service import get_or_create_participants
from app.services.transcript_parser import ParsedSegment, parse_transcript

Source = Literal["seed", "upload", "paste"]
UPLOAD_FORMATS = {".txt": "txt", ".vtt": "vtt", ".json": "json"}

_DETAIL_OPTIONS = (
    selectinload(Meeting.participant_links),
    selectinload(Meeting.segments),
    selectinload(Meeting.summary),
    selectinload(Meeting.keywords),
    selectinload(Meeting.chapters),
    selectinload(Meeting.action_items),
)


def read_transcript_upload(filename: str, data: bytes, max_bytes: int) -> tuple[str, str, str]:
    """Validate an uploaded file. Returns (text, format, default title)."""
    path = PurePath(filename or "transcript.txt")
    fmt = UPLOAD_FORMATS.get(path.suffix.lower())
    if fmt is None:
        raise UnsupportedMediaError("Upload a .txt, .vtt or .json transcript")
    if len(data) > max_bytes:
        raise PayloadTooLargeError(f"File is larger than {max_bytes // 1_000_000} MB")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise InvalidInputError("File must be UTF-8 text") from None
    title = " ".join(path.stem.replace("_", " ").replace("-", " ").split()) or "Uploaded meeting"
    return text, fmt, title[:200]


def create_meeting(
    db: Session,
    owner: User,
    *,
    title: str,
    raw_text: str,
    fmt: str = "auto",
    source: Source,
    started_at: datetime | None = None,
    extra_participants: Sequence[str] = (),
    notes: GeneratedNotes | None = None,
    provider: NotesProvider | None = None,
) -> Meeting:
    segments = parse_transcript(raw_text, fmt)
    duration_ms = max(segment.end_ms for segment in segments)
    names = _attendee_names([segment.speaker for segment in segments], extra_participants)

    # Notes come first, before any write: SQLite has a single writer, so a slow LLM call
    # must never happen while this request holds the write lock.
    if notes is None:
        notes = generate_notes(title, list(names.values()), segments, duration_ms, provider)

    people = get_or_create_participants(db, names.values())
    person_id = {person.name_key: person.id for person in people}

    meeting = Meeting(
        owner_id=owner.id,
        title=title.strip(),
        started_at=to_utc_naive(started_at) if started_at else utcnow(),
        duration_ms=duration_ms,
        source=source,
    )
    db.add(meeting)
    db.flush()
    db.add_all(MeetingParticipant(meeting_id=meeting.id, participant_id=person.id) for person in people)
    db.flush()  # attendees must exist before segments reference them (composite foreign key)

    rows = _insert_transcript(db, meeting, segments, person_id)
    _save_summary(db, meeting, notes)
    _save_keywords(db, meeting, notes.keywords)
    _save_chapters(db, meeting, notes.chapters)
    _save_action_items(db, meeting, notes.action_items, rows, person_id)
    db.commit()
    return get_meeting(db, owner, meeting.id)


def _attendee_names(speakers: list[str], extra: Sequence[str]) -> dict[str, str]:
    """Everyone who speaks, then anyone else listed: normalised name key → display name."""
    names: dict[str, str] = {}
    for raw in [*speakers, *extra]:
        display, key = normalize_name(raw)
        names.setdefault(key, display)
    return names


def _insert_transcript(
    db: Session, meeting: Meeting, segments: list[ParsedSegment], person_id: dict[str, int]
) -> list[TranscriptSegment]:
    rows = [
        TranscriptSegment(
            meeting_id=meeting.id,
            position=position,
            speaker_id=person_id[normalize_name(segment.speaker)[1]],
            start_ms=segment.start_ms,
            end_ms=segment.end_ms,
            text=segment.text,
        )
        for position, segment in enumerate(segments)
    ]
    db.add_all(rows)
    db.flush()
    return rows


def _save_summary(db: Session, meeting: Meeting, notes: GeneratedNotes) -> None:
    db.add(
        Summary(
            meeting_id=meeting.id,
            overview=notes.overview,
            notes=list(notes.notes),
            generated_by=notes.generated_by,
            model=notes.model,
            generated_at=utcnow(),
        )
    )


def _save_keywords(db: Session, meeting: Meeting, keywords: Sequence[str]) -> None:
    seen: set[str] = set()
    for term in keywords:
        term = term.strip().lower()[:80]  # stored lower-case so the topic filter is an exact, indexed match
        if term and term not in seen:
            seen.add(term)
            db.add(MeetingKeyword(meeting_id=meeting.id, term=term, rank=len(seen)))


def _save_chapters(db: Session, meeting: Meeting, chapters: Sequence[GeneratedChapter]) -> None:
    for position, chapter in enumerate(sorted(chapters, key=lambda c: c.start_ms)):
        db.add(
            Chapter(
                meeting_id=meeting.id,
                position=position,
                title=chapter.title[:120],
                start_ms=min(max(0, chapter.start_ms), meeting.duration_ms),
                gist=chapter.gist,
            )
        )


def _save_action_items(
    db: Session,
    meeting: Meeting,
    items: Sequence[GeneratedActionItem],
    rows: list[TranscriptSegment],
    person_id: dict[str, int],
) -> None:
    for item in items:
        assignee = person_id.get(normalize_name(item.assignee)[1]) if item.assignee and item.assignee.strip() else None
        in_range = item.segment_index is not None and 0 <= item.segment_index < len(rows)
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                text=item.text[:500],
                assignee_id=assignee,
                segment_id=rows[item.segment_index].id if in_range else None,
                source="ai",
            )
        )


def get_meeting(db: Session, owner: User, meeting_id: int) -> Meeting:
    """The owner's meeting with everything the detail page needs. Someone else's meeting is a 404."""
    meeting = db.scalar(
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.owner_id == owner.id)
        .options(*_DETAIL_OPTIONS)
        .execution_options(populate_existing=True)
    )
    if meeting is None:
        raise NotFoundError("Meeting not found")
    return meeting


def update_meeting(db: Session, owner: User, meeting_id: int, fields: dict) -> Meeting:
    """Apply only the fields the client sent. `participants` replaces the attendee list."""
    meeting = get_meeting(db, owner, meeting_id)
    for name in ("title", "started_at", "participants"):
        if name in fields and fields[name] is None:
            raise InvalidInputError(f"{name} cannot be empty")

    if "title" in fields:
        meeting.title = fields["title"]
    if "started_at" in fields:
        meeting.started_at = to_utc_naive(fields["started_at"])
    if "participants" in fields:
        _replace_participants(db, meeting, fields["participants"])
    meeting.updated_at = utcnow()
    db.commit()
    return get_meeting(db, owner, meeting_id)


def _replace_participants(db: Session, meeting: Meeting, names: list[str]) -> None:
    wanted_ids = {person.id for person in get_or_create_participants(db, names)}
    speaker_ids = set(
        db.scalars(select(TranscriptSegment.speaker_id).where(TranscriptSegment.meeting_id == meeting.id).distinct())
    )
    if missing := speaker_ids - wanted_ids:
        missing_names = sorted(db.scalars(select(Participant.name).where(Participant.id.in_(missing))))
        raise ConflictError(f"Cannot remove {', '.join(missing_names)}: they speak in this transcript")

    current_ids = {link.participant_id for link in meeting.participant_links}
    if removed := current_ids - wanted_ids:
        # Unassign their tasks first; the database won't allow an assignee who isn't an attendee.
        db.execute(
            update(ActionItem)
            .where(ActionItem.meeting_id == meeting.id, ActionItem.assignee_id.in_(removed))
            .values(assignee_id=None)
        )
        db.execute(
            delete(MeetingParticipant).where(
                MeetingParticipant.meeting_id == meeting.id, MeetingParticipant.participant_id.in_(removed)
            )
        )
    db.add_all(MeetingParticipant(meeting_id=meeting.id, participant_id=pid) for pid in wanted_ids - current_ids)
    db.flush()


def delete_meeting(db: Session, owner: User, meeting_id: int) -> None:
    exists = db.scalar(select(Meeting.id).where(Meeting.id == meeting_id, Meeting.owner_id == owner.id))
    if exists is None:
        raise NotFoundError("Meeting not found")
    # One statement: the database cascades to attendees, transcript, notes and action items.
    db.execute(delete(Meeting).where(Meeting.id == meeting_id))
    db.commit()


def to_detail(meeting: Meeting) -> MeetingDetail:
    first_spoke = _first_line_by_speaker(meeting)
    summary = meeting.summary
    return MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        started_at=meeting.started_at,
        duration_ms=meeting.duration_ms,
        source=meeting.source,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        participants=[
            MeetingParticipantOut(
                id=link.participant.id,
                name=link.participant.name,
                is_speaker=link.participant_id in first_spoke,
            )
            for link in _in_speaking_order(meeting.participant_links, first_spoke)
        ],
        segments=[SegmentOut.model_validate(segment, from_attributes=True) for segment in meeting.segments],
        summary=SummaryOut.model_validate(summary, from_attributes=True) if summary else None,
        keywords=[keyword.term for keyword in meeting.keywords],
        chapters=[ChapterOut.model_validate(chapter, from_attributes=True) for chapter in meeting.chapters],
        action_items=[to_action_item_out(item) for item in meeting.action_items],
    )


def _first_line_by_speaker(meeting: Meeting) -> dict[int, int]:
    first_spoke: dict[int, int] = {}
    for segment in meeting.segments:
        first_spoke.setdefault(segment.speaker_id, segment.position)
    return first_spoke


def _in_speaking_order(links: list[MeetingParticipant], first_spoke: dict[int, int]) -> list[MeetingParticipant]:
    """Speakers in the order they first spoke, then silent attendees alphabetically."""
    return sorted(
        links,
        key=lambda link: (
            link.participant_id not in first_spoke,
            first_spoke.get(link.participant_id, 0),
            link.participant.name.casefold(),
        ),
    )
