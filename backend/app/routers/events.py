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
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all events with optional filters"""
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
    
    # Conflict Detection: Skip if this is an "anytime" task (flexible timing)
    timing_mode = getattr(event_data, 'timing_mode', None) or 'specific'
    if timing_mode != 'anytime':
        # Check for overlapping events (excluding "anytime" events)
        # Two events overlap if: start1 < end2 AND end1 > start2
        conflicting_event = db.query(Event).filter(
            Event.start_date < event_data.end_date,
            Event.end_date > event_data.start_date,
            Event.timing_mode != 'anytime',  # Anytime events can overlap
            Event.is_completed == False  # Ignore completed events
        ).first()
        
        if conflicting_event:
            raise HTTPException(
                status_code=409,
                detail=f"Time conflict with existing event: '{conflicting_event.title}' ({conflicting_event.start_date.strftime('%H:%M')} - {conflicting_event.end_date.strftime('%H:%M')})"
            )
    
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
    
    # Conflict Detection: Skip if this is an "anytime" task
    if new_timing_mode != 'anytime':
        conflicting_event = db.query(Event).filter(
            Event.id != event_id,  # Exclude this event itself
            Event.start_date < new_end,
            Event.end_date > new_start,
            Event.timing_mode != 'anytime',
            Event.is_completed == False
        ).first()
        
        if conflicting_event:
            raise HTTPException(
                status_code=409,
                detail=f"Time conflict with existing event: '{conflicting_event.title}' ({conflicting_event.start_date.strftime('%H:%M')} - {conflicting_event.end_date.strftime('%H:%M')})"
            )
    
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    return event


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
