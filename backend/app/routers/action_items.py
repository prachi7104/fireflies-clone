from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import User
from app.schemas.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate, TaskListOut
from app.services import action_item_service

# Created under their meeting; edited and deleted by their own id (shallow nesting).
router = APIRouter(prefix="/api", tags=["action items"])


@router.get("/action-items", response_model=TaskListOut)
def list_action_items(
    scope: Literal["mine", "all"] = Query("all"),
    status: Literal["open", "done", "all"] = Query("all"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskListOut:
    """Every action item across your meetings, for the Tasks page."""
    return TaskListOut(items=action_item_service.list_tasks(db, user, scope=scope, status=status))


@router.post("/meetings/{meeting_id}/action-items", response_model=ActionItemOut, status_code=201)
def create_action_item(
    meeting_id: int, payload: ActionItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ActionItemOut:
    item = action_item_service.create_action_item(
        db, user, meeting_id, text=payload.text, assignee_id=payload.assignee_id
    )
    return action_item_service.to_action_item_out(item)


@router.patch("/action-items/{item_id}", response_model=ActionItemOut)
def update_action_item(
    item_id: int, payload: ActionItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ActionItemOut:
    item = action_item_service.update_action_item(db, user, item_id, payload.model_dump(exclude_unset=True))
    return action_item_service.to_action_item_out(item)


@router.delete("/action-items/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Response:
    action_item_service.delete_action_item(db, user, item_id)
    return Response(status_code=204)
