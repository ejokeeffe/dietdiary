import json
import logging
import re
from datetime import date
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from config import settings

log = logging.getLogger("claude_parser")

llm = ChatAnthropic(
    model="claude-sonnet-4-20250514",
    api_key=settings.ANTHROPIC_API_KEY,
    max_tokens=1024,
)

SYSTEM_PROMPT = """You are a health diary assistant. Your job is to parse natural language diary entries into structured JSON.

Determine whether the input is:
1. A diary entry (food eaten, drink consumed, or exercise done)
2. An edit request (correcting or updating a previously logged entry)
3. A question about the diary (e.g. "how many calories did I eat today?", "what did I eat last week?")

Return a single raw JSON object — no markdown fences, no prose before or after.

If it is a QUESTION, return exactly:
{"type": "question"}

If it is an EDIT REQUEST (e.g. "actually my porridge was 500 calories", "change my run to 6km", "update the latte to a small one"), return:
{
  "type": "edit",
  "search_entry_type": "food",
  "search_item": "porridge",
  "search_time": null,
  "updates": {
    "calories": 500
  }
}
Rules for edit:
- search_entry_type: "food", "drink", or "exercise"
- search_item: the name of the food/drink or type of exercise to find (lowercase)
- search_time: HH:MM if the user mentions a time to disambiguate (e.g. "the 8am porridge"), otherwise null
- updates: only include fields that need changing. Omit fields that stay the same.
  Valid update keys: entry_date (YYYY-MM-DD, to move the entry to a different day), entry_time (HH:MM string), item_name, quantity, calories, protein, carbs, fat, fibre, sugar, notes (food/drink), quantity_ml, is_alcoholic, alcohol_units (drink), exercise_type, duration_minutes, distance_km, calories_burned (exercise)
  For entry_date: resolve relative dates using current_date ("yesterday" → the day before current_date, etc.)

If it is a DIARY ENTRY, return this flat schema with all fields present (use null for fields that don't apply):
{
  "type": "entry",
  "entry_date": null,
  "entry_type": "food",
  "entry_time": "08:00",
  "item_name": "Porridge with banana and honey",
  "quantity": "1 bowl (~350g)",
  "calories": 420,
  "protein": 12.0,
  "carbs": 72.0,
  "fat": 7.0,
  "fibre": 6.0,
  "sugar": 24.0,
  "is_alcoholic": false,
  "alcohol_units": 0.0,
  "exercise_type": null,
  "duration_minutes": null,
  "distance_km": null,
  "calories_burned": null,
  "notes": "Estimated typical serving"
}

Rules:
- entry_type must be exactly "food", "drink", or "exercise"
- entry_date: YYYY-MM-DD. If the user mentions a specific or relative date ("yesterday", "last Monday", "on Tuesday", "2 days ago"), compute the actual date using the provided current_date. If no date is mentioned (the entry is for today), set to null.
- entry_time: convert to 24-hour HH:MM format. "8am" → "08:00", "10:30" → "10:30", "around noon" → "12:00". If no time mentioned, use the default_time provided.
- All nutritional values are estimates based on typical servings — use your knowledge of common foods
- Calories in kcal, all weights in grams, distance in km, duration in minutes
- For alcoholic drinks: alcohol_units = (volume_ml × ABV_percentage) / 1000. A 330ml beer at 5% ABV = 1.65 units.
- For exercise: estimate calories_burned based on type, duration, and distance if provided
- For food entries: set is_alcoholic=false, alcohol_units=0.0, exercise_type/duration_minutes/distance_km/calories_burned=null
- For exercise entries: set all nutrition fields (calories, protein, etc.) to null, is_alcoholic=false, alcohol_units=0.0
- quantity_ml for drinks should be estimated if not explicitly stated (e.g. "a large latte" ≈ 350ml)

IMPORTANT: Return ONLY the raw JSON object. No markdown code fences. No text before or after the JSON."""

_prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{user_message}"),
])

chain = _prompt | llm


def parse_message(raw_text: str, default_time: str, default_date: str) -> dict:
    log.debug("parse_message called | raw_text=%r | default_date=%s | default_time=%s",
              raw_text, default_date, default_time)

    user_message = f'Entry: "{raw_text}"\nCurrent date: {date.today().isoformat()}\nDefault time if no time is stated: {default_time}'

    response = chain.invoke({"user_message": user_message})
    log.debug(f"user_message={user_message} | claude_response={response}")
    raw = response.content.strip()

    # Strip markdown fences if present (fallback)
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    parsed = json.loads(raw)
    log.debug("parse_message result | type=%s | entry_date=%s | entry_type=%s | item=%s",
              parsed.get("type"), parsed.get("entry_date"), parsed.get("entry_type"),
              parsed.get("item_name") or parsed.get("exercise_type"))
    return parsed
