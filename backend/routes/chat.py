import logging
from datetime import date, datetime, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import DiaryEntry, FoodLog, DrinkLog, ExerciseLog
from schemas import ChatRequest, ChatResponse, DiaryEntrySchema
from claude_parser import parse_message
from langchain_agent import query_diary

log = logging.getLogger("routes.chat")
router = APIRouter(prefix="/api")

FOOD_FIELDS = {"item_name", "quantity", "calories", "protein", "carbs", "fat", "fibre", "sugar", "notes"}
DRINK_FIELDS = {"item_name", "quantity_ml", "calories", "is_alcoholic", "alcohol_units", "notes"}
EXERCISE_FIELDS = {"exercise_type", "duration_minutes", "distance_km", "calories_burned", "notes"}


def _time_from_str(t: str) -> time:
    try:
        h, m = t.split(":")
        return time(int(h), int(m))
    except Exception:
        return datetime.now().time().replace(second=0, microsecond=0)


def _apply_edit(parsed: dict, request_date: str, db: Session) -> ChatResponse:
    try:
        entry_date = date.fromisoformat(request_date)
    except ValueError:
        entry_date = date.today()

    search_type = parsed.get("search_entry_type", "food")
    search_item = parsed.get("search_item", "")
    search_time = parsed.get("search_time")
    updates = parsed.get("updates", {})

    if not updates:
        return ChatResponse(type="error", error="No fields to update were specified.")

    # Find matching entries for the date and type
    query = db.query(DiaryEntry).filter(
        DiaryEntry.entry_date == entry_date,
        DiaryEntry.entry_type == search_type,
    )

    entries = query.order_by(DiaryEntry.entry_time).all()

    if not entries:
        return ChatResponse(type="error", error=f"No {search_type} entries found for {entry_date}.")

    # Filter by item name / exercise type (case-insensitive)
    if search_item:
        term = search_item.lower()
        if search_type == "exercise":
            entries = [e for e in entries if e.exercise_log and term in e.exercise_log.exercise_type.lower()]
        else:
            log_attr = "food_log" if search_type == "food" else "drink_log"
            entries = [e for e in entries if getattr(e, log_attr) and term in getattr(e, log_attr).item_name.lower()]

    if not entries:
        return ChatResponse(type="error", error=f"Couldn't find a {search_type} entry matching '{search_item}' on {entry_date}.")

    # If time hint given, prefer the closest match; otherwise take most recently created
    if search_time:
        target = _time_from_str(search_time)
        entries.sort(key=lambda e: abs(
            (e.entry_time.hour * 60 + e.entry_time.minute) - (target.hour * 60 + target.minute)
        ))
    else:
        entries.sort(key=lambda e: e.created_at, reverse=True)

    entry = entries[0]

    # Apply entry-level updates (date, time)
    if "entry_date" in updates:
        try:
            entry.entry_date = date.fromisoformat(updates["entry_date"])
        except (ValueError, TypeError):
            return ChatResponse(type="error", error=f"Invalid date format: {updates['entry_date']}")
    if "entry_time" in updates:
        entry.entry_time = _time_from_str(updates["entry_time"])

    # Apply child log updates
    if search_type == "food" and entry.food_log:
        for key, val in updates.items():
            if key in FOOD_FIELDS:
                setattr(entry.food_log, key, val)
    elif search_type == "drink" and entry.drink_log:
        for key, val in updates.items():
            if key in DRINK_FIELDS:
                setattr(entry.drink_log, key, val)
    elif search_type == "exercise" and entry.exercise_log:
        for key, val in updates.items():
            if key in EXERCISE_FIELDS:
                setattr(entry.exercise_log, key, val)

    db.commit()
    db.refresh(entry)

    changed = ", ".join(f"{k}={v}" for k, v in updates.items() if k != "entry_time")
    item_label = (
        entry.food_log.item_name if entry.food_log else
        entry.drink_log.item_name if entry.drink_log else
        entry.exercise_log.exercise_type if entry.exercise_log else search_item
    )
    confirmation = f"Updated: {item_label} — {changed}"

    return ChatResponse(
        type="edit",
        confirmation=confirmation,
        entry=DiaryEntrySchema.model_validate(entry),
    )


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    log.debug("POST /api/chat | message=%r | date=%s | profile_id=%s",
              request.message, request.date, request.profile_id)

    default_time = datetime.now().strftime("%H:%M")

    try:
        parsed = parse_message(request.message, default_time, request.date)
    except Exception as e:
        return ChatResponse(type="error", error=f"Failed to parse message: {str(e)}")

    if parsed.get("type") == "edit":
        return _apply_edit(parsed, request.date, db)

    if parsed.get("type") == "question":
        try:
            answer = query_diary(request.message, profile_id=request.profile_id)
            return ChatResponse(type="answer", answer=answer)
        except Exception as e:
            return ChatResponse(type="error", error=f"Failed to query diary: {str(e)}")

    # It's a diary entry — use parsed date if Claude resolved one, else fall back to the viewed date
    raw_date = parsed.get("entry_date") or date.today().isoformat()
    log.debug("date resolution | claude_entry_date=%r | request.date=%s | using=%s",
              parsed.get("entry_date"), request.date, raw_date)
    try:
        entry_date = date.fromisoformat(raw_date)
    except (ValueError, TypeError):
        entry_date = date.today()
    log.debug("final entry_date=%s (today=%s)", entry_date, date.today())

    entry_time = _time_from_str(parsed.get("entry_time") or default_time)
    entry_type = parsed.get("entry_type", "food")

    entry = DiaryEntry(
        profile_id=request.profile_id,
        entry_date=entry_date,
        entry_time=entry_time,
        entry_type=entry_type,
        raw_input=request.message,
    )
    db.add(entry)
    db.flush()  # get entry.id before creating child

    date_suffix = f" on {entry_date}" if entry_date != date.today() else ""
    confirmation = ""

    if entry_type == "food":
        food = FoodLog(
            entry_id=entry.id,
            item_name=parsed.get("item_name", "Unknown item"),
            quantity=parsed.get("quantity"),
            calories=parsed.get("calories"),
            protein=parsed.get("protein"),
            carbs=parsed.get("carbs"),
            fat=parsed.get("fat"),
            fibre=parsed.get("fibre"),
            sugar=parsed.get("sugar"),
            notes=parsed.get("notes"),
        )
        db.add(food)
        kcal = f"{int(parsed['calories'])} kcal" if parsed.get("calories") else "unknown kcal"
        confirmation = f"Logged: {parsed.get('item_name', 'Food')} — {kcal} at {parsed.get('entry_time', default_time)}{date_suffix}"

    elif entry_type == "drink":
        drink = DrinkLog(
            entry_id=entry.id,
            item_name=parsed.get("item_name", "Unknown drink"),
            quantity_ml=parsed.get("quantity_ml"),
            calories=parsed.get("calories"),
            is_alcoholic=parsed.get("is_alcoholic", False),
            alcohol_units=parsed.get("alcohol_units", 0.0),
            notes=parsed.get("notes"),
        )
        db.add(drink)
        kcal = f"{int(parsed['calories'])} kcal" if parsed.get("calories") else "unknown kcal"
        units = f", {parsed['alcohol_units']} units" if parsed.get("is_alcoholic") else ""
        confirmation = f"Logged: {parsed.get('item_name', 'Drink')} — {kcal}{units} at {parsed.get('entry_time', default_time)}{date_suffix}"

    elif entry_type == "exercise":
        exercise = ExerciseLog(
            entry_id=entry.id,
            exercise_type=parsed.get("exercise_type", "Exercise"),
            duration_minutes=parsed.get("duration_minutes"),
            distance_km=parsed.get("distance_km"),
            calories_burned=parsed.get("calories_burned"),
            notes=parsed.get("notes"),
        )
        db.add(exercise)
        duration = f"{int(parsed['duration_minutes'])} min" if parsed.get("duration_minutes") else ""
        dist = f", {parsed['distance_km']} km" if parsed.get("distance_km") else ""
        burned = f" — {int(parsed['calories_burned'])} kcal burned" if parsed.get("calories_burned") else ""
        confirmation = f"Logged: {parsed.get('exercise_type', 'Exercise')} {duration}{dist}{burned} at {parsed.get('entry_time', default_time)}{date_suffix}"

    db.commit()
    db.refresh(entry)

    log.debug("entry saved | id=%s | entry_date=%s | entry_type=%s | profile_id=%s",
              entry.id, entry.entry_date, entry.entry_type, entry.profile_id)

    return ChatResponse(
        type="entry",
        confirmation=confirmation,
        entry=DiaryEntrySchema.model_validate(entry),
    )
