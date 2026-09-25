from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class GeneratedChapter:
    title: str
    start_ms: int
    gist: str | None


@dataclass(frozen=True)
class GeneratedActionItem:
    text: str
    assignee: str | None  # participant display name; None means unassigned
    segment_index: int | None  # index into the parsed segments where the task was mentioned


@dataclass(frozen=True)
class GeneratedNotes:
    overview: str
    notes: list[str]
    keywords: list[str]
    chapters: list[GeneratedChapter]
    action_items: list[GeneratedActionItem]
    generated_by: Literal["seed", "rules", "llm"]
    model: str | None = None
