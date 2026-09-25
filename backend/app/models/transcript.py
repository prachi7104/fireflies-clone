from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TranscriptSegment(Base):
    """One utterance in a meeting's transcript. Segments are immutable after import."""

    __tablename__ = "transcript_segments"
    __table_args__ = (
        # The speaker must be a participant of *this* meeting, enforced by the database.
        ForeignKeyConstraint(
            ["meeting_id", "speaker_id"],
            ["meeting_participants.meeting_id", "meeting_participants.participant_id"],
            name="fk_segment_speaker_in_meeting",
        ),
        UniqueConstraint("meeting_id", "position", name="uq_segment_position"),
        Index("ix_segments_meeting_start", "meeting_id", "start_ms"),
        Index("ix_segments_meeting_speaker", "meeting_id", "speaker_id"),
        CheckConstraint("start_ms >= 0", name="ck_segment_start_non_negative"),
        CheckConstraint("end_ms >= start_ms", name="ck_segment_end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    speaker_id: Mapped[int] = mapped_column(Integer)
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
