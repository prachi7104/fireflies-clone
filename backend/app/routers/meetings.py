from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.deps import get_current_user, get_db, get_settings_dep
from app.models import User
from app.schemas.meeting import MeetingCreate, MeetingDetail, MeetingUpdate
from app.services import meeting_service
from app.services.notes import provider_from_settings

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.post("", response_model=MeetingDetail, status_code=201)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings_dep),
) -> MeetingDetail:
    """Create a meeting from pasted transcript text (the "Paste" tab / form)."""
    meeting = meeting_service.create_meeting(
        db,
        user,
        title=payload.title,
        raw_text=payload.transcript,
        fmt=payload.format,
        source="paste",
        started_at=payload.started_at,
        extra_participants=payload.participants,
        provider=provider_from_settings(settings),
    )
    return meeting_service.to_detail(meeting)


@router.post("/import", response_model=MeetingDetail, status_code=201)
def import_meeting(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    started_at: datetime | None = Form(None),
    participants: str | None = Form(None, description="Comma-separated names of attendees who didn't speak"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings_dep),
) -> MeetingDetail:
    """Create a meeting from an uploaded .txt, .vtt or .json transcript."""
    data = file.file.read(settings.max_upload_bytes + 1)
    text, fmt, default_title = meeting_service.read_transcript_upload(file.filename, data, settings.max_upload_bytes)
    meeting = meeting_service.create_meeting(
        db,
        user,
        title=(title or "").strip() or default_title,
        raw_text=text,
        fmt=fmt,
        source="upload",
        started_at=started_at,
        extra_participants=[name for name in (participants or "").split(",") if name.strip()],
        provider=provider_from_settings(settings),
    )
    return meeting_service.to_detail(meeting)


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> MeetingDetail:
    return meeting_service.to_detail(meeting_service.get_meeting(db, user, meeting_id))


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MeetingDetail:
    meeting = meeting_service.update_meeting(db, user, meeting_id, payload.model_dump(exclude_unset=True))
    return meeting_service.to_detail(meeting)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    meeting_service.delete_meeting(db, user, meeting_id)
    return Response(status_code=204)
