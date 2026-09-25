from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

from app.core.config import Settings, get_settings
from app.core.database import create_db_engine, init_db
from app.core.errors import register_exception_handlers
from app.routers import meetings, meta, participants, users
from app.services.meta_service import increment_boot_count
from app.services.user_service import ensure_demo_user


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the API. Each app owns its engine, so tests can run against a throwaway database."""
    settings = settings or get_settings()
    engine = create_db_engine(settings.database_url)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.fts5_enabled = init_db(engine)
        with session_factory() as db:
            ensure_demo_user(db)
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
    register_exception_handlers(app)
    for module in (meta, users, meetings, participants):
        app.include_router(module.router)
    return app
