from pydantic import BaseModel


class KeywordListItem(BaseModel):
    term: str
    meeting_count: int
