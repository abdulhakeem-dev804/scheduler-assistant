"""
Tests for Pomodoro API
"""


def test_get_sessions_empty(client):
    """Test getting sessions when none exist"""
    response = client.get("/api/pomodoro/sessions")
    assert response.status_code == 200
    assert response.json() == []


def test_create_session(client):
    """Test creating a pomodoro session"""
    session_data = {
        "mode": "work",
        "duration": 1500,  # 25 minutes in seconds
        "completed": True
    }
    
    response = client.post("/api/pomodoro/sessions", json=session_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["mode"] == "work"
    assert data["completed"] == True
    assert "id" in data


def test_create_session_validation(client):
    """Test session creation validation"""
    # Invalid mode
    response = client.post("/api/pomodoro/sessions", json={
        "mode": "invalid",
        "duration": 1500
    })
    assert response.status_code == 422


def test_get_stats_empty(client):
    """Test getting stats with no sessions"""
    response = client.get("/api/pomodoro/stats")
    assert response.status_code == 200
    
    data = response.json()
    assert data["total_sessions"] == 0
    assert data["total_work_time"] == 0


def test_get_stats_with_sessions(client):
    """Test getting stats after creating sessions"""
    # Create some sessions
    for i in range(3):
        client.post("/api/pomodoro/sessions", json={
            "mode": "work",
            "duration": 1500,
            "completed": True
        })
    
    # Create a break session (should not count in work stats)
    client.post("/api/pomodoro/sessions", json={
        "mode": "shortBreak",
        "duration": 300,
        "completed": True
    })
    
    response = client.get("/api/pomodoro/stats")
    assert response.status_code == 200
    
    data = response.json()
    assert data["total_sessions"] == 3  # Only work sessions
    assert data["completed_sessions"] == 3
    assert data["total_work_time"] == 75  # 3 * 25 minutes


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_root_endpoint(client):
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()
