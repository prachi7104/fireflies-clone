from app.models import ActionItem
from app.schemas.action_item import ActionItemOut


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
