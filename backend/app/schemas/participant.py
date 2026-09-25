from pydantic import BaseModel


class ParticipantRef(BaseModel):
    id: int
    name: str


class MeetingParticipantOut(ParticipantRef):
    is_speaker: bool


class ParticipantListItem(ParticipantRef):
    meeting_count: int
