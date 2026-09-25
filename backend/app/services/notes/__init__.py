"""Meeting notes: an optional LLM provider, always backed by the deterministic rules generator."""

import logging

from app.core.config import Settings
from app.services.notes.llm import NotesProvider
from app.services.notes.rules import generate_rules_notes
from app.services.notes.types import GeneratedActionItem, GeneratedChapter, GeneratedNotes
from app.services.transcript_parser import ParsedSegment

logger = logging.getLogger(__name__)

__all__ = [
    "GeneratedActionItem",
    "GeneratedChapter",
    "GeneratedNotes",
    "NotesProvider",
    "generate_notes",
    "provider_from_settings",
]


def generate_notes(
    title: str,
    participants: list[str],
    segments: list[ParsedSegment],
    duration_ms: int,
    provider: NotesProvider | None = None,
) -> GeneratedNotes:
    """Use the provider when there is one; if it fails in any way, use the rules instead."""
    if provider is not None:
        try:
            return provider.generate(title, participants, segments, duration_ms)
        except Exception as exc:  # network, timeout, bad JSON, schema mismatch: all fall back
            logger.warning("Notes provider %s failed (%s); falling back to rules", provider.name, type(exc).__name__)
    return generate_rules_notes(title, participants, segments, duration_ms)


def provider_from_settings(settings: Settings) -> NotesProvider | None:
    """The configured LLM provider, or None for rules-only notes. Groq is wired in later."""
    return None
