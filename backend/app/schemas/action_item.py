from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.core.time import UTCDateTime

TaskText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ActionItemOut(BaseModel):
    id: int
    meeting_id: int
    text: str
    assignee_id: int | None
    segment_id: int | None
    start_ms: int | None  # where in the recording it was mentioned, for click-to-seek
    is_done: bool
    completed_at: UTCDateTime | None
    source: str
    created_at: UTCDateTime


class ActionItemCreate(BaseModel):
    text: TaskText
    assignee_id: int | None = None


class ActionItemUpdate(BaseModel):
    """Every field is optional. Only fields present in the request are changed; null unassigns."""

    text: TaskText | None = None
    assignee_id: int | None = None
    is_done: bool | None = None
