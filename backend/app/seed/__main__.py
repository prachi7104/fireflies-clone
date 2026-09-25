"""Seed the configured database: `python -m app.seed [--reset]`.

--reset deletes the SQLite file first. It's meant for local development only.
"""

import argparse
from pathlib import Path

from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database import create_db_engine, init_db
from app.seed.seed import seed_database
from app.services.user_service import ensure_demo_user


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the database with the demo meetings.")
    parser.add_argument("--reset", action="store_true", help="delete the SQLite database file first")
    args = parser.parse_args()

    settings = get_settings()
    if args.reset:
        path = make_url(settings.database_url).database
        if path and path != ":memory:":
            for suffix in ("", "-wal", "-shm"):
                Path(f"{path}{suffix}").unlink(missing_ok=True)

    engine = create_db_engine(settings.database_url)
    init_db(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as db:
        ensure_demo_user(db)
        seeded = seed_database(db)
    engine.dispose()
    print("Seeded the demo meetings." if seeded else "Database was already seeded; nothing changed.")


if __name__ == "__main__":
    main()
