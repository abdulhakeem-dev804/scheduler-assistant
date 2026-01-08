"""
Tests for the Events API
"""
import pytest
from datetime import datetime, timedelta


def test_get_events_empty(client):
    """Test getting events when none exist"""
    response = client.get("/api/events/")
    assert response.status_code == 200
    assert response.json() == []


def test_create_event(client):
    """Test creating a new event"""
    event_data = {
        "title": "Test Meeting",
        "description": "A test meeting",
        "start_date": "2026-01-08T09:00:00Z",
        "end_date": "2026-01-08T10:00:00Z",
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
    # Missing required title
    response = client.post("/api/events/", json={
        "start_date": "2026-01-08T09:00:00Z",
        "end_date": "2026-01-08T10:00:00Z"
    })
    assert response.status_code == 422


def test_get_event_by_id(client):
    """Test getting a single event by ID"""
    # Create event first
    event_data = {
        "title": "Test Event",
        "start_date": "2026-01-08T09:00:00Z",
        "end_date": "2026-01-08T10:00:00Z"
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
    # Create event
    event_data = {
        "title": "Original Title",
        "start_date": "2026-01-08T09:00:00Z",
        "end_date": "2026-01-08T10:00:00Z"
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
    # Create event
    event_data = {
        "title": "To Delete",
        "start_date": "2026-01-08T09:00:00Z",
        "end_date": "2026-01-08T10:00:00Z"
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
    # Create event with a PAST date (so toggle-complete validation passes)
    event_data = {
        "title": "Toggle Test",
        "start_date": "2025-01-01T09:00:00Z",  # Past date
        "end_date": "2025-01-01T10:00:00Z"
    }
    create_response = client.post("/api/events/", json=event_data)
    event_id = create_response.json()["id"]
    
    assert create_response.json()["is_completed"] == False
    
    # Toggle completion
    response = client.patch(f"/api/events/{event_id}/toggle-complete")
    assert response.status_code == 200
    assert response.json()["is_completed"] == True
    
    # Toggle back
    response = client.patch(f"/api/events/{event_id}/toggle-complete")
    assert response.json()["is_completed"] == False


def test_filter_events_by_category(client):
    """Test filtering events by category"""
    # Create events with different categories
    client.post("/api/events/", json={
        "title": "Work Event",
        "start_date": "2026-01-08T09:00:00Z",
        "end_date": "2026-01-08T10:00:00Z",
        "category": "work"
    })
    client.post("/api/events/", json={
        "title": "Health Event",
        "start_date": "2026-01-08T11:00:00Z",
        "end_date": "2026-01-08T12:00:00Z",
        "category": "health"
    })
    
    # Filter by work
    response = client.get("/api/events/?category=work")
    assert response.status_code == 200
    events = response.json()
    assert len(events) == 1
    assert events[0]["title"] == "Work Event"
