from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def utcnow() -> datetime:
    """Current time as a naive UTC datetime, which is how every timestamp is stored."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_naive(value: datetime) -> datetime:
    """Normalise any datetime to naive UTC. Naive input is assumed to already be UTC."""
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _serialize_utc(value: datetime) -> str:
    return to_utc_naive(value).isoformat(timespec="seconds") + "Z"


# Datetime field that always serialises as ISO 8601 UTC with a trailing "Z".
UTCDateTime = Annotated[datetime, PlainSerializer(_serialize_utc, return_type=str)]
