"""The meetings library query: free-text search, filters, sorting and paging."""

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, selectinload

from app.core.time import to_utc_naive
from app.models import ActionItem, Meeting, MeetingKeyword, MeetingParticipant, Participant, TranscriptSegment, User
from app.schemas.meeting import MeetingListItem, MeetingListPage, TranscriptMatch
from app.schemas.participant import ParticipantRef

# Letters and digits only: FTS5's own syntax characters can never reach MATCH.
_FTS_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)


@dataclass
class MeetingFilters:
    q: str | None = None
    participant_ids: list[int] = field(default_factory=list)
    date_from: datetime | None = None
    date_to: datetime | None = None
    sources: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    sort: Literal["newest", "oldest"] = "newest"
    limit: int = 20
    offset: int = 0


def escape_like(value: str) -> str:
    """Make %, _ and \\ match literally inside a LIKE pattern (used with ESCAPE '\\')."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def build_fts_query(q: str) -> str | None:
    """'pricing pa' → '"pricing" "pa"*': every word quoted, the last one matched as a prefix."""
    tokens = _FTS_TOKEN.findall(q)
    if not tokens:
        return None
    quoted = [f'"{token}"' for token in tokens]
    quoted[-1] += "*"
    return " ".join(quoted)


def list_meetings(db: Session, owner: User, filters: MeetingFilters, *, use_fts: bool) -> MeetingListPage:
    q = (filters.q or "").strip()
    matches = _transcript_matches(db, owner, q, use_fts) if q else {}
    conditions = _filter_conditions(owner, filters, q, matches)

    total = db.scalar(select(func.count()).select_from(Meeting).where(*conditions)) or 0
    meetings = db.scalars(
        select(Meeting)
        .where(*conditions)
        .order_by(*_sort_order(filters.sort))
        .limit(filters.limit)
        .offset(filters.offset)
        .options(selectinload(Meeting.participant_links))
    ).all()
    open_counts = _open_action_item_counts(db, [meeting.id for meeting in meetings])

    items = [_to_list_item(meeting, open_counts.get(meeting.id, 0), matches.get(meeting.id)) for meeting in meetings]
    return MeetingListPage(items=items, total=total, limit=filters.limit, offset=filters.offset)


def _filter_conditions(owner: User, filters: MeetingFilters, q: str, matches: dict[int, TranscriptMatch]) -> list:
    conditions = [Meeting.owner_id == owner.id]
    if q:
        pattern = _like_pattern(q)
        attended_by_match = (
            select(MeetingParticipant.meeting_id)
            .join(Participant, Participant.id == MeetingParticipant.participant_id)
            .where(Participant.name.ilike(pattern, escape="\\"))
        )
        conditions.append(
            or_(Meeting.title.ilike(pattern, escape="\\"), Meeting.id.in_(attended_by_match), Meeting.id.in_(list(matches)))
        )
    if filters.participant_ids:
        attended = select(MeetingParticipant.meeting_id).where(MeetingParticipant.participant_id.in_(filters.participant_ids))
        conditions.append(Meeting.id.in_(attended))
    if filters.date_from:
        conditions.append(Meeting.started_at >= to_utc_naive(filters.date_from))
    if filters.date_to:
        conditions.append(Meeting.started_at < to_utc_naive(filters.date_to))
    if filters.sources:
        conditions.append(Meeting.source.in_(filters.sources))
    if filters.keywords:
        # Topics are stored lower-case, one row per (meeting, term); the term column is indexed.
        terms = [term.strip().lower() for term in filters.keywords if term.strip()]
        conditions.append(Meeting.id.in_(select(MeetingKeyword.meeting_id).where(MeetingKeyword.term.in_(terms))))
    return conditions


def _sort_order(sort: str) -> tuple:
    if sort == "oldest":
        return Meeting.started_at.asc(), Meeting.id.asc()
    return Meeting.started_at.desc(), Meeting.id.desc()


def _open_action_item_counts(db: Session, meeting_ids: list[int]) -> dict[int, int]:
    # Counted, not stored: it changes every time an item is completed.
    rows = db.execute(
        select(ActionItem.meeting_id, func.count())
        .where(ActionItem.meeting_id.in_(meeting_ids), ActionItem.is_done.is_(False))
        .group_by(ActionItem.meeting_id)
    )
    return dict(rows.all())


def _to_list_item(meeting: Meeting, open_action_items: int, match: TranscriptMatch | None) -> MeetingListItem:
    links = sorted(meeting.participant_links, key=lambda link: link.participant.name.casefold())
    return MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        started_at=meeting.started_at,
        duration_ms=meeting.duration_ms,
        source=meeting.source,
        participants=[ParticipantRef(id=link.participant.id, name=link.participant.name) for link in links],
        open_action_items=open_action_items,
        match=match,
    )


def _like_pattern(q: str) -> str:
    return f"%{escape_like(q)}%"


def _transcript_matches(db: Session, owner: User, q: str, use_fts: bool) -> dict[int, TranscriptMatch]:
    """The best-matching transcript line per meeting, shown as a snippet under the result."""
    if use_fts:
        fts_query = build_fts_query(q)
        if fts_query is None:
            return {}
        try:
            return _first_match_per_meeting(_fts_rows(db, owner, fts_query))
        except OperationalError:
            pass  # fall back to the plain LIKE search below
    return _first_match_per_meeting(_like_rows(db, owner, _like_pattern(q)))


def _fts_rows(db: Session, owner: User, fts_query: str) -> list:
    return db.execute(
        text(
            "SELECT ts.meeting_id, ts.id, ts.start_ms, ts.text FROM segments_fts "
            "JOIN transcript_segments ts ON ts.id = segments_fts.rowid "
            "JOIN meetings m ON m.id = ts.meeting_id "
            "WHERE segments_fts MATCH :query AND m.owner_id = :owner "
            "ORDER BY bm25(segments_fts), ts.meeting_id, ts.position"
        ),
        {"query": fts_query, "owner": owner.id},
    ).all()


def _like_rows(db: Session, owner: User, pattern: str) -> list:
    return db.execute(
        select(TranscriptSegment.meeting_id, TranscriptSegment.id, TranscriptSegment.start_ms, TranscriptSegment.text)
        .join(Meeting, Meeting.id == TranscriptSegment.meeting_id)
        .where(Meeting.owner_id == owner.id, TranscriptSegment.text.ilike(pattern, escape="\\"))
        .order_by(TranscriptSegment.meeting_id, TranscriptSegment.position)
    ).all()


def _first_match_per_meeting(rows: list) -> dict[int, TranscriptMatch]:
    matches: dict[int, TranscriptMatch] = {}
    for meeting_id, segment_id, start_ms, segment_text in rows:
        matches.setdefault(meeting_id, TranscriptMatch(segment_id=segment_id, start_ms=start_ms, text=segment_text))
    return matches
