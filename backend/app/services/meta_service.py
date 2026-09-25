from sqlalchemy.orm import Session

from app.models import AppMeta


def get_meta(db: Session, key: str) -> str | None:
    row = db.get(AppMeta, key)
    return row.value if row else None


def set_meta(db: Session, key: str, value: str) -> None:
    row = db.get(AppMeta, key)
    if row:
        row.value = value
    else:
        db.add(AppMeta(key=key, value=value))
    db.commit()


def increment_boot_count(db: Session) -> int:
    """Counts app starts. If it keeps rising across deploys, the database file is persisting."""
    count = int(get_meta(db, "boot_count") or 0) + 1
    set_meta(db, "boot_count", str(count))
    return count
