from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.time import utcnow


class Summary(Base):
    """The AI notes for a meeting (one per meeting), with where they came from."""

    __tablename__ = "summaries"
    __table_args__ = (CheckConstraint("generated_by IN ('seed', 'rules', 'llm')", name="ck_summary_generated_by"),)

    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)
    overview: Mapped[str] = mapped_column(Text)
    # Bullet notes are always read and written as a whole, so a JSON list is enough.
    notes: Mapped[list[str]] = mapped_column(JSON, default=list)
    generated_by: Mapped[str] = mapped_column(String(16))
    model: Mapped[str | None] = mapped_column(String(120))
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MeetingKeyword(Base):
    __tablename__ = "meeting_keywords"
    __table_args__ = (Index("ix_meeting_keywords_term", "term"),)

    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)
    term: Mapped[str] = mapped_column(String(80), primary_key=True)
    rank: Mapped[int] = mapped_column(Integer)


class Chapter(Base):
    """A time-stamped section of the meeting. Its end is the next chapter's start, so it isn't stored."""

    __tablename__ = "chapters"
    __table_args__ = (
        UniqueConstraint("meeting_id", "position", name="uq_chapter_position"),
        CheckConstraint("start_ms >= 0", name="ck_chapter_start_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(120))
    start_ms: Mapped[int] = mapped_column(Integer)
    gist: Mapped[str | None] = mapped_column(Text)
