"""
Tests for the Schedule Import API
"""
import pytest
from datetime import datetime, timedelta, timezone


# Helper to get dynamic future dates
def get_future_dates(hours_offset=48, duration=1):
    start = datetime.now(timezone.utc) + timedelta(hours=hours_offset)
    end = start + timedelta(hours=duration)
    return start.isoformat(), end.isoformat()


def test_import_schedule_basic(client):
    """Test importing a valid schedule with multiple events"""
    start1, end1 = get_future_dates(48, 2)
    start2, end2 = get_future_dates(72, 1)

    payload = {
        "schedule": [
            {
                "title": "Study Data Structures",
                "description": "Arrays and Linked Lists",
                "startDate": start1,
                "endDate": end1,
                "category": "learning",
                "priority": "high",
            },
            {
                "title": "Morning Run",
                "startDate": start2,
                "endDate": end2,
                "category": "health",
                "priority": "medium",
            },
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["total_received"] == 2
    assert data["total_imported"] == 2
    assert data["total_errors"] == 0
    assert len(data["imported"]) == 2
    assert data["imported"][0]["title"] == "Study Data Structures"
    assert data["imported"][1]["title"] == "Morning Run"


def test_import_schedule_with_subtasks(client):
    """Test importing events that contain subtasks"""
    start, end = get_future_dates(48, 2)

    payload = {
        "schedule": [
            {
                "title": "Project Planning",
                "startDate": start,
                "endDate": end,
                "category": "work",
                "priority": "high",
                "subtasks": [
                    {"title": "Define scope"},
                    {"title": "Create timeline"},
                    {"title": "Assign tasks"},
                ],
            }
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["total_imported"] == 1
    event = data["imported"][0]
    assert len(event["subtasks"]) == 3
    assert event["subtasks"][0]["title"] == "Define scope"
    # Subtask IDs should be auto-generated
    assert event["subtasks"][0]["id"] is not None


def test_import_schedule_invalid_end_before_start(client):
    """Test that events with end_date before start_date are rejected"""
    start, end = get_future_dates(48, 2)
    # Swap start and end so end is before start
    payload = {
        "schedule": [
            {
                "title": "Invalid Event",
                "startDate": end,
                "endDate": start,
                "category": "work",
                "priority": "medium",
            }
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["total_imported"] == 0
    assert data["total_errors"] == 1
    assert "End time must be after start time" in data["errors"][0]["error"]


def test_import_schedule_mixed_valid_invalid(client):
    """Test importing with a mix of valid and invalid events"""
    start1, end1 = get_future_dates(48, 2)
    start2, end2 = get_future_dates(72, 1)

    payload = {
        "schedule": [
            {
                "title": "Valid Event",
                "startDate": start1,
                "endDate": end1,
                "category": "work",
                "priority": "medium",
            },
            {
                "title": "Invalid Event",
                "startDate": end2,  # Swapped: end before start
                "endDate": start2,
                "category": "work",
                "priority": "medium",
            },
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["total_received"] == 2
    assert data["total_imported"] == 1
    assert data["total_errors"] == 1
    assert data["imported"][0]["title"] == "Valid Event"
    assert data["errors"][0]["title"] == "Invalid Event"


def test_import_schedule_empty_rejected(client):
    """Test that empty schedule array is rejected"""
    payload = {"schedule": []}

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 422  # Validation error from Pydantic


def test_import_schedule_missing_required_fields(client):
    """Test that missing required fields are caught by Pydantic"""
    payload = {
        "schedule": [
            {
                "title": "Missing dates",
                # Missing startDate and endDate
            }
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 422  # Pydantic validation error


def test_import_schedule_defaults_applied(client):
    """Test that default values (category, priority) are applied"""
    start, end = get_future_dates(48, 2)

    payload = {
        "schedule": [
            {
                "title": "Minimal Event",
                "startDate": start,
                "endDate": end,
                # No category or priority - should default
            }
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 201

    data = response.json()
    event = data["imported"][0]
    assert event["category"] == "work"  # Default
    assert event["priority"] == "medium"  # Default


def test_import_schedule_events_appear_in_list(client):
    """Test that imported events show up in the regular events list"""
    start, end = get_future_dates(48, 2)

    payload = {
        "schedule": [
            {
                "title": "Imported Event",
                "startDate": start,
                "endDate": end,
            }
        ]
    }

    response = client.post("/api/import/schedule", json=payload)
    assert response.status_code == 201

    # Now fetch all events
    events_response = client.get("/api/events/")
    assert events_response.status_code == 200

    events = events_response.json()
    titles = [e["title"] for e in events]
    assert "Imported Event" in titles
