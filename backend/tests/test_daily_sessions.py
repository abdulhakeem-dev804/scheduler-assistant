"""
Tests for Daily Session Logic (Time Windows)
"""
import pytest
from datetime import datetime, timedelta

def get_future_dates(days=5):
    now = datetime.now()
    start = now + timedelta(days=1)
    end = start + timedelta(days=days)
    return start.isoformat() + "Z", end.isoformat() + "Z"

def test_create_daily_session_event(client):
    """Test creating an event with daily start/end times"""
    start, end = get_future_dates()
    event_data = {
        "title": "Daily Standup",
        "start_date": start,
        "end_date": end,
        "daily_start_time": "09:00",
        "daily_end_time": "10:00",
        "category": "work",
        "priority": "high"
    }
    
    response = client.post("/api/events/", json=event_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["daily_start_time"] == "09:00"
    assert data["daily_end_time"] == "10:00"
    
def test_update_daily_session_times(client):
    """Test updating the daily time window"""
    start, end = get_future_dates()
    # Create valid event first
    create_resp = client.post("/api/events/", json={
        "title": "Flexible Work",
        "start_date": start,
        "end_date": end,
        "daily_start_time": "10:00",
        "daily_end_time": "18:00"
    })
    event_id = create_resp.json()["id"]
    
    # Update times
    update_data = {
        "daily_start_time": "08:00",
        "daily_end_time": "16:00"
    }
    
    response = client.put(f"/api/events/{event_id}", json=update_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["daily_start_time"] == "08:00"
    assert data["daily_end_time"] == "16:00"

def test_invalid_daily_time_format(client):
    """Test validation for invalid time format"""
    start, end = get_future_dates()
    # Invalid format '25:00' (hours > 24) or '9:00' (missing pad)
    # The regex in schema is ^\d{2}:\d{2}$
    
    response = client.post("/api/events/", json={
        "title": "Bad Time",
        "start_date": start,
        "end_date": end,
        "daily_start_time": "25:00", # Invalid
        "daily_end_time": "10:00"
    })
    # Pydantic validation error or 422
    assert response.status_code == 422

def test_daily_time_persistence_check(client):
    """Regression test: Ensure daily times persist after retrieval"""
    start, end = get_future_dates()
    create_resp = client.post("/api/events/", json={
        "title": "Persistence Test",
        "start_date": start,
        "end_date": end,
        "daily_start_time": "13:00",
        "daily_end_time": "14:00"
    })
    event_id = create_resp.json()["id"]
    
    # Fetch again
    get_resp = client.get(f"/api/events/{event_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    
    assert data["daily_start_time"] == "13:00"
    assert data["daily_end_time"] == "14:00"
