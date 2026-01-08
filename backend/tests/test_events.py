"""
Tests for the Events API
"""
import pytest
from datetime import datetime, timedelta




# Helper to get dynamic future dates
def get_future_dates(hours_offset=48, duration=1):
    now = datetime.now()
    start = now + timedelta(hours=hours_offset)
    end = start + timedelta(hours=duration)
    return start.isoformat() + "Z", end.isoformat() + "Z"

def test_get_events_empty(client):
    """Test getting events when none exist"""
    response = client.get("/api/events/")
    assert response.status_code == 200
    assert response.json() == []


def test_create_event(client):
    """Test creating a new event"""
    start, end = get_future_dates()
    event_data = {
        "title": "Test Meeting",
        "description": "A test meeting",
        "start_date": start,
        "end_date": end,
        "category": "work",
        "priority": "high",
        "is_recurring": False
    }
    
    response = client.post("/api/events/", json=event_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["title"] == "Test Meeting"
    assert data["category"] == "work"
    assert data["priority"] == "high"
    assert data["is_completed"] == False
    assert "id" in data


def test_create_event_validation(client):
    """Test event creation validation"""
    start, end = get_future_dates()
    # Missing required title
    response = client.post("/api/events/", json={
        "start_date": start,
        "end_date": end
    })
    assert response.status_code == 422


def test_get_event_by_id(client):
    """Test getting a single event by ID"""
    start, end = get_future_dates()
    # Create event first
    event_data = {
        "title": "Test Event",
        "start_date": start,
        "end_date": end
    }
    create_response = client.post("/api/events/", json=event_data)
    event_id = create_response.json()["id"]
    
    # Get the event
    response = client.get(f"/api/events/{event_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test Event"


def test_get_event_not_found(client):
    """Test getting non-existent event"""
    response = client.get("/api/events/nonexistent-id")
    assert response.status_code == 404


def test_update_event(client):
    """Test updating an event"""
    start, end = get_future_dates()
    # Create event
    event_data = {
        "title": "Original Title",
        "start_date": start,
        "end_date": end
    }
    create_response = client.post("/api/events/", json=event_data)
    event_id = create_response.json()["id"]
    
    # Update event
    update_data = {"title": "Updated Title", "priority": "low"}
    response = client.put(f"/api/events/{event_id}", json=update_data)
    
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
    assert response.json()["priority"] == "low"


def test_delete_event(client):
    """Test deleting an event"""
    start, end = get_future_dates()
    # Create event
    event_data = {
        "title": "To Delete",
        "start_date": start,
        "end_date": end
    }
    create_response = client.post("/api/events/", json=event_data)
    event_id = create_response.json()["id"]
    
    # Delete event
    response = client.delete(f"/api/events/{event_id}")
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = client.get(f"/api/events/{event_id}")
    assert get_response.status_code == 404



def test_toggle_event_completion(client):
    """Test toggling event completion status"""
    # Use dynamic dates: Event starts 1 min ago (so it 'has started')
    # but check if it's still 'today' to pass creation validation
    from datetime import datetime, timedelta, timezone
    import pytest

    now = datetime.now()
    # If now is very close to midnight, subtraction might go to yesterday
    start_time = now - timedelta(minutes=5)
    end_time = now + timedelta(hours=1)
    
    # Validation check: start >= today
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if start_time < today:
        pytest.skip("Skipping toggle test near midnight: Cannot create started event today")
        
    event_data = {
        "title": "Toggle Test",
        "start_date": start_time.isoformat() + "Z", # Use Z
        "end_date": end_time.isoformat() + "Z"
    }
    create_response = client.post("/api/events/", json=event_data)
    
    # Verify creation succeeded
    assert create_response.status_code == 201, f"Failed to create event: {create_response.json()}"
    
    event_id = create_response.json()["id"]
    assert create_response.json()["is_completed"] == False
    
    # Toggle completion (should work since event has started)
    response = client.patch(f"/api/events/{event_id}/toggle-complete")
    assert response.status_code == 200
    assert response.json()["is_completed"] == True
    
    # Toggle back
    response = client.patch(f"/api/events/{event_id}/toggle-complete")
    assert response.json()["is_completed"] == False


def test_filter_events_by_category(client):
    """Test filtering events by category"""
    start, end = get_future_dates()
    start2, end2 = get_future_dates(hours_offset=26)
    
    # Create events with different categories
    client.post("/api/events/", json={
        "title": "Work Event",
        "start_date": start,
        "end_date": end,
        "category": "work"
    })
    client.post("/api/events/", json={
        "title": "Health Event",
        "start_date": start2,
        "end_date": end2,
        "category": "health"
    })
    
    # Filter by work
    response = client.get("/api/events/?category=work")
    assert response.status_code == 200
    events = response.json()
    assert len(events) == 1
    assert events[0]["title"] == "Work Event"


def test_reschedule_event(client):
    """Test rescheduling an event logic"""
    start, end = get_future_dates()
    # Create event
    event_data = {
        "title": "To Reschedule",
        "start_date": start,
        "end_date": end
    }
    create_response = client.post("/api/events/", json=event_data)
    event_id = create_response.json()["id"]
    
    # Reschedule: Update end_date and set resolution to 'rescheduled'
    # Make new end date relative to current start
    start_dt = datetime.fromisoformat(start.replace('Z', ''))
    new_end_dt = start_dt + timedelta(hours=5)
    new_end_date = new_end_dt.isoformat()
    
    update_data = {
        "end_date": new_end_date + "Z", # Send with Z
        "resolution": "rescheduled"
    }
    
    response = client.put(f"/api/events/{event_id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    # Backend might return without Z
    assert data["end_date"].replace('Z', '') == new_end_date
    assert data["resolution"] == "rescheduled"


def test_overlap_allowed(client):
    """Test that overlapping events are now allowed"""
    from datetime import datetime
    
    # Base event tomorrow 10-12
    now = datetime.now()
    base_start = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    base_end = base_start + timedelta(hours=2)
    
    base_event = {
        "title": "Base Event",
        "start_date": base_start.isoformat() + "Z",
        "end_date": base_end.isoformat() + "Z"
    }
    client.post("/api/events/", json=base_event)
    
    # 1. Exact Duplicate -> Allowed
    resp = client.post("/api/events/", json={
        "title": "Exact Duplicate",
        "start_date": base_start.isoformat() + "Z",
        "end_date": base_end.isoformat() + "Z"
    })
    assert resp.status_code == 201
    
    # 2. Slight Offset (30 mins) -> Allowed
    s_offset = base_start + timedelta(minutes=30)
    e_offset = base_end + timedelta(minutes=30)
    
    resp = client.post("/api/events/", json={
        "title": "Slight Offset",
        "start_date": s_offset.isoformat() + "Z",
        "end_date": e_offset.isoformat() + "Z"
    })
    assert resp.status_code == 201
    
    # 3. Nested Long Event -> Allowed
    resp = client.post("/api/events/", json={
        "title": "Nested Long",
        "start_date": base_start.isoformat() + "Z",
        "end_date": (base_end + timedelta(hours=2)).isoformat() + "Z"
    })
    assert resp.status_code == 201

