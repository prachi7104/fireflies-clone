from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.services.meta_service import get_meta

router = APIRouter(prefix="/api", tags=["meta"])


class HealthOut(BaseModel):
    status: str
    database: str
    fts5: bool
    llm_provider: str
    boot_count: int


@router.get("/health", response_model=HealthOut)
def health(request: Request, db: Session = Depends(get_db)) -> HealthOut:
    db.execute(text("SELECT 1"))
    return HealthOut(
        status="ok",
        database="ok",
        fts5=request.app.state.fts5_enabled,
        llm_provider=request.app.state.settings.llm_provider,
        boot_count=int(get_meta(db, "boot_count") or 0),
    )
