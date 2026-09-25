from app.models import MeetingKeyword
from app.services.user_service import ensure_demo_user
from tests.factories import make_meeting_rows, make_user


def meeting_with_topics(db, owner, title, terms):
    meeting = make_meeting_rows(db, owner, title=title, people=(f"{title} Host",), lines=((f"{title} Host", 0, 5000, "Hello there"),))
    for rank, term in enumerate(terms):
        db.add(MeetingKeyword(meeting_id=meeting.id, term=term, rank=rank))
    db.commit()
    return meeting


def titles(client, query):
    return sorted(m["title"] for m in client.get(f"/api/meetings?{query}").json()["items"])


def test_filter_meetings_by_one_keyword(client, db):
    me = ensure_demo_user(db)
    meeting_with_topics(db, me, "Alpha", ["pricing page", "launch"])
    meeting_with_topics(db, me, "Beta", ["hiring"])

    assert titles(client, "keyword=pricing+page") == ["Alpha"]


def test_several_keywords_match_any_and_ignore_case(client, db):
    me = ensure_demo_user(db)
    meeting_with_topics(db, me, "Alpha", ["pricing page"])
    meeting_with_topics(db, me, "Beta", ["hiring"])
    meeting_with_topics(db, me, "Gamma", ["roadmap"])

    assert titles(client, "keyword=Pricing+Page&keyword=hiring") == ["Alpha", "Beta"]


def test_keyword_combines_with_other_filters(client, db):
    me = ensure_demo_user(db)
    meeting_with_topics(db, me, "Alpha", ["pricing page"])
    meeting_with_topics(db, me, "Beta", ["pricing page"])

    assert titles(client, "keyword=pricing+page&q=Beta") == ["Beta"]


def test_list_keywords_with_meeting_counts(client, db):
    me = ensure_demo_user(db)
    meeting_with_topics(db, me, "Alpha", ["pricing page", "launch"])
    meeting_with_topics(db, me, "Beta", ["pricing page"])

    body = client.get("/api/keywords").json()

    assert body[0] == {"term": "pricing page", "meeting_count": 2}  # most-used first
    assert {"term": "launch", "meeting_count": 1} in body


def test_keywords_are_scoped_to_your_meetings(client, db):
    other = make_user(db)
    meeting_with_topics(db, other, "Secret", ["confidential topic"])

    assert all(k["term"] != "confidential topic" for k in client.get("/api/keywords").json())
    assert titles(client, "keyword=confidential+topic") == []
