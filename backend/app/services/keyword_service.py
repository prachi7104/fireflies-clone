from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Meeting, MeetingKeyword, User
from app.schemas.keyword import KeywordListItem


def list_keywords(db: Session, owner: User) -> list[KeywordListItem]:
    """Topics across the owner's meetings, most-used first, for the library's topic filter."""
    count = func.count(MeetingKeyword.meeting_id)
    stmt = (
        select(MeetingKeyword.term, count)
        .join(Meeting, Meeting.id == MeetingKeyword.meeting_id)
        .where(Meeting.owner_id == owner.id)
        .group_by(MeetingKeyword.term)
        .order_by(count.desc(), MeetingKeyword.term)
    )
    return [KeywordListItem(term=term, meeting_count=meetings) for term, meetings in db.execute(stmt)]
