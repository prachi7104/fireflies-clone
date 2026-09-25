from sqlalchemy import func, select, text

from app.models import ActionItem, TranscriptSegment
from tests.factories import make_user

TRANSCRIPT = (
    "[00:00] Priya Nair: Welcome everyone. Today we review the pricing page and the launch plan.\n"
    "[00:20] Marcus Chen: I'll send the final pricing page mockups by Friday.\n"
    "[00:45] Priya Nair: Marcus, can you also update the onboarding checklist?\n"
)


def create(client, **overrides):
    payload = {"title": "Weekly Sync", "transcript": TRANSCRIPT} | overrides
    res = client.post("/api/meetings", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def test_me_returns_demo_user(client):
    assert client.get("/api/me").json()["email"] == "jordan@orbitlabs.example"


def test_unknown_user_header_is_rejected(client):
    assert client.get("/api/me", headers={"X-User-Id": "999"}).status_code == 401


def test_create_from_pasted_text_builds_transcript_and_notes(client):
    m = create(client)
    assert m["title"] == "Weekly Sync" and m["source"] == "paste"
    assert [s["start_ms"] for s in m["segments"]] == [0, 20000, 45000]
    assert {p["name"] for p in m["participants"]} == {"Priya Nair", "Marcus Chen"}
    assert all(p["is_speaker"] for p in m["participants"])
    assert m["duration_ms"] >= 45000
    assert m["summary"]["generated_by"] == "rules"
    assert m["chapters"] and m["keywords"] and m["action_items"]
    assert m["started_at"].endswith("Z")


def test_create_with_extra_participant_who_does_not_speak(client):
    m = create(client, participants=["Emily Park"])
    emily = next(p for p in m["participants"] if p["name"] == "Emily Park")
    assert emily["is_speaker"] is False


def test_create_rejects_blank_title_and_unparseable_transcript(client):
    assert client.post("/api/meetings", json={"title": " ", "transcript": TRANSCRIPT}).status_code == 422
    assert client.post("/api/meetings", json={"title": "x", "transcript": "   "}).status_code == 422


def test_import_vtt_file(client):
    files = {"file": ("design_review.vtt", b"WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<v Ann Lee>Hi team</v>\n", "text/vtt")}
    res = client.post("/api/meetings/import", files=files)
    assert res.status_code == 201, res.text
    assert res.json()["title"] == "design review" and res.json()["source"] == "upload"


def test_import_rejects_unsupported_type(client):
    res = client.post("/api/meetings/import", files={"file": ("notes.pdf", b"%PDF-1.7", "application/pdf")})
    assert res.status_code == 415


def test_import_rejects_too_large_file(client, settings):
    big = b"[00:00] Ann Lee: " + b"a" * settings.max_upload_bytes
    res = client.post("/api/meetings/import", files={"file": ("big.txt", big, "text/plain")})
    assert res.status_code == 413


def test_get_unknown_meeting_is_404(client):
    assert client.get("/api/meetings/9999").status_code == 404


def test_other_users_meeting_is_404(client, db):
    m = create(client)
    other = make_user(db)
    assert client.get(f"/api/meetings/{m['id']}", headers={"X-User-Id": str(other.id)}).status_code == 404


def test_patch_title_only_keeps_participants(client):
    m = create(client, participants=["Emily Park"])
    res = client.patch(f"/api/meetings/{m['id']}", json={"title": "Renamed"})
    assert res.status_code == 200
    assert res.json()["title"] == "Renamed"
    assert {p["name"] for p in res.json()["participants"]} == {"Priya Nair", "Marcus Chen", "Emily Park"}


def test_patch_participants_adds_and_removes_non_speakers(client):
    m = create(client, participants=["Emily Park"])
    res = client.patch(f"/api/meetings/{m['id']}", json={"participants": ["Priya Nair", "Marcus Chen", "Ravi Menon"]})
    assert res.status_code == 200
    assert {p["name"] for p in res.json()["participants"]} == {"Priya Nair", "Marcus Chen", "Ravi Menon"}


def test_patch_cannot_remove_a_speaker(client):
    m = create(client)
    res = client.patch(f"/api/meetings/{m['id']}", json={"participants": ["Priya Nair"]})
    assert res.status_code == 409
    assert "Marcus Chen" in res.json()["detail"]


def test_delete_meeting_removes_it_and_its_children(client, db):
    m = create(client)
    assert client.delete(f"/api/meetings/{m['id']}").status_code == 204
    assert client.get(f"/api/meetings/{m['id']}").status_code == 404
    assert db.scalar(select(func.count()).select_from(TranscriptSegment)) == 0
    assert db.scalar(select(func.count()).select_from(ActionItem)) == 0
    assert db.execute(text("SELECT count(*) FROM segments_fts WHERE segments_fts MATCH 'pricing'")).scalar() == 0
