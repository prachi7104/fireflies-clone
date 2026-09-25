from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import InvalidInputError, NotFoundError
from app.core.time import utcnow
from app.models import ActionItem, Meeting, MeetingParticipant, User
from app.schemas.action_item import ActionItemOut


def create_action_item(db: Session, owner: User, meeting_id: int, *, text: str, assignee_id: int | None) -> ActionItem:
    owned = db.scalar(select(Meeting.id).where(Meeting.id == meeting_id, Meeting.owner_id == owner.id))
    if owned is None:
        raise NotFoundError("Meeting not found")
    _check_assignee(db, meeting_id, assignee_id)
    item = ActionItem(meeting_id=meeting_id, text=text, assignee_id=assignee_id, source="user")
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_action_item(db: Session, owner: User, item_id: int, fields: dict) -> ActionItem:
    """Apply only the fields the client sent. An explicit null assignee unassigns the task."""
    item = _owned_item(db, owner, item_id)
    for name in ("text", "is_done"):
        if name in fields and fields[name] is None:
            raise InvalidInputError(f"{name} cannot be empty")

    if "text" in fields:
        item.text = fields["text"]
    if "assignee_id" in fields:
        _check_assignee(db, item.meeting_id, fields["assignee_id"])
        item.assignee_id = fields["assignee_id"]
    if "is_done" in fields and fields["is_done"] != item.is_done:
        item.is_done = fields["is_done"]
        item.completed_at = utcnow() if item.is_done else None
    db.commit()
    db.refresh(item)
    return item


def delete_action_item(db: Session, owner: User, item_id: int) -> None:
    db.delete(_owned_item(db, owner, item_id))
    db.commit()


def to_action_item_out(item: ActionItem) -> ActionItemOut:
    return ActionItemOut(
        id=item.id,
        meeting_id=item.meeting_id,
        text=item.text,
        assignee_id=item.assignee_id,
        segment_id=item.segment_id,
        start_ms=item.segment.start_ms if item.segment else None,
        is_done=item.is_done,
        completed_at=item.completed_at,
        source=item.source,
        created_at=item.created_at,
    )


def _owned_item(db: Session, owner: User, item_id: int) -> ActionItem:
    item = db.scalar(
        select(ActionItem)
        .join(Meeting, Meeting.id == ActionItem.meeting_id)
        .where(ActionItem.id == item_id, Meeting.owner_id == owner.id)
    )
    if item is None:
        raise NotFoundError("Action item not found")
    return item


def _check_assignee(db: Session, meeting_id: int, assignee_id: int | None) -> None:
    """Friendly version of the database rule: an assignee must be an attendee of this meeting."""
    if assignee_id is None:
        return
    attends = db.scalar(
        select(MeetingParticipant.participant_id).where(
            MeetingParticipant.meeting_id == meeting_id, MeetingParticipant.participant_id == assignee_id
        )
    )
    if attends is None:
        raise InvalidInputError("Assignee must be a participant of this meeting")
