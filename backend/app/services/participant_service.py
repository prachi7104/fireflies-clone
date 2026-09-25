from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Participant
from app.services.names import normalize_name


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
