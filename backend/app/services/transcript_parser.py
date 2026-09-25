"""Turns .txt, .vtt and .json transcripts into one normalised list of segments.

Upload and paste both come through here, so every meeting is read by the same rules.
"""

import json
import re
from dataclasses import dataclass, replace
from typing import Literal

from app.core.errors import InvalidInputError

MAX_SEGMENTS = 5000
MAX_SPEAKERS = 50
MAX_SPEAKER_LEN = 80
MAX_TEXT_LEN = 5000
WORDS_PER_MINUTE = 150
MIN_SEGMENT_MS = 2000
UNKNOWN_SPEAKER = "Unknown speaker"

Format = Literal["txt", "vtt", "json"]


@dataclass(frozen=True)
class ParsedSegment:
    speaker: str
    start_ms: int
    end_ms: int
    text: str


class TranscriptParseError(InvalidInputError):
    """The transcript couldn't be read. The message says where and why."""


@dataclass
class _Draft:
    """A segment before timing is resolved. line_no is set for TXT input, for error messages."""

    speaker: str
    start_ms: int | None
    end_ms: int | None
    text: str
    line_no: int | None = None


_TIMESTAMP = r"(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?"
_TIMED_LINE = re.compile(rf"^\s*\[?(?P<ts>{_TIMESTAMP})\]?\s+(?P<speaker>[^:\[\]]{{1,80}}?):\s+(?P<text>\S.*)$")
# An untimed speaker is one to four capitalised words followed by a colon, e.g. "Priya Nair: ...".
_UNTIMED_LINE = re.compile(r"^\s*(?P<speaker>[A-Z][\w.'-]*(?: [A-Z][\w.'-]*){0,3}):\s+(?P<text>\S.*)$")
_VTT_TIMING = re.compile(rf"^\s*(?P<start>{_TIMESTAMP})\s*-->\s*(?P<end>{_TIMESTAMP})")
_VTT_VOICE = re.compile(r"<v(?:\.[^\s>]+)*\s+(?P<name>[^>]+)>")
_TAG = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")


def parse_timestamp(value: str | int | float) -> int:
    """Seconds (number) or "SS" / "MM:SS" / "HH:MM:SS" with optional .fff or ,fff → milliseconds."""
    if isinstance(value, bool):
        raise ValueError("timestamp must be a number or a time string")
    if isinstance(value, (int, float)):
        if value < 0:
            raise ValueError("timestamp cannot be negative")
        return round(value * 1000)
    parts = value.strip().replace(",", ".").split(":")
    if not 1 <= len(parts) <= 3:
        raise ValueError(f"invalid timestamp {value!r}")
    seconds = float(parts[-1])
    minutes = int(parts[-2]) if len(parts) >= 2 else 0
    hours = int(parts[-3]) if len(parts) == 3 else 0
    if seconds < 0 or minutes < 0 or hours < 0:
        raise ValueError("timestamp cannot be negative")
    return round(((hours * 60 + minutes) * 60 + seconds) * 1000)


def detect_format(raw: str) -> Format:
    stripped = raw.lstrip("﻿").lstrip()
    if stripped.upper().startswith("WEBVTT"):
        return "vtt"
    if stripped and stripped[0] in "[{":
        try:
            json.loads(stripped)
            return "json"
        except ValueError:
            pass
    return "txt"


def parse_transcript(raw: str, fmt: str = "auto") -> list[ParsedSegment]:
    text = raw.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")
    if not text.strip():
        raise TranscriptParseError("Transcript is empty")
    kind = detect_format(text) if fmt == "auto" else fmt
    parser = _PARSERS.get(kind)
    if parser is None:
        raise TranscriptParseError(f"Unsupported transcript format: {fmt}")
    return _with_timings(_clean(parser(text)))


def _parse_txt(text: str) -> list[_Draft]:
    drafts: list[_Draft] = []
    seen_timed = seen_untimed = False
    for line_no, line in enumerate(text.split("\n"), start=1):
        if not line.strip():
            continue
        if match := _TIMED_LINE.match(line):
            if seen_untimed:
                raise TranscriptParseError(f"Line {line_no}: has a timestamp but earlier speaker lines don't")
            seen_timed = True
            drafts.append(_Draft(match["speaker"], _timestamp(match["ts"], line_no), None, match["text"], line_no))
        elif match := _UNTIMED_LINE.match(line):
            if seen_timed:
                raise TranscriptParseError(
                    f"Line {line_no}: speaker line without a timestamp; use timestamps on every speaker line or none"
                )
            seen_untimed = True
            drafts.append(_Draft(match["speaker"], None, None, match["text"], line_no))
        elif drafts:
            drafts[-1].text += " " + line.strip()  # continuation of the previous speaker
        else:
            raise TranscriptParseError(f"Line {line_no}: expected 'Speaker: text' or '[mm:ss] Speaker: text'")
    return drafts


def _parse_vtt(text: str) -> list[_Draft]:
    drafts: list[_Draft] = []
    for block in re.split(r"\n\s*\n", text):
        lines = [line for line in block.split("\n") if line.strip()]
        if lines and lines[0].strip().upper().startswith("WEBVTT"):
            lines = lines[1:]
        if not lines or lines[0].strip().upper().startswith(("NOTE", "STYLE", "REGION")):
            continue
        timing_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if timing_index is None:
            continue
        timing = _VTT_TIMING.match(lines[timing_index])
        if not timing:
            raise TranscriptParseError(f"Invalid cue timing: {lines[timing_index].strip()}")
        body = " ".join(lines[timing_index + 1 :]).strip()
        if not body:
            continue
        if voice := _VTT_VOICE.search(body):
            speaker, content = voice["name"], _TAG.sub("", body)
        else:
            content = _TAG.sub("", body)
            if prefixed := _UNTIMED_LINE.match(content):
                speaker, content = prefixed["speaker"], prefixed["text"]
            else:
                speaker = UNKNOWN_SPEAKER
        start = _timestamp(timing["start"], None)
        end = _timestamp(timing["end"], None)
        drafts.append(_Draft(speaker, start, end, content))
    return drafts


def _parse_json(text: str) -> list[_Draft]:
    try:
        data = json.loads(text)
    except ValueError as exc:
        raise TranscriptParseError(f"Invalid JSON: {exc}") from None
    items = data.get("segments") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise TranscriptParseError('JSON must be a list of segments or {"segments": [...]}')

    drafts: list[_Draft] = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise TranscriptParseError(f"Segment {index}: expected an object")
        speaker, content = item.get("speaker"), item.get("text")
        if not isinstance(speaker, str) or not speaker.strip():
            raise TranscriptParseError(f"Segment {index}: 'speaker' is required")
        if not isinstance(content, str):
            raise TranscriptParseError(f"Segment {index}: 'text' is required")
        start = _json_time(item.get("start"), index, "start")
        end = _json_time(item.get("end"), index, "end")
        drafts.append(_Draft(speaker, start, end, content))

    has_start = [draft.start_ms is not None for draft in drafts]
    if any(has_start) and not all(has_start):
        raise TranscriptParseError(f"Segment {has_start.index(False) + 1}: 'start' is missing but other segments have it")
    return drafts


def _clean(drafts: list[_Draft]) -> list[_Draft]:
    """Collapse whitespace, drop empty lines and enforce the size limits."""
    cleaned: list[_Draft] = []
    for draft in drafts:
        speaker = _WHITESPACE.sub(" ", draft.speaker).strip() or UNKNOWN_SPEAKER
        content = _WHITESPACE.sub(" ", draft.text).strip()
        where = f"Line {draft.line_no}" if draft.line_no else f"Segment by {speaker[:40]}"
        if len(speaker) > MAX_SPEAKER_LEN:
            raise TranscriptParseError(f"{where}: speaker name is longer than {MAX_SPEAKER_LEN} characters")
        if len(content) > MAX_TEXT_LEN:
            raise TranscriptParseError(f"{where}: text is longer than {MAX_TEXT_LEN} characters")
        if content:
            cleaned.append(replace(draft, speaker=speaker, text=content))

    if not cleaned:
        raise TranscriptParseError("Transcript is empty: no speech found")
    if len(cleaned) > MAX_SEGMENTS:
        raise TranscriptParseError(f"Too many segments (max {MAX_SEGMENTS})")
    if len({draft.speaker.casefold() for draft in cleaned}) > MAX_SPEAKERS:
        raise TranscriptParseError(f"Too many speakers (max {MAX_SPEAKERS})")
    return cleaned


def _with_timings(drafts: list[_Draft]) -> list[ParsedSegment]:
    if all(draft.start_ms is None for draft in drafts):
        return _estimated_timeline(drafts)

    ordered = sorted(drafts, key=lambda draft: draft.start_ms)  # stable: ties keep input order
    segments = []
    for index, draft in enumerate(ordered):
        next_start = ordered[index + 1].start_ms if index + 1 < len(ordered) else None
        segments.append(ParsedSegment(draft.speaker, draft.start_ms, _end_ms(draft, next_start), draft.text))
    return segments


def _estimated_timeline(drafts: list[_Draft]) -> list[ParsedSegment]:
    """No timestamps at all: lay the lines end to end at an estimated speaking speed."""
    segments, clock = [], 0
    for draft in drafts:
        duration = _estimate_ms(draft.text)
        segments.append(ParsedSegment(draft.speaker, clock, clock + duration, draft.text))
        clock += duration
    return segments


def _end_ms(draft: _Draft, next_start: int | None) -> int:
    """The given end, else where the next line starts, else an estimate."""
    if draft.end_ms is not None and draft.end_ms >= draft.start_ms:
        return draft.end_ms
    if next_start is not None and next_start > draft.start_ms:
        return next_start
    return draft.start_ms + _estimate_ms(draft.text)


def _estimate_ms(text: str) -> int:
    """Speaking time at 150 words per minute (400 ms per word), at least two seconds."""
    return max(MIN_SEGMENT_MS, len(text.split()) * 60_000 // WORDS_PER_MINUTE)


def _timestamp(value: str, line_no: int | None) -> int:
    try:
        return parse_timestamp(value)
    except ValueError:
        where = f"Line {line_no}: " if line_no else ""
        raise TranscriptParseError(f"{where}invalid timestamp '{value}'") from None


def _json_time(value: object, index: int, field: str) -> int | None:
    if value is None:
        return None
    try:
        return parse_timestamp(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise TranscriptParseError(f"Segment {index}: invalid '{field}' value") from None


_PARSERS = {"txt": _parse_txt, "vtt": _parse_vtt, "json": _parse_json}
