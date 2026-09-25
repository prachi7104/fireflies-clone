from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Participant, User
from app.services.names import normalize_name

DEMO_USER_NAME = "Jordan Lee"
DEMO_USER_EMAIL = "jordan@orbitlabs.example"


def ensure_demo_user(db: Session) -> User:
    """Create the default logged-in user (and their participant record) if they don't exist yet."""
    user = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    if user is None:
        user = User(name=DEMO_USER_NAME, email=DEMO_USER_EMAIL)
        db.add(user)
        db.flush()

    display, key = normalize_name(DEMO_USER_NAME)
    person = db.scalar(select(Participant).where(Participant.name_key == key))
    if person is None:
        db.add(Participant(name=display, name_key=key, email=DEMO_USER_EMAIL, user_id=user.id))
    elif person.user_id is None:
        person.user_id = user.id
    db.commit()
    return user
