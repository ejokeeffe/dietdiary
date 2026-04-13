import os
# Must be set before any app imports so pydantic-settings can read it
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import Base
from database import get_db
from routes.chat import router as chat_router
from routes.diary import router as diary_router


@pytest.fixture()
def client():
    # StaticPool shares one connection so all sessions see the same in-memory DB
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    app = FastAPI()
    app.include_router(chat_router)
    app.include_router(diary_router)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
