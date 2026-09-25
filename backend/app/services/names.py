import re

_WHITESPACE = re.compile(r"\s+")


def normalize_name(raw: str) -> tuple[str, str]:
    """Collapse whitespace and return (display name, matching key). The key ignores case."""
    display = _WHITESPACE.sub(" ", raw).strip()
    if not display:
        raise ValueError("Name cannot be empty")
    return display, display.casefold()
