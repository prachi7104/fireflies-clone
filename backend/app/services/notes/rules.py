"""Deterministic meeting notes built from the transcript alone: no network, no randomness.

Classic extractive summarisation:
- phrases that repeat become keywords;
- sentences dense in frequent words become the overview and bullet notes;
- the timeline is cut into equal chapters titled by their own keywords;
- sentences that sound like commitments or requests become action items.
"""

import math
import re
from collections import Counter

from app.services.notes.types import GeneratedActionItem, GeneratedChapter, GeneratedNotes
from app.services.transcript_parser import ParsedSegment

MAX_KEYWORDS = 6
OVERVIEW_SENTENCES = 3
MAX_NOTES = 6
MAX_ACTION_ITEMS = 8
MIN_SENTENCE_WORDS, MAX_SENTENCE_WORDS = 6, 40
MIN_TASK_WORDS = 3

STOPWORDS = frozenset(
    """
    a about above after again against all also am an and any are as at be because been before being below between
    both but by can could did do does doing down during each few for from further had has have having he her here
    hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off
    on once only or other our ours ourselves out over own same she should so some such than that the their theirs
    them themselves then there these they this those through to too under until up very was we were what when where
    which while who whom why will with would you your yours yourself yourselves
    i'll we'll you'll it's that's let's don't can't won't i'm we're they're you're i've we've isn't aren't didn't
    doesn't wasn't there's what's he's she's they'll
    yeah yes okay um uh like really actually basically gonna wanna kind sort thing things stuff lot lots maybe well
    right good great sure think know mean get got going want need make let see say said one two three still even much
    many bit way yet today week time something anything everything everyone anyone someone able already around back
    first last next new since though thanks thank hey hello please probably definitely pretty quite done sounds look
    looks looking sense point part take put come keep feel try day days
    """.split()
)

_WORD = re.compile(r"[a-z][a-z'-]*")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
_CAPITALISED = re.compile(r"\b[A-Z][a-z]+\b")

# "Priya will send the deck" → Priya owns the task.
_NAMED_COMMITMENT = re.compile(r"\b(?P<name>[A-Z][a-z]+) (?:will|is going to)\s+")
# Phrases that introduce a task; the task is the text that follows.
_LEAD_IN = re.compile(
    r"\b(?:(?P<self>i'll|i will|i can|i'm going to|i am going to)"
    r"|(?P<group>we'll|we will|we need to|we should|we have to|let's|let us|need to)"
    r"|(?P<request>can you|could you|would you|please))\s+(?:also\s+|just\s+|quickly\s+)?",
    re.IGNORECASE,
)
# Phrases that mark the whole sentence as a task.
_MARKER = re.compile(
    r"\b(?:follow[- ]up|action item|to-?do|by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|next week|eod"
    r"|end of (?:the )?day))\b",
    re.IGNORECASE,
)


def generate_rules_notes(
    title: str, participants: list[str], segments: list[ParsedSegment], duration_ms: int
) -> GeneratedNotes:
    names = set(participants) | {segment.speaker for segment in segments}
    excluded = {word.lower() for name in names for word in name.split()}

    unigrams, bigrams = _count_phrases([segment.text for segment in segments], excluded)
    keywords = _pick_keywords(unigrams, bigrams, MAX_KEYWORDS, min_count=2)
    if len(keywords) < 3:
        keywords = _pick_keywords(unigrams, bigrams, MAX_KEYWORDS, min_count=1)

    ranked = _rank_sentences(segments, unigrams, excluded)
    overview_picks = sorted(ranked[:OVERVIEW_SENTENCES])
    note_picks = sorted(ranked[OVERVIEW_SENTENCES : OVERVIEW_SENTENCES + MAX_NOTES])
    overview = " ".join(sentence for *_, sentence in overview_picks)
    if not overview and segments:
        overview = segments[0].text[:280]

    return GeneratedNotes(
        overview=overview,
        notes=[sentence for *_, sentence in note_picks],
        keywords=keywords,
        chapters=_chapters(segments, duration_ms, excluded, unigrams),
        action_items=_action_items(segments, participants),
        generated_by="rules",
    )


def _split_sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in _SENTENCE_END.split(text) if sentence.strip()]


def _tokens(text: str, excluded: set[str]) -> list[str | None]:
    """Content words in order. None marks a removed word, so a bigram never spans a gap."""
    tokens: list[str | None] = []
    for raw in _WORD.findall(text.lower().replace("’", "'")):
        word = raw.strip("'-")
        if word.endswith("'s"):
            word = word[:-2]
        keep = len(word) >= 3 and word not in STOPWORDS and word not in excluded
        tokens.append(word if keep else None)
    return tokens


def _count_phrases(texts: list[str], excluded: set[str]) -> tuple[Counter, Counter]:
    unigrams: Counter = Counter()
    bigrams: Counter = Counter()
    for text in texts:
        for sentence in _split_sentences(text):
            tokens = _tokens(sentence, excluded)
            unigrams.update(token for token in tokens if token)
            bigrams.update(f"{a} {b}" for a, b in zip(tokens, tokens[1:]) if a and b and a != b)
    return unigrams, bigrams


def _pick_keywords(unigrams: Counter, bigrams: Counter, limit: int, min_count: int) -> list[str]:
    """Highest-scoring phrases first; a repeated two-word phrase beats its single words."""
    candidates = [(count * 1.5, phrase) for phrase, count in bigrams.items() if count >= max(2, min_count)]
    candidates += [(float(count), word) for word, count in unigrams.items() if count >= min_count]
    # Best score first; on a tie the longer (more specific) phrase wins, then alphabetical for stability.
    candidates.sort(key=lambda candidate: (-candidate[0], -len(candidate[1].split()), candidate[1]))
    chosen: list[str] = []
    used_words: set[str] = set()
    for _score, phrase in candidates:
        words = set(phrase.split())
        if words & used_words:
            continue
        chosen.append(phrase)
        used_words |= words
        if len(chosen) == limit:
            break
    return chosen


def _sentence_score(sentence: str, weights: Counter, excluded: set[str]) -> float:
    word_count = len(sentence.split())
    return sum(weights[token] for token in _tokens(sentence, excluded) if token) / math.sqrt(word_count)


def _rank_sentences(
    segments: list[ParsedSegment], weights: Counter, excluded: set[str]
) -> list[tuple[int, int, str]]:
    """Candidate sentences as (segment index, sentence index, text), best first."""
    scored = []
    for segment_index, segment in enumerate(segments):
        for sentence_index, sentence in enumerate(_split_sentences(segment.text)):
            if MIN_SENTENCE_WORDS <= len(sentence.split()) <= MAX_SENTENCE_WORDS:
                score = _sentence_score(sentence, weights, excluded)
                scored.append((-score, segment_index, sentence_index, sentence))
    scored.sort()
    return [(segment_index, sentence_index, sentence) for _, segment_index, sentence_index, sentence in scored]


def _chapters(
    segments: list[ParsedSegment], duration_ms: int, excluded: set[str], weights: Counter
) -> list[GeneratedChapter]:
    if not segments:
        return []
    count = min(max(2, min(8, round(duration_ms / 60_000 / 5))), len(segments))
    window = max(1, math.ceil(max(duration_ms, 1) / count))
    groups: dict[int, list[int]] = {}
    for index, segment in enumerate(segments):
        groups.setdefault(min(segment.start_ms // window, count - 1), []).append(index)

    chapters = []
    for key in sorted(groups):
        members = [segments[i] for i in groups[key]]
        unigrams, bigrams = _count_phrases([segment.text for segment in members], excluded)
        title = " & ".join(phrase.title() for phrase in _pick_keywords(unigrams, bigrams, 2, min_count=1))
        best = _rank_sentences(members, weights, excluded)
        chapters.append(
            GeneratedChapter(
                title=title or "Discussion",
                start_ms=members[0].start_ms,
                gist=best[0][2] if best else None,
            )
        )
    return chapters


def _action_items(segments: list[ParsedSegment], participants: list[str]) -> list[GeneratedActionItem]:
    first_names: dict[str, str | None] = {}
    for name in participants:
        first = name.split()[0]
        first_names[first] = None if first in first_names else name  # an ambiguous first name matches no one

    items: list[GeneratedActionItem] = []
    seen: set[str] = set()
    for index, segment in enumerate(segments):
        for sentence in _split_sentences(segment.text):
            found = _task_from_sentence(sentence, segment.speaker, first_names)
            if found is None:
                continue
            text, assignee = found
            key = re.sub(r"[^a-z0-9 ]", "", text.lower())
            if key in seen:
                continue
            seen.add(key)
            items.append(GeneratedActionItem(text=text, assignee=assignee, segment_index=index))
            if len(items) == MAX_ACTION_ITEMS:
                return items
    return items


def _task_from_sentence(
    sentence: str, speaker: str, first_names: dict[str, str | None]
) -> tuple[str, str | None] | None:
    clean = sentence.replace("’", "'").strip()
    addressed = next(
        (first_names[word] for word in _CAPITALISED.findall(clean) if first_names.get(word) not in (None, speaker)),
        None,
    )
    named = _NAMED_COMMITMENT.search(clean)
    if named and first_names.get(named["name"]) not in (None, speaker):
        task, assignee = clean[named.end() :], first_names[named["name"]]
    elif lead_in := _LEAD_IN.search(clean):
        task = clean[lead_in.end() :]
        assignee = addressed if lead_in["request"] else speaker
    elif _MARKER.search(clean):
        task, assignee = clean, addressed or speaker
    else:
        return None

    task = task.strip().rstrip(".?!").strip()
    # "…by Friday, Marcus" → the name says who it's for, not what to do.
    trailing = re.search(r",\s*([A-Z][a-z]+)$", task)
    if trailing and first_names.get(trailing.group(1)):
        task = task[: trailing.start()].strip()
    if len(task) > 160:
        task = task[:157].rsplit(" ", 1)[0] + "…"
    if len(task.split()) < MIN_TASK_WORDS:
        return None
    return task[:1].upper() + task[1:], assignee
