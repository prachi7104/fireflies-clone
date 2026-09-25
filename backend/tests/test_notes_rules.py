from app.services.notes.rules import generate_rules_notes
from app.services.transcript_parser import ParsedSegment

PEOPLE = ["Priya Nair", "Marcus Chen", "Emily Park"]
SEGMENTS = [
    ParsedSegment("Priya Nair", 0, 40000, "Welcome everyone. Today we need to finalize the pricing page and agree on the launch timeline."),
    ParsedSegment("Marcus Chen", 40000, 90000, "The pricing page design is nearly ready. I'll share the final pricing page mockups by Friday."),
    ParsedSegment("Priya Nair", 90000, 150000, "Great work. Marcus, can you also update the onboarding checklist before the launch?"),
    ParsedSegment("Emily Park", 150000, 220000, "For the launch timeline we need to confirm the press date with the marketing agency this week."),
    ParsedSegment("Marcus Chen", 220000, 290000, "Customer interviews showed the annual plan toggle on the pricing page confused people."),
    ParsedSegment("Emily Park", 290000, 360000, "Let's run a small experiment on the annual plan toggle after the launch timeline is locked."),
]


def notes():
    return generate_rules_notes("Weekly Product Sync", PEOPLE, SEGMENTS, 360000)


def test_output_is_deterministic():
    assert notes() == notes()


def test_generated_by_rules_without_model():
    n = notes()
    assert n.generated_by == "rules" and n.model is None


def test_keywords_prefer_repeated_phrases_and_skip_stopwords():
    kws = notes().keywords
    assert "pricing page" in kws
    assert 1 <= len(kws) <= 6
    assert not {"the", "and", "we", "this"} & set(kws)
    assert not {"marcus", "priya", "emily"} & set(kws)  # names aren't topics


def test_overview_and_notes_are_sentences_from_the_transcript():
    n = notes()
    transcript = " ".join(s.text for s in SEGMENTS)
    assert n.overview
    for bullet in n.notes:
        assert bullet in transcript


def test_chapters_are_ordered_and_start_on_segment_boundaries():
    chapters = notes().chapters
    starts = [c.start_ms for c in chapters]
    assert 2 <= len(chapters) <= 8
    assert starts == sorted(starts) and starts[0] == 0
    assert set(starts) <= {s.start_ms for s in SEGMENTS}
    assert all(c.title for c in chapters)


def test_action_items_find_commitments_and_requests_with_assignees():
    items = notes().action_items
    by_text = {i.text.lower(): i for i in items}
    mockups = next(i for t, i in by_text.items() if "mockups" in t)
    assert mockups.assignee == "Marcus Chen" and mockups.segment_index == 1
    assert mockups.text.startswith("Share the final")  # commitment rewritten as a task
    checklist = next(i for t, i in by_text.items() if "onboarding checklist" in t)
    assert checklist.assignee == "Marcus Chen"
    assert any("press date" in t for t in by_text)
    assert len(items) <= 8


def test_trailing_addressee_name_is_dropped_from_the_task():
    segments = [ParsedSegment("Emily Park", 0, 5000, "Can you send me two screenshots of the timeline by Friday, Marcus?")]
    items = generate_rules_notes("Review", ["Emily Park", "Marcus Chen"], segments, 5000).action_items
    assert items[0].text == "Send me two screenshots of the timeline by Friday"
    assert items[0].assignee == "Marcus Chen"


def test_short_or_empty_transcripts_still_produce_notes():
    tiny = [ParsedSegment("Ann Lee", 0, 2000, "Hi.")]
    n = generate_rules_notes("Quick chat", ["Ann Lee"], tiny, 2000)
    assert n.overview
    assert len(n.chapters) == 1 and n.chapters[0].start_ms == 0
