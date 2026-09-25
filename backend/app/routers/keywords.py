from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import User
from app.schemas.keyword import KeywordListItem
from app.services.keyword_service import list_keywords

router = APIRouter(prefix="/api/keywords", tags=["keywords"])


@router.get("", response_model=list[KeywordListItem])
def keywords(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[KeywordListItem]:
    """Topics found in your meetings, with how many meetings mention each (the library's Topics filter)."""
    return list_keywords(db, user)
