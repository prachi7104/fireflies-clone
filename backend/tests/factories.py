"""Test helpers that insert rows directly through the models (bypassing the services)."""

from app.core.time import utcnow
from app.models import Meeting, MeetingParticipant, Participant, TranscriptSegment, User
from app.services.names import normalize_name


def make_user(db, name: str = "Other User", email: str = "other@orbitlabs.example") -> User:
    user = User(name=name, email=email)
    db.add(user)
    db.commit()
    return user


def make_meeting_rows(
    db,
    owner: User,
    *,
    title: str = "Sync",
    people: tuple[str, ...] = ("Ann Lee", "Bob Stone"),
    lines: tuple[tuple[str, int, int, str], ...] = (("Ann Lee", 0, 5000, "We should review pricing"),),
) -> Meeting:
    participants = {}
    for raw in people:
        display, key = normalize_name(raw)
        participant = Participant(name=display, name_key=key)
        db.add(participant)
        participants[display] = participant
    db.flush()

    duration = max((end for _, _, end, _ in lines), default=0)
    meeting = Meeting(owner_id=owner.id, title=title, started_at=utcnow(), duration_ms=duration, source="paste")
    db.add(meeting)
    db.flush()
    for participant in participants.values():
        db.add(MeetingParticipant(meeting_id=meeting.id, participant_id=participant.id))
    db.flush()
    for position, (speaker, start, end, text) in enumerate(lines):
        db.add(
            TranscriptSegment(
                meeting_id=meeting.id,
                position=position,
                speaker_id=participants[speaker].id,
                start_ms=start,
                end_ms=end,
                text=text,
            )
        )
    db.commit()
    return meeting
