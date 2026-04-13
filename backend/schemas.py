from datetime import date, datetime, time
from typing import Optional
from pydantic import BaseModel


class FoodLogSchema(BaseModel):
    id: int
    item_name: str
    quantity: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fibre: Optional[float] = None
    sugar: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class DrinkLogSchema(BaseModel):
    id: int
    item_name: str
    quantity_ml: Optional[float] = None
    calories: Optional[float] = None
    is_alcoholic: bool = False
    alcohol_units: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class ExerciseLogSchema(BaseModel):
    id: int
    exercise_type: str
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    calories_burned: Optional[float] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class DiaryEntrySchema(BaseModel):
    id: int
    entry_date: date
    entry_time: time
    entry_type: str
    raw_input: str
    created_at: datetime
    food_log: Optional[FoodLogSchema] = None
    drink_log: Optional[DrinkLogSchema] = None
    exercise_log: Optional[ExerciseLogSchema] = None

    model_config = {"from_attributes": True}


class DaySummary(BaseModel):
    date: date
    entries: list[DiaryEntrySchema]
    total_calories_consumed: float
    total_protein: float
    total_carbs: float
    total_fat: float
    total_fibre: float
    total_alcohol_units: float
    total_calories_burned: float
    net_calories: float


class FoodLogUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None
    fibre: Optional[float] = None
    sugar: Optional[float] = None
    notes: Optional[str] = None


class DrinkLogUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity_ml: Optional[float] = None
    calories: Optional[float] = None
    is_alcoholic: Optional[bool] = None
    alcohol_units: Optional[float] = None
    notes: Optional[str] = None


class ExerciseLogUpdate(BaseModel):
    exercise_type: Optional[str] = None
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    calories_burned: Optional[float] = None
    notes: Optional[str] = None


class EntryUpdate(BaseModel):
    entry_date: Optional[str] = None  # YYYY-MM-DD
    entry_time: Optional[str] = None  # HH:MM
    food: Optional[FoodLogUpdate] = None
    drink: Optional[DrinkLogUpdate] = None
    exercise: Optional[ExerciseLogUpdate] = None


class ExerciseSession(BaseModel):
    exercise_type: str
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    calories_burned: Optional[float] = None


class DayHistory(BaseModel):
    date: str  # YYYY-MM-DD
    calories: float
    protein: float
    carbs: float
    fat: float
    fibre: float
    alcohol_units: float
    calories_burned: float
    exercise_sessions: list[ExerciseSession]


class HistoryResponse(BaseModel):
    days: list[DayHistory]


class ProfileSchema(BaseModel):
    id: int
    name: str
    sex: str  # "male" | "female"

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    date: str  # YYYY-MM-DD
    profile_id: int


class ChatResponse(BaseModel):
    type: str  # "entry" | "edit" | "answer" | "error"
    confirmation: Optional[str] = None
    answer: Optional[str] = None
    entry: Optional[DiaryEntrySchema] = None
    error: Optional[str] = None
