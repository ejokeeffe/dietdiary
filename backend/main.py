import logging

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from database import engine
from models import Base
from routes.chat import router as chat_router
from routes.diary import router as diary_router
from routes.profiles import router as profiles_router

# Create any new tables (e.g. profiles)
Base.metadata.create_all(bind=engine)

# Migrations: add columns that may be missing from older databases
inspector = inspect(engine)

diary_cols = [c["name"] for c in inspector.get_columns("diary_entries")]
profile_cols = [c["name"] for c in inspector.get_columns("profiles")]

with engine.connect() as conn:
    if "profile_id" not in diary_cols:
        conn.execute(text("ALTER TABLE diary_entries ADD COLUMN profile_id INTEGER REFERENCES profiles(id)"))
    if "sex" not in profile_cols:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN sex VARCHAR(10) NOT NULL DEFAULT 'male'"))
    conn.commit()


app = FastAPI(title="Health Diary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(diary_router)
app.include_router(profiles_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
