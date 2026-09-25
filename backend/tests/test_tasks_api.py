from app.models import ActionItem
from tests.factories import make_meeting_rows, make_user
from tests.test_meetings_api import create


def jordan_id(meeting):
    return next(p["id"] for p in meeting["participants"] if p["name"] == "Jordan Lee")


def test_lists_tasks_across_meetings_with_meeting_context(client):
    a = create(client, title="Alpha")
    b = create(client, title="Beta")
    client.post(f"/api/meetings/{a['id']}/action-items", json={"text": "From alpha"})
    client.post(f"/api/meetings/{b['id']}/action-items", json={"text": "From beta"})

    items = client.get("/api/action-items").json()["items"]

    added = {i["text"]: i for i in items if i["text"] in {"From alpha", "From beta"}}
    assert added["From alpha"]["meeting_title"] == "Alpha"
    assert added["From beta"]["meeting_title"] == "Beta"
    assert all({"meeting_started_at", "assignee_name", "start_ms"} <= i.keys() for i in items)


def test_mine_returns_only_items_assigned_to_the_current_user(client):
    m = create(client, participants=["Jordan Lee"])
    client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Mine", "assignee_id": jordan_id(m)})
    client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Not mine"})

    items = client.get("/api/action-items?scope=mine").json()["items"]

    assert [i["text"] for i in items] == ["Mine"]
    assert items[0]["assignee_name"] == "Jordan Lee"


def test_status_filter_and_open_first_ordering(client):
    m = create(client)
    done = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Done one"}).json()
    client.patch(f"/api/action-items/{done['id']}", json={"is_done": True})
    client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Open one"})

    open_texts = [i["text"] for i in client.get("/api/action-items?status=open").json()["items"]]
    done_texts = [i["text"] for i in client.get("/api/action-items?status=done").json()["items"]]
    all_done_flags = [i["is_done"] for i in client.get("/api/action-items").json()["items"]]

    assert "Open one" in open_texts and "Done one" not in open_texts
    assert done_texts == ["Done one"]
    assert all_done_flags == sorted(all_done_flags)  # open (False) before done (True)


def test_never_returns_another_users_tasks(client, db):
    other = make_user(db)
    secret = make_meeting_rows(db, other, title="Secret")
    db.add(ActionItem(meeting_id=secret.id, text="Secret task", source="user"))
    db.commit()
    create(client, title="Visible")

    mine = client.get("/api/action-items").json()["items"]
    theirs = client.get("/api/action-items", headers={"X-User-Id": str(other.id)}).json()["items"]

    assert all(i["text"] != "Secret task" for i in mine)
    assert [i["text"] for i in theirs] == ["Secret task"]


def test_invalid_scope_or_status_is_422(client):
    assert client.get("/api/action-items?scope=everyone").status_code == 422
    assert client.get("/api/action-items?status=later").status_code == 422
