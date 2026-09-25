from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.time import utcnow

if TYPE_CHECKING:
    from app.models.transcript import TranscriptSegment


class ActionItem(Base):
    __tablename__ = "action_items"
    __table_args__ = (
        # An assignee must have been in *this* meeting. NULL (unassigned) skips the check.
        ForeignKeyConstraint(
            ["meeting_id", "assignee_id"],
            ["meeting_participants.meeting_id", "meeting_participants.participant_id"],
            name="fk_action_item_assignee_in_meeting",
        ),
        CheckConstraint("source IN ('ai', 'user')", name="ck_action_item_source"),
        # Completion is state, not deletion; the two columns can never disagree.
        CheckConstraint("is_done = (completed_at IS NOT NULL)", name="ck_action_item_completion"),
        Index("ix_action_items_meeting_assignee", "meeting_id", "assignee_id"),
        Index("ix_action_items_segment", "segment_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(String(500))
    assignee_id: Mapped[int | None] = mapped_column(Integer)
    # The transcript moment where the task was mentioned, if any.
    segment_id: Mapped[int | None] = mapped_column(ForeignKey("transcript_segments.id", ondelete="SET NULL"))
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    source: Mapped[str] = mapped_column(String(8))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    segment: Mapped["TranscriptSegment | None"] = relationship(lazy="joined")
