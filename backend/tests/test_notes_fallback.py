from app.services.notes import generate_notes
from tests.test_notes_rules import PEOPLE, SEGMENTS


class ExplodingProvider:
    name = "test:explode"

    def generate(self, *args, **kwargs):
        raise RuntimeError("provider down")


def test_no_provider_uses_rules():
    assert generate_notes("T", PEOPLE, SEGMENTS, 360000, provider=None).generated_by == "rules"


def test_provider_failure_falls_back_to_rules():
    assert generate_notes("T", PEOPLE, SEGMENTS, 360000, provider=ExplodingProvider()).generated_by == "rules"
