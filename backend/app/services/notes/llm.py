from typing import Protocol

from app.services.notes.types import GeneratedNotes
from app.services.transcript_parser import ParsedSegment


class NotesProvider(Protocol):
    """Anything that can write meeting notes, such as an LLM. Any failure falls back to the rules."""

    name: str

    def generate(
        self, title: str, participants: list[str], segments: list[ParsedSegment], duration_ms: int
    ) -> GeneratedNotes: ...
