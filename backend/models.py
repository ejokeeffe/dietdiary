from datetime import date, datetime, time
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import relationship
from database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    sex = Column(String(10), nullable=False, default="male")  # "male" | "female"
    created_at = Column(DateTime, default=datetime.utcnow)

    entries = relationship("DiaryEntry", back_populates="profile")


class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=True, index=True)
    entry_date = Column(Date, nullable=False, index=True)
    entry_time = Column(Time, nullable=False)
    entry_type = Column(String(10), nullable=False)  # food | drink | exercise | weight | health
    raw_input = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="entries")
    food_log = relationship("FoodLog", back_populates="entry", cascade="all, delete-orphan", uselist=False)
    drink_log = relationship("DrinkLog", back_populates="entry", cascade="all, delete-orphan", uselist=False)
    exercise_log = relationship("ExerciseLog", back_populates="entry", cascade="all, delete-orphan", uselist=False)
    weight_log = relationship("WeightLog", back_populates="entry", cascade="all, delete-orphan", uselist=False)
    health_log = relationship("HealthEventLog", back_populates="entry", cascade="all, delete-orphan", uselist=False)


class FoodLog(Base):
    __tablename__ = "food_log"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("diary_entries.id"), nullable=False)
    item_name = Column(String(200), nullable=False)
    quantity = Column(String(100))
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    fibre = Column(Float)
    sugar = Column(Float)
    notes = Column(Text)

    entry = relationship("DiaryEntry", back_populates="food_log")


class DrinkLog(Base):
    __tablename__ = "drink_log"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("diary_entries.id"), nullable=False)
    item_name = Column(String(200), nullable=False)
    quantity_ml = Column(Float)
    calories = Column(Float)
    is_alcoholic = Column(Boolean, default=False)
    alcohol_units = Column(Float)
    notes = Column(Text)

    entry = relationship("DiaryEntry", back_populates="drink_log")


class ExerciseLog(Base):
    __tablename__ = "exercise_log"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("diary_entries.id"), nullable=False)
    exercise_type = Column(String(100), nullable=False)
    duration_minutes = Column(Float)
    distance_km = Column(Float)
    calories_burned = Column(Float)
    notes = Column(Text)

    entry = relationship("DiaryEntry", back_populates="exercise_log")


class WeightLog(Base):
    __tablename__ = "weight_log"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("diary_entries.id"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    notes = Column(Text)

    entry = relationship("DiaryEntry", back_populates="weight_log")


class HealthEventLog(Base):
    __tablename__ = "health_event_log"

    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("diary_entries.id"), nullable=False)
    event_type = Column(String(20), nullable=False)  # "injury" | "illness"
    description = Column(String(200), nullable=False)
    severity = Column(Integer, nullable=True)  # 1-5
    end_date = Column(Date, nullable=True)  # null = single-day or ongoing
    notes = Column(Text, nullable=True)

    entry = relationship("DiaryEntry", back_populates="health_log")
