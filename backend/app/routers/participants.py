from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import User
from app.schemas.participant import ParticipantListItem
from app.services.participant_service import list_participants

router = APIRouter(prefix="/api/participants", tags=["participants"])


@router.get("", response_model=list[ParticipantListItem])
def participants(
    q: str | None = Query(None, max_length=80),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ParticipantListItem]:
    """People in your meetings, for the participant filter and autocomplete."""
    return list_participants(db, user, q)
