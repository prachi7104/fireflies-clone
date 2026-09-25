from pathlib import Path

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Full-text index over transcript text. It stores no copy of the text (external content) and
# triggers keep it in sync, including rows removed by ON DELETE CASCADE.
FTS_DDL: list[str] = [
    """CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(
        text, content='transcript_segments', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
    )""",
    """CREATE TRIGGER IF NOT EXISTS transcript_segments_ai AFTER INSERT ON transcript_segments BEGIN
        INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text);
    END""",
    """CREATE TRIGGER IF NOT EXISTS transcript_segments_ad AFTER DELETE ON transcript_segments BEGIN
        INSERT INTO segments_fts(segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
    END""",
    """CREATE TRIGGER IF NOT EXISTS transcript_segments_au AFTER UPDATE ON transcript_segments BEGIN
        INSERT INTO segments_fts(segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
        INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text);
    END""",
]


def create_db_engine(url: str) -> Engine:
    """Create the SQLite engine and apply the pragmas every connection needs."""
    database = make_url(url).database
    if database and database != ":memory:":
        Path(database).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

    return engine


def fts5_available(engine: Engine) -> bool:
    """True when this SQLite build ships the FTS5 extension."""
    with engine.connect() as conn:
        try:
            conn.exec_driver_sql("CREATE VIRTUAL TABLE temp.fts5_probe USING fts5(x)")
            conn.exec_driver_sql("DROP TABLE temp.fts5_probe")
            return True
        except Exception:
            return False


def init_db(engine: Engine) -> bool:
    """Create all tables, plus the full-text index when FTS5 exists. Returns FTS5 availability."""
    import app.models  # noqa: F401  registers every model on Base.metadata

    Base.metadata.create_all(engine)
    has_fts = fts5_available(engine)
    if has_fts:
        with engine.begin() as conn:
            for statement in FTS_DDL:
                conn.exec_driver_sql(statement)
    return has_fts
