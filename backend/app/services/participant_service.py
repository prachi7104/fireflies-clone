from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Meeting, MeetingParticipant, Participant, User
from app.schemas.participant import ParticipantListItem
from app.services.names import normalize_name
from app.services.search_service import escape_like


def list_participants(db: Session, owner: User, q: str | None = None) -> list[ParticipantListItem]:
    """People who attend the owner's meetings, with how many meetings each is in."""
    stmt = (
        select(Participant.id, Participant.name, func.count(MeetingParticipant.meeting_id))
        .join(MeetingParticipant, MeetingParticipant.participant_id == Participant.id)
        .join(Meeting, Meeting.id == MeetingParticipant.meeting_id)
        .where(Meeting.owner_id == owner.id)
        .group_by(Participant.id, Participant.name)
        .order_by(func.lower(Participant.name))
    )
    if q and q.strip():
        stmt = stmt.where(Participant.name.ilike(f"%{escape_like(q.strip())}%", escape="\\"))
    return [ParticipantListItem(id=pid, name=name, meeting_count=count) for pid, name, count in db.execute(stmt)]


def get_or_create_participants(db: Session, names: Iterable[str]) -> list[Participant]:
    """Resolve names to people, matching on the normalised name. Keeps input order and drops duplicates."""
    people: list[Participant] = []
    seen: set[str] = set()
    for raw in names:
        display, key = normalize_name(raw)
        if key in seen:
            continue
        seen.add(key)
        person = db.scalar(select(Participant).where(Participant.name_key == key))
        if person is None:
            person = Participant(name=display, name_key=key)
            db.add(person)
            db.flush()
        people.append(person)
    return people
