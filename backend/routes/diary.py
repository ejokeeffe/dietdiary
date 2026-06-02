from datetime import date, datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import DiaryEntry, FoodLog, DrinkLog, ExerciseLog, WeightLog, HealthEventLog
from schemas import DaySummary, DiaryEntrySchema, EntryUpdate, HistoryResponse, DayHistory, ExerciseSession, HealthEvent

router = APIRouter(prefix="/api")


def _compute_summary(entries: list[DiaryEntry], day: date) -> DaySummary:
    total_calories_consumed = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    total_fibre = 0.0
    total_alcohol_units = 0.0
    total_calories_burned = 0.0

    weight_kg = None
    for e in entries:
        if e.entry_type == "food" and e.food_log:
            total_calories_consumed += e.food_log.calories or 0
            total_protein += e.food_log.protein or 0
            total_carbs += e.food_log.carbs or 0
            total_fat += e.food_log.fat or 0
            total_fibre += e.food_log.fibre or 0
        elif e.entry_type == "drink" and e.drink_log:
            total_calories_consumed += e.drink_log.calories or 0
            total_alcohol_units += e.drink_log.alcohol_units or 0
        elif e.entry_type == "exercise" and e.exercise_log:
            total_calories_burned += e.exercise_log.calories_burned or 0
        elif e.entry_type == "weight" and e.weight_log:
            weight_kg = e.weight_log.weight_kg  # last weight entry wins (entries ordered by time)

    return DaySummary(
        date=day,
        entries=[DiaryEntrySchema.model_validate(e) for e in entries],
        total_calories_consumed=round(total_calories_consumed, 1),
        total_protein=round(total_protein, 1),
        total_carbs=round(total_carbs, 1),
        total_fat=round(total_fat, 1),
        total_fibre=round(total_fibre, 1),
        total_alcohol_units=round(total_alcohol_units, 1),
        total_calories_burned=round(total_calories_burned, 1),
        net_calories=round(total_calories_consumed - total_calories_burned, 1),
        weight_kg=weight_kg,
    )


@router.get("/day", response_model=DaySummary)
def get_day(date_str: str = None, profile_id: int = None, db: Session = Depends(get_db)):
    if date_str:
        try:
            day = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    else:
        day = date.today()

    query = db.query(DiaryEntry).filter(DiaryEntry.entry_date == day)
    if profile_id is not None:
        query = query.filter(DiaryEntry.profile_id == profile_id)
    entries = query.order_by(DiaryEntry.entry_time).all()
    return _compute_summary(entries, day)


@router.get("/entry/{entry_id}", response_model=DiaryEntrySchema)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/entry/{entry_id}", response_model=DiaryEntrySchema)
def update_entry(entry_id: int, payload: EntryUpdate, db: Session = Depends(get_db)):
    entry = db.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if payload.entry_date:
        try:
            entry.entry_date = date.fromisoformat(payload.entry_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if payload.entry_time:
        try:
            h, m = payload.entry_time.split(":")
            entry.entry_time = time(int(h), int(m))
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM.")

    if payload.food and entry.food_log:
        for field, value in payload.food.model_dump(exclude_unset=True).items():
            setattr(entry.food_log, field, value)

    if payload.drink and entry.drink_log:
        for field, value in payload.drink.model_dump(exclude_unset=True).items():
            setattr(entry.drink_log, field, value)

    if payload.exercise and entry.exercise_log:
        for field, value in payload.exercise.model_dump(exclude_unset=True).items():
            setattr(entry.exercise_log, field, value)

    if payload.weight and entry.weight_log:
        for field, value in payload.weight.model_dump(exclude_unset=True).items():
            setattr(entry.weight_log, field, value)

    if payload.health and entry.health_log:
        health_data = payload.health.model_dump(exclude_unset=True)
        for field, value in health_data.items():
            if field == "end_date":
                if value:
                    try:
                        entry.health_log.end_date = date.fromisoformat(value)
                    except (ValueError, TypeError):
                        raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")
                else:
                    entry.health_log.end_date = None
            else:
                setattr(entry.health_log, field, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entry/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()


@router.get("/history", response_model=HistoryResponse)
def get_history(profile_id: int, days: int = 30, db: Session = Depends(get_db)):
    end = date.today()
    start = end - timedelta(days=days - 1)

    entries = (
        db.query(DiaryEntry)
        .filter(
            DiaryEntry.profile_id == profile_id,
            DiaryEntry.entry_date >= start,
            DiaryEntry.entry_date <= end,
        )
        .order_by(DiaryEntry.entry_date)
        .all()
    )

    # Aggregate per day
    days_map: dict[str, dict] = {}
    for e in entries:
        key = e.entry_date.isoformat()
        if key not in days_map:
            days_map[key] = {
                "date": key, "calories": 0.0, "protein": 0.0, "carbs": 0.0,
                "fat": 0.0, "fibre": 0.0, "alcohol_units": 0.0,
                "calories_burned": 0.0, "exercise_sessions": [], "weight_kg": None,
            }
        d = days_map[key]
        if e.entry_type == "food" and e.food_log:
            d["calories"] += e.food_log.calories or 0
            d["protein"] += e.food_log.protein or 0
            d["carbs"] += e.food_log.carbs or 0
            d["fat"] += e.food_log.fat or 0
            d["fibre"] += e.food_log.fibre or 0
        elif e.entry_type == "drink" and e.drink_log:
            d["calories"] += e.drink_log.calories or 0
            d["alcohol_units"] += e.drink_log.alcohol_units or 0
        elif e.entry_type == "exercise" and e.exercise_log:
            d["calories_burned"] += e.exercise_log.calories_burned or 0
            d["exercise_sessions"].append(ExerciseSession(
                exercise_type=e.exercise_log.exercise_type,
                duration_minutes=e.exercise_log.duration_minutes,
                distance_km=e.exercise_log.distance_km,
                calories_burned=e.exercise_log.calories_burned,
            ))
        elif e.entry_type == "weight" and e.weight_log:
            d["weight_kg"] = e.weight_log.weight_kg  # last entry wins

    # Fill every day in range, including days with no entries
    result: list[DayHistory] = []
    current = start
    while current <= end:
        key = current.isoformat()
        if key in days_map:
            d = days_map[key]
            result.append(DayHistory(
                date=key,
                calories=round(d["calories"], 1),
                protein=round(d["protein"], 1),
                carbs=round(d["carbs"], 1),
                fat=round(d["fat"], 1),
                fibre=round(d["fibre"], 1),
                alcohol_units=round(d["alcohol_units"], 2),
                calories_burned=round(d["calories_burned"], 1),
                exercise_sessions=d["exercise_sessions"],
                weight_kg=d["weight_kg"],
            ))
        else:
            result.append(DayHistory(
                date=key, calories=0, protein=0, carbs=0,
                fat=0, fibre=0, alcohol_units=0, calories_burned=0, exercise_sessions=[],
                weight_kg=None,
            ))
        current += timedelta(days=1)

    # Collect health events active during the period:
    # 1. Events that started within the range
    # 2. Events that started before the range but have end_date >= start (or are ongoing)
    health_entries_in_range = [e for e in entries if e.entry_type == "health" and e.health_log]
    health_entries_before = (
        db.query(DiaryEntry)
        .filter(
            DiaryEntry.profile_id == profile_id,
            DiaryEntry.entry_type == "health",
            DiaryEntry.entry_date < start,
        )
        .all()
    )
    ongoing_before = [
        e for e in health_entries_before
        if e.health_log and (e.health_log.end_date is None or e.health_log.end_date >= start)
    ]

    health_events: list[HealthEvent] = []
    for e in health_entries_in_range + ongoing_before:
        hl = e.health_log
        health_events.append(HealthEvent(
            entry_id=e.id,
            event_type=hl.event_type,
            description=hl.description,
            severity=hl.severity,
            start_date=e.entry_date.isoformat(),
            end_date=hl.end_date.isoformat() if hl.end_date else None,
            notes=hl.notes,
        ))

    return HistoryResponse(days=result, health_events=health_events)
