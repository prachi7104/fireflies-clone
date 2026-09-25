from collections.abc import Iterator

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import UnauthorizedError
from app.models import User
from app.services.user_service import DEMO_USER_EMAIL


def get_db(request: Request) -> Iterator[Session]:
    """One database session per request, always closed (and rolled back if uncommitted) afterwards."""
    session = request.app.state.SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_settings_dep(request: Request) -> Settings:
    return request.app.state.settings


def get_current_user(db: Session = Depends(get_db), x_user_id: int | None = Header(default=None)) -> User:
    """Mock authentication: the X-User-Id header picks the user; without it, the demo user is logged in."""
    if x_user_id is None:
        user = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    else:
        user = db.get(User, x_user_id)
    if user is None:
        raise UnauthorizedError("Unknown user")
    return user
