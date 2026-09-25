from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.notes import Chapter, MeetingKeyword, Summary
    from app.models.participant import Participant
    from app.models.transcript import TranscriptSegment

# Children are removed by the database's ON DELETE CASCADE, so the ORM never loads them just to delete them.
_CHILDREN = {"cascade": "all, delete-orphan", "passive_deletes": True}


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("duration_ms >= 0", name="ck_meetings_duration_non_negative"),
        CheckConstraint("source IN ('seed', 'upload', 'paste')", name="ck_meetings_source"),
        Index("ix_meetings_owner_started", "owner_id", "started_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    started_at: Mapped[datetime] = mapped_column(DateTime)
    # Written once at import: transcripts are immutable, so it can never drift from the segments.
    duration_ms: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    participant_links: Mapped[list["MeetingParticipant"]] = relationship(back_populates="meeting", **_CHILDREN)
    segments: Mapped[list["TranscriptSegment"]] = relationship(order_by="TranscriptSegment.position", **_CHILDREN)
    summary: Mapped["Summary | None"] = relationship(uselist=False, **_CHILDREN)
    keywords: Mapped[list["MeetingKeyword"]] = relationship(order_by="MeetingKeyword.rank", **_CHILDREN)
    chapters: Mapped[list["Chapter"]] = relationship(order_by="Chapter.position", **_CHILDREN)
    action_items: Mapped[list["ActionItem"]] = relationship(order_by="ActionItem.id", **_CHILDREN)


class MeetingParticipant(Base):
    """Who attended which meeting: the many-to-many link between meetings and people."""

    __tablename__ = "meeting_participants"
    __table_args__ = (Index("ix_meeting_participants_participant", "participant_id"),)

    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True)

    meeting: Mapped["Meeting"] = relationship(back_populates="participant_links")
    participant: Mapped["Participant"] = relationship(back_populates="meeting_links", lazy="joined")
