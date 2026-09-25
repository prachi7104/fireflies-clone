import pytest

from app.services.transcript_parser import (
    TranscriptParseError,
    detect_format,
    parse_timestamp,
    parse_transcript,
)


def test_parse_timestamp_variants():
    assert parse_timestamp("00:05") == 5000
    assert parse_timestamp("1:02:03") == 3723000
    assert parse_timestamp("00:01.5") == 1500
    assert parse_timestamp("00:00:01,250") == 1250
    assert parse_timestamp(62) == 62000
    assert parse_timestamp(1.5) == 1500


def test_detect_format():
    assert detect_format("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nhi") == "vtt"
    assert detect_format('[{"speaker": "Ann", "text": "hi"}]') == "json"
    assert detect_format("[00:01] Ann: hi") == "txt"


def test_txt_bracketed_timestamps():
    segs = parse_transcript("[00:05] Priya Nair: Let's review pricing.\n[00:12] Marcus Chen: Sounds good to me.")
    assert [(s.speaker, s.start_ms, s.end_ms) for s in segs] == [
        ("Priya Nair", 5000, 12000),
        ("Marcus Chen", 12000, 14000),
    ]
    assert segs[0].text == "Let's review pricing."


def test_txt_hours_without_brackets():
    assert parse_transcript("01:02:03 Ann Lee: Hi there")[0].start_ms == 3723000


def test_txt_continuation_line_joins_previous_segment():
    segs = parse_transcript("[00:01] Ann Lee: First part\nand the second part\n[00:09] Bob Stone: Reply")
    assert segs[0].text == "First part and the second part"
    assert len(segs) == 2


def test_txt_untimed_transcript_gets_estimated_times():
    segs = parse_transcript("Ann Lee: one two three four five six seven eight nine ten\nBob Stone: ok")
    assert (segs[0].start_ms, segs[0].end_ms) == (0, 4000)
    assert (segs[1].start_ms, segs[1].end_ms) == (4000, 6000)


def test_txt_mixing_timed_and_untimed_speaker_lines_is_rejected():
    with pytest.raises(TranscriptParseError, match="[Ll]ine 2"):
        parse_transcript("[00:01] Ann Lee: hi\nBob Stone: hello")


def test_txt_leading_text_without_speaker_is_rejected():
    with pytest.raises(TranscriptParseError, match="[Ll]ine 1"):
        parse_transcript("just some words\n[00:01] Ann Lee: hi")


def test_vtt_voice_tags_and_name_prefix():
    raw = (
        "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.500\n<v Ann Lee>Hello team</v>\n\n"
        "00:00:05.000 --> 00:00:07.000\nBob Stone: Hi Ann\n"
    )
    segs = parse_transcript(raw)
    assert [(s.speaker, s.start_ms, s.end_ms, s.text) for s in segs] == [
        ("Ann Lee", 1000, 4500, "Hello team"),
        ("Bob Stone", 5000, 7000, "Hi Ann"),
    ]


def test_vtt_cue_without_speaker_uses_unknown_speaker():
    segs = parse_transcript("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\njust words\n")
    assert segs[0].speaker == "Unknown speaker"


def test_json_list_and_object_forms():
    a = parse_transcript('[{"speaker": "Ann Lee", "start": 1.5, "text": "Hi"}]')
    b = parse_transcript('{"segments": [{"speaker": "Ann Lee", "start": "00:01.5", "end": "00:03", "text": "Hi"}]}')
    assert a[0].start_ms == 1500 and b[0].start_ms == 1500 and b[0].end_ms == 3000


def test_json_item_without_text_is_rejected():
    with pytest.raises(TranscriptParseError):
        parse_transcript('[{"speaker": "Ann Lee", "start": 0}]')


def test_segments_are_sorted_and_whitespace_collapsed():
    segs = parse_transcript("[00:10] Bob   Stone:  later   words\n[00:02] Ann Lee: earlier")
    assert [s.speaker for s in segs] == ["Ann Lee", "Bob Stone"]
    assert segs[1].text == "later words"
    assert all(s.end_ms >= s.start_ms for s in segs)


def test_empty_input_is_rejected():
    with pytest.raises(TranscriptParseError, match="empty"):
        parse_transcript("  \n  ")


def test_too_many_speakers_is_rejected():
    raw = "\n".join(f"[00:{i:02d}] Person{i}: hi" for i in range(51))
    with pytest.raises(TranscriptParseError, match="speakers"):
        parse_transcript(raw)
