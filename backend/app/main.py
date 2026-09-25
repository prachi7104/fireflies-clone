from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings, get_settings
from app.core.database import create_db_engine, init_db
from app.routers import meta
from app.services.meta_service import increment_boot_count


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the API. Each app owns its engine, so tests can run against a throwaway database."""
    settings = settings or get_settings()
    engine = create_db_engine(settings.database_url)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.fts5_enabled = init_db(engine)
        with session_factory() as db:
            increment_boot_count(db)
        yield
        engine.dispose()

    app = FastAPI(title="Fireflies Clone API", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.SessionLocal = session_factory
    app.state.fts5_enabled = False

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(meta.router)
    return app
