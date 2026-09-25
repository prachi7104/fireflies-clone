import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError

from app.core.time import utcnow
from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingKeyword,
    MeetingParticipant,
    Participant,
    Summary,
    TranscriptSegment,
)
from tests.factories import make_meeting_rows, make_user


@pytest.fixture
def owner(db):
    return make_user(db, name="Owner", email="owner@orbitlabs.example")


def test_speaker_must_be_participant_of_that_meeting(db, owner):
    m = make_meeting_rows(db, owner, people=("Ann Lee",), lines=(("Ann Lee", 0, 1000, "hello"),))
    outsider = Participant(name="Zed Outsider", name_key="zed outsider")
    db.add(outsider)
    db.commit()
    db.add(TranscriptSegment(meeting_id=m.id, position=1, speaker_id=outsider.id, start_ms=1000, end_ms=2000, text="hi"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_assignee_must_be_participant_of_that_meeting(db, owner):
    m = make_meeting_rows(db, owner)
    outsider = Participant(name="Zed Outsider", name_key="zed outsider")
    db.add(outsider)
    db.commit()
    db.add(ActionItem(meeting_id=m.id, text="Do it", assignee_id=outsider.id, source="user"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_unassigned_action_item_is_allowed(db, owner):
    m = make_meeting_rows(db, owner)
    db.add(ActionItem(meeting_id=m.id, text="Do it", assignee_id=None, source="user"))
    db.commit()


def test_completed_at_must_match_is_done(db, owner):
    m = make_meeting_rows(db, owner)
    db.add(ActionItem(meeting_id=m.id, text="Do it", source="user", is_done=True, completed_at=None))
    with pytest.raises(IntegrityError):
        db.commit()


def test_removing_a_speaker_from_the_meeting_is_blocked(db, owner):
    m = make_meeting_rows(db, owner)
    ann_id = db.scalar(select(Participant.id).where(Participant.name_key == "ann lee"))
    # SQLite checks the foreign key when the DELETE statement finishes, so the error surfaces here.
    with pytest.raises(IntegrityError):
        db.execute(
            delete(MeetingParticipant).where(
                MeetingParticipant.meeting_id == m.id, MeetingParticipant.participant_id == ann_id
            )
        )
        db.commit()


def test_deleting_a_meeting_cascades_to_everything_including_search_index(db, owner):
    m = make_meeting_rows(db, owner)
    seg_id = db.scalar(select(TranscriptSegment.id).where(TranscriptSegment.meeting_id == m.id))
    db.add_all(
        [
            Summary(meeting_id=m.id, overview="o", notes=["n"], generated_by="rules", generated_at=utcnow()),
            MeetingKeyword(meeting_id=m.id, term="pricing", rank=1),
            Chapter(meeting_id=m.id, position=0, title="Intro", start_ms=0),
            ActionItem(meeting_id=m.id, text="Follow up", source="ai", segment_id=seg_id),
        ]
    )
    db.commit()
    assert db.execute(text("SELECT count(*) FROM segments_fts WHERE segments_fts MATCH 'pricing'")).scalar() == 1

    db.execute(delete(Meeting).where(Meeting.id == m.id))
    db.commit()

    for model in (MeetingParticipant, TranscriptSegment, Summary, MeetingKeyword, Chapter, ActionItem):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    assert db.execute(text("SELECT count(*) FROM segments_fts WHERE segments_fts MATCH 'pricing'")).scalar() == 0
    assert db.scalar(select(func.count()).select_from(Participant)) >= 2  # people outlive meetings


def test_keyword_is_unique_per_meeting(db, owner):
    m = make_meeting_rows(db, owner)
    db.add_all(
        [
            MeetingKeyword(meeting_id=m.id, term="pricing", rank=1),
            MeetingKeyword(meeting_id=m.id, term="pricing", rank=2),
        ]
    )
    with pytest.raises(IntegrityError):
        db.commit()
