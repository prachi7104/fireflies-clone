from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow

if TYPE_CHECKING:
    from app.models.meeting import MeetingParticipant


class Participant(Base):
    """A person who appears in meetings. People are shared across meetings, not copied per meeting."""

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    # Normalised name used to recognise the same person across transcripts.
    name_key: Mapped[str] = mapped_column(String(80), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    # Set when this person is also an account (the demo user attends meetings too).
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    meeting_links: Mapped[list["MeetingParticipant"]] = relationship(back_populates="participant")
