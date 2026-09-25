import pytest
from sqlalchemy import select

from app.models import User
from app.services.search_service import MeetingFilters, build_fts_query, escape_like, list_meetings
from app.services.user_service import DEMO_USER_EMAIL


def make(client, title, started_at, transcript, participants=()):
    res = client.post(
        "/api/meetings",
        json={"title": title, "started_at": started_at, "transcript": transcript, "participants": list(participants)},
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture
def three(client):
    a = make(client, "Roadmap Review", "2026-09-01T10:00:00Z",
             "[00:00] Priya Nair: The Q4 roadmap has three themes.\n[00:30] Marcus Chen: Mobile first.")
    b = make(client, "Design Critique", "2026-09-10T10:00:00Z",
             "[00:00] Marcus Chen: The onboarding flow needs fewer steps.\n[00:40] Emily Park: Agreed.", ["Sofia Alvarez"])
    c = make(client, "Customer Call", "2026-09-20T10:00:00Z",
             "[00:00] Sofia Alvarez: They asked about pricing tiers.\n[00:25] Hannah Schmidt: Yes, pricing matters.")
    return a, b, c


def titles(res):
    return [item["title"] for item in res.json()["items"]]


def test_build_fts_query_quotes_tokens_and_prefixes_last():
    assert build_fts_query("pricing pa") == '"pricing" "pa"*'
    assert build_fts_query('"; DROP') == '"DROP"*'
    assert build_fts_query("*** ()") is None
    assert build_fts_query("__") is None


def test_escape_like():
    assert escape_like("50%_off\\") == "50\\%\\_off\\\\"


def test_default_sort_is_newest_first(client, three):
    assert titles(client.get("/api/meetings")) == ["Customer Call", "Design Critique", "Roadmap Review"]


def test_sort_oldest(client, three):
    assert titles(client.get("/api/meetings", params={"sort": "oldest"}))[0] == "Roadmap Review"


def test_q_matches_title_case_insensitively(client, three):
    assert titles(client.get("/api/meetings", params={"q": "design"})) == ["Design Critique"]


def test_q_matches_participant_name(client, three):
    assert set(titles(client.get("/api/meetings", params={"q": "sofia"}))) == {"Design Critique", "Customer Call"}


def test_q_matches_transcript_text_with_match_snippet(client, three):
    res = client.get("/api/meetings", params={"q": "roadm"})
    item = res.json()["items"][0]
    assert item["title"] == "Roadmap Review"
    assert "roadmap" in item["match"]["text"].lower() and item["match"]["start_ms"] == 0


def test_q_with_special_characters_never_errors(client, three):
    for q in ['"', "*", "(", "pricing OR", "NEAR(", "%", "_", "\\", "a:b", "'", "__"]:
        assert client.get("/api/meetings", params={"q": q}).status_code == 200, q


def test_filter_by_participants_matches_any(client, three):
    people = {p["name"]: p["id"] for p in client.get("/api/participants").json()}
    res = client.get("/api/meetings", params={"participant_id": [people["Priya Nair"], people["Hannah Schmidt"]]})
    assert set(titles(res)) == {"Roadmap Review", "Customer Call"}


def test_filter_by_date_range_inclusive_start_exclusive_end(client, three):
    res = client.get("/api/meetings", params={"date_from": "2026-09-10T10:00:00Z", "date_to": "2026-09-20T10:00:00Z"})
    assert titles(res) == ["Design Critique"]


def test_filter_by_source(client, three):
    assert client.get("/api/meetings", params={"source": ["upload"]}).json()["total"] == 0
    assert client.get("/api/meetings", params={"source": ["paste", "upload"]}).json()["total"] == 3


def test_pagination_reports_total(client, three):
    body = client.get("/api/meetings", params={"limit": 2, "offset": 0}).json()
    assert body["total"] == 3 and len(body["items"]) == 2 and body["limit"] == 2
    assert len(client.get("/api/meetings", params={"limit": 2, "offset": 2}).json()["items"]) == 1


def test_list_item_shape(client, three):
    item = client.get("/api/meetings").json()["items"][0]
    assert set(item) >= {"id", "title", "started_at", "duration_ms", "source", "participants", "open_action_items", "match"}
    assert item["match"] is None


def test_participants_endpoint_counts_meetings(client, three):
    people = {p["name"]: p for p in client.get("/api/participants").json()}
    assert people["Marcus Chen"]["meeting_count"] == 2
    assert [p["name"] for p in client.get("/api/participants", params={"q": "han"}).json()] == ["Hannah Schmidt"]


def test_transcript_search_falls_back_to_like_without_fts(client, db, three):
    owner = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    page = list_meetings(db, owner, MeetingFilters(q="roadmap"), use_fts=False)
    assert [item.title for item in page.items] == ["Roadmap Review"]
    assert page.items[0].match is not None
