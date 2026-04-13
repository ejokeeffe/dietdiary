"""
Tests that the chat endpoint saves entries to the correct date.

Root-cause context: entries were being saved to the previous day when the
frontend sent today's date but the Claude parser returned a non-null entry_date
(e.g. the previous day), or when the frontend's currentDate state went stale
after the app was left open past midnight.

The backend's responsibility is:
  - Use request.date as the fallback when Claude returns entry_date=null
  - Use Claude's entry_date when it is explicitly non-null
  - Never fall back silently to the server's date.today()
"""

import datetime
from unittest.mock import MagicMock, patch

# Minimal parsed response from claude_parser.parse_message for a food entry
_BASE_PARSED = {
    "type": "entry",
    "entry_type": "food",
    "entry_date": None,
    "entry_time": "09:46",
    "item_name": "Earl Grey tea",
    "quantity": "1 mug (250ml)",
    "calories": 5,
    "protein": 0.0,
    "carbs": 0.5,
    "fat": 0.2,
    "fibre": 0.0,
    "sugar": 0.0,
    "is_alcoholic": False,
    "alcohol_units": 0.0,
    "exercise_type": None,
    "duration_minutes": None,
    "distance_km": None,
    "calories_burned": None,
    "notes": None,
}


def _post(client, message: str, date: str, entry_date_override=None):
    parsed = {**_BASE_PARSED, "entry_date": entry_date_override}
    with patch("routes.chat.parse_message", return_value=parsed):
        return client.post(
            "/api/chat",
            json={"message": message, "date": date, "profile_id": 1},
        )


def test_uses_request_date_when_claude_returns_null_entry_date(client):
    """The most common bug: Claude returns entry_date=null but the entry must
    still be saved on the date the client sent, not on the server's date.today()."""
    res = _post(client, "Earl Grey tea", "2026-04-03", entry_date_override=None)

    assert res.status_code == 200
    assert res.json()["type"] == "entry"
    assert res.json()["entry"]["entry_date"] == "2026-04-03"


def test_uses_claude_entry_date_when_explicitly_set(client):
    """When the user says 'I had this yesterday', Claude returns the resolved date
    and that date should be saved, not request.date."""
    res = _post(client, "Earl Grey tea yesterday", "2026-04-03", entry_date_override="2026-04-02")

    assert res.status_code == 200
    assert res.json()["entry"]["entry_date"] == "2026-04-02"


def test_request_date_is_not_replaced_by_server_today(client):
    """Guards against a server-timezone bug: the user's browser may send a date
    that differs from the server's date.today() (e.g. BST vs UTC at midnight).
    The entry must be saved on the client-supplied date regardless."""
    # Simulate user in UTC+1 whose browser correctly sends 2026-04-03,
    # even though the UTC server clock might still say 2026-04-02.
    res = _post(client, "Earl Grey tea", "2026-04-03", entry_date_override=None)

    assert res.status_code == 200
    entry_date = res.json()["entry"]["entry_date"]
    assert entry_date == "2026-04-03", (
        f"Entry was saved as {entry_date} instead of the client-supplied 2026-04-03. "
        "The backend must not substitute the server's date.today() for request.date."
    )


def test_confirmation_message_does_not_show_stale_date(client):
    """The confirmation text must not append 'on YYYY-MM-DD' for the date the
    user is currently viewing — that phrase only makes sense for past/future dates."""
    # If the confirmation says 'on 2026-04-03' when the user sent date=2026-04-03,
    # it implies the backend treated a *different* date as 'today', which is the
    # server timezone bug.
    from unittest.mock import patch as _patch
    import datetime

    parsed = {**_BASE_PARSED, "entry_date": None}
    # Patch date.today() to match request.date so the suffix must be empty
    with _patch("routes.chat.parse_message", return_value=parsed), \
         _patch("routes.chat.date") as mock_date:
        mock_date.today.return_value = datetime.date(2026, 4, 3)
        mock_date.fromisoformat = datetime.date.fromisoformat
        res = client.post(
            "/api/chat",
            json={"message": "Earl Grey tea", "date": "2026-04-03", "profile_id": 1},
        )

    assert res.status_code == 200
    confirmation = res.json()["confirmation"]
    assert "on 2026-04-03" not in confirmation, (
        f"Confirmation '{confirmation}' incorrectly appended the viewed date as a suffix. "
        "The suffix should only appear when the entry is on a different day from today."
    )


def test_yesterday_from_todays_view_saves_to_today_minus_one(client):
    """When the user types 'yesterday' while viewing today's page, the entry
    must be saved on today-1.  Claude resolves the relative date and returns it
    as entry_date; the route must persist that value unchanged."""
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)

    parsed = {**_BASE_PARSED, "entry_date": yesterday.isoformat()}
    with patch("routes.chat.parse_message", return_value=parsed):
        res = client.post(
            "/api/chat",
            json={"message": "Earl Grey tea yesterday", "date": today.isoformat(), "profile_id": 1},
        )

    assert res.status_code == 200
    assert res.json()["entry"]["entry_date"] == yesterday.isoformat(), (
        f"Expected entry_date={yesterday} (today-1) but got {res.json()['entry']['entry_date']}."
    )


def test_parse_message_sends_todays_date_as_current_date_not_viewed_date():
    """parse_message must pass today's actual date as 'Current date' in the
    Claude prompt, regardless of the default_date argument (which is the page
    the user is viewing).

    If default_date (= viewed date = yesterday) is forwarded to Claude instead
    of today, Claude will compute 'yesterday' as yesterday-1 = today-2, which
    is the reported bug.

    This test will FAIL until claude_parser.py is fixed to use date.today()
    as the current_date context rather than default_date."""
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    import claude_parser

    today = datetime.date.today()
    yesterday = (today - datetime.timedelta(days=1)).isoformat()

    fake_response = MagicMock()
    fake_response.content = [MagicMock(text='{"type":"entry","entry_date":null,"entry_type":"food","entry_time":"09:00","item_name":"Porridge","quantity":null,"calories":350,"protein":10.0,"carbs":60.0,"fat":5.0,"fibre":4.0,"sugar":5.0,"is_alcoholic":false,"alcohol_units":0.0,"exercise_type":null,"duration_minutes":null,"distance_km":null,"calories_burned":null,"notes":null}')]

    captured = {}
    def capture_create(**kwargs):
        captured["messages"] = kwargs.get("messages", [])
        return fake_response

    with patch.object(claude_parser.client.messages, "create", side_effect=capture_create):
        claude_parser.parse_message("had porridge yesterday", "09:00", default_date=yesterday)

    user_content = captured["messages"][0]["content"]
    assert f"Current date: {today.isoformat()}" in user_content, (
        f"Expected Claude to receive 'Current date: {today.isoformat()}' (today) "
        f"but the prompt contained: {user_content!r}. "
        "Passing the viewed date instead of today causes 'yesterday' to resolve to today-2."
    )
