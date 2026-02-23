"""
Events Router - CRUD operations for events
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Event
from app.schemas import EventCreate, EventUpdate, EventResponse

router = APIRouter()


@router.get("/", response_model=List[EventResponse])
async def get_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category: Optional[str] = None,
    completed: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """
    Get all events with optional filters.
    
    Note: The default limit is 1000 and max is 5000 to support large curricula.
    Callers should be aware that high limit values may impact memory usage and response times.
    """
    query = db.query(Event)
    
    if start_date:
        query = query.filter(Event.start_date >= start_date)
    if end_date:
        query = query.filter(Event.end_date <= end_date)
    if category:
        query = query.filter(Event.category == category)
    if completed is not None:
        query = query.filter(Event.is_completed == completed)
    
    events = query.order_by(Event.start_date).offset(skip).limit(limit).all()
    return events


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: Session = Depends(get_db)):
    """Get a single event by ID"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event



def check_conflicts(db: Session, start_date: datetime, end_date: datetime, exclude_id: str = None) -> Optional[Event]:
    """
    Check for conflicts with relaxed rules:
    - Events can overlap
    - BUT they cannot start/end at nearly the same time
    - Allow overlap if StartDiff >= 1 hour OR EndDiff >= 1 hour
    """
    query = db.query(Event).filter(
        Event.start_date < end_date,
        Event.end_date > start_date,
        Event.timing_mode != 'anytime',
        Event.is_completed == False
    )
    
    if exclude_id:
        query = query.filter(Event.id != exclude_id)
        
    candidates = query.all()
    
    for event in candidates:
        # Calculate absolute differences in seconds
        # Handle timezone awareness - convert both to naive via replacement
        s1 = event.start_date.replace(tzinfo=None) if event.start_date else datetime.min
        s2 = start_date.replace(tzinfo=None) if start_date else datetime.min
        e1 = event.end_date.replace(tzinfo=None) if event.end_date else datetime.min
        e2 = end_date.replace(tzinfo=None) if end_date else datetime.min
        
        start_diff = abs((s1 - s2).total_seconds())
        end_diff = abs((e1 - e2).total_seconds())
        
        # Conflict if BOTH start and end are too close (< 1 hour)
        # This blocks:
        # - Exact duplicates (diffs = 0)
        # - Slight offsets (e.g. 30 mins later)
        # But allows:
        # - Same start, much longer duration (EndDiff > 3600)
        # - Shifted by >= 1 hour (StartDiff >= 3600)
        if start_diff < 3600 and end_diff < 3600:
            return event
            
    return None


@router.post("/", response_model=EventResponse, status_code=201)
async def create_event(event_data: EventCreate, db: Session = Depends(get_db)):
    """Create a new event"""
    # Validate: End date must be after start date
    if event_data.end_date <= event_data.start_date:
        raise HTTPException(
            status_code=400, 
            detail="End time must be after start time"
        )
    
    # Validate: Can't schedule in the past (allow same day)
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    if event_data.start_date.replace(tzinfo=None) < today:
        raise HTTPException(
            status_code=400,
            detail="Cannot schedule events in the past"
        )
    
    # Conflict Detection removed as per user request
    # check_conflicts(...)

    
    event = Event(**event_data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str, 
    event_data: EventUpdate, 
    db: Session = Depends(get_db)
):
    """Update an existing event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_data.model_dump(exclude_unset=True)
    
    # If times are being updated, check for conflicts
    new_start = update_data.get('start_date', event.start_date)
    new_end = update_data.get('end_date', event.end_date)
    new_timing_mode = update_data.get('timing_mode', event.timing_mode) or 'specific'
    
    # Conflict Detection removed
    # if new_timing_mode != 'anytime':
    #     conflicting_event = check_conflicts(...)

    
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    return event


@router.delete("/bulk", status_code=200)
async def delete_all_events(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Delete all events, optionally filtered by category"""
    query = db.query(Event)
    if category:
        query = query.filter(Event.category == category)
    count = query.count()
    query.delete(synchronize_session=False)
    db.commit()
    return {"deleted": count}


@router.delete("/{event_id}", status_code=204)
async def delete_event(event_id: str, db: Session = Depends(get_db)):
    """Delete an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    return None


@router.patch("/{event_id}/toggle-complete", response_model=EventResponse)
async def toggle_event_completion(event_id: str, db: Session = Depends(get_db)):
    """Toggle the completion status of an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate: Can only mark complete if event has started
    now = datetime.now()
    if not event.is_completed and event.start_date.replace(tzinfo=None) > now:
        raise HTTPException(
            status_code=400,
            detail="Cannot mark as complete - event hasn't started yet"
        )
    
    event.is_completed = not event.is_completed
    db.commit()
    db.refresh(event)
    return event
