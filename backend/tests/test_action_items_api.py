from tests.factories import make_user
from tests.test_meetings_api import create


def person_id(meeting, name):
    return next(p["id"] for p in meeting["participants"] if p["name"] == name)


def test_create_assigned_action_item(client):
    m = create(client)
    res = client.post(
        f"/api/meetings/{m['id']}/action-items", json={"text": "Draft recap", "assignee_id": person_id(m, "Priya Nair")}
    )
    assert res.status_code == 201
    body = res.json()
    assert body["text"] == "Draft recap" and body["source"] == "user" and body["is_done"] is False


def test_assignee_must_be_in_the_meeting(client):
    m = create(client)
    other = create(client, participants=["Ravi Menon"])
    res = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x", "assignee_id": person_id(other, "Ravi Menon")})
    assert res.status_code == 422


def test_blank_text_is_rejected(client):
    m = create(client)
    assert client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "  "}).status_code == 422


def test_complete_and_uncomplete(client):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Ship it"}).json()
    done = client.patch(f"/api/action-items/{item['id']}", json={"is_done": True}).json()
    assert done["is_done"] is True and done["completed_at"]
    undone = client.patch(f"/api/action-items/{item['id']}", json={"is_done": False}).json()
    assert undone["is_done"] is False and undone["completed_at"] is None


def test_explicit_null_unassigns_but_omitting_keeps_assignee(client):
    m = create(client)
    item = client.post(
        f"/api/meetings/{m['id']}/action-items", json={"text": "x", "assignee_id": person_id(m, "Marcus Chen")}
    ).json()
    kept = client.patch(f"/api/action-items/{item['id']}", json={"text": "renamed"}).json()
    assert kept["assignee_id"] == person_id(m, "Marcus Chen") and kept["text"] == "renamed"
    cleared = client.patch(f"/api/action-items/{item['id']}", json={"assignee_id": None}).json()
    assert cleared["assignee_id"] is None


def test_delete_action_item(client):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x"}).json()
    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204
    assert client.patch(f"/api/action-items/{item['id']}", json={"text": "y"}).status_code == 404


def test_other_users_action_item_is_404(client, db):
    m = create(client)
    item = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "x"}).json()
    other = make_user(db)
    res = client.patch(f"/api/action-items/{item['id']}", json={"text": "y"}, headers={"X-User-Id": str(other.id)})
    assert res.status_code == 404


def test_removing_participant_unassigns_their_action_items(client):
    m = create(client, participants=["Emily Park"])
    item = client.post(
        f"/api/meetings/{m['id']}/action-items", json={"text": "x", "assignee_id": person_id(m, "Emily Park")}
    ).json()
    res = client.patch(f"/api/meetings/{m['id']}", json={"participants": ["Priya Nair", "Marcus Chen"]})
    assert res.status_code == 200
    updated = next(a for a in res.json()["action_items"] if a["id"] == item["id"])
    assert updated["assignee_id"] is None


def test_ai_action_items_link_to_the_transcript_moment(client):
    m = create(client)
    mockups = next(a for a in m["action_items"] if "mockups" in a["text"].lower())
    assert mockups["source"] == "ai" and mockups["start_ms"] == 20000
