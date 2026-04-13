from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Profile
from schemas import ProfileSchema
from pydantic import BaseModel

router = APIRouter(prefix="/api")


class ProfileCreate(BaseModel):
    name: str
    sex: str = "male"  # "male" | "female"


@router.get("/profiles", response_model=list[ProfileSchema])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(Profile).order_by(Profile.id).all()


@router.post("/profiles", response_model=ProfileSchema, status_code=201)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    if payload.sex not in ("male", "female"):
        raise HTTPException(status_code=422, detail="sex must be 'male' or 'female'.")
    if db.query(Profile).filter_by(name=payload.name).first():
        raise HTTPException(status_code=409, detail=f"Profile '{payload.name}' already exists.")
    profile = Profile(name=payload.name, sex=payload.sex)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
