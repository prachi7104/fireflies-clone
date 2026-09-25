from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.core.time import UTCDateTime
from app.schemas.action_item import ActionItemOut
from app.schemas.participant import MeetingParticipantOut, ParticipantRef

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
TranscriptFormat = Literal["auto", "txt", "vtt", "json"]


class MeetingCreate(BaseModel):
    title: Title
    started_at: datetime | None = None
    transcript: Annotated[str, StringConstraints(min_length=1, max_length=1_000_000)]
    format: TranscriptFormat = "auto"
    participants: Annotated[list[PersonName], Field(max_length=50)] = []


class MeetingUpdate(BaseModel):
    """Every field is optional. Only fields present in the request are changed.

    `participants` replaces the whole attendee list; people who speak in the transcript must stay.
    """

    title: Title | None = None
    started_at: datetime | None = None
    participants: Annotated[list[PersonName], Field(max_length=50)] | None = None


class SegmentOut(BaseModel):
    id: int
    position: int
    speaker_id: int
    start_ms: int
    end_ms: int
    text: str


class SummaryOut(BaseModel):
    overview: str
    notes: list[str]
    generated_by: str
    model: str | None
    generated_at: UTCDateTime


class ChapterOut(BaseModel):
    id: int
    position: int
    title: str
    start_ms: int
    gist: str | None


class TranscriptMatch(BaseModel):
    segment_id: int
    start_ms: int
    text: str


class MeetingListItem(BaseModel):
    id: int
    title: str
    started_at: UTCDateTime
    duration_ms: int
    source: str
    participants: list[ParticipantRef]
    open_action_items: int
    match: TranscriptMatch | None = None


class MeetingListPage(BaseModel):
    items: list[MeetingListItem]
    total: int
    limit: int
    offset: int


class MeetingDetail(BaseModel):
    id: int
    title: str
    started_at: UTCDateTime
    duration_ms: int
    source: str
    created_at: UTCDateTime
    updated_at: UTCDateTime
    participants: list[MeetingParticipantOut]
    segments: list[SegmentOut]
    summary: SummaryOut | None
    keywords: list[str]
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]
