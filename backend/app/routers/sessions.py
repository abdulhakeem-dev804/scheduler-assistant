"""
Sessions Router - CRUD operations for session attendance tracking
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from datetime import datetime, date

from app.database import get_db
from app.models import SessionAttendance, SessionStatusEnum, Event
from app.schemas import (
    SessionAttendanceCreate,
    SessionAttendanceUpdate,
    SessionAttendanceResponse,
    SessionStats
)

router = APIRouter()


def calculate_total_sessions(event: Event) -> int:
    """Calculate total number of sessions for an event based on date range"""
    if not event.daily_start_time or not event.daily_end_time:
        return 0
    
    start = event.start_date.date() if hasattr(event.start_date, 'date') else event.start_date
    end = event.end_date.date() if hasattr(event.end_date, 'date') else event.end_date
    
    if isinstance(start, datetime):
        start = start.date()
    if isinstance(end, datetime):
        end = end.date()
    
    return (end - start).days + 1


def calculate_streak(sessions: List[SessionAttendance]) -> int:
    """Calculate current streak of consecutive attended sessions"""
    if not sessions:
        return 0
    
    # Sort by date descending (most recent first)
    sorted_sessions = sorted(sessions, key=lambda s: s.session_date, reverse=True)
    
    streak = 0
    for session in sorted_sessions:
        if session.status == SessionStatusEnum.attended:
            streak += 1
        else:
            break
    
    return streak


@router.get("/{event_id}/sessions", response_model=List[SessionAttendanceResponse])
async def get_event_sessions(event_id: str, db: Session = Depends(get_db)):
    """Get all session attendance records for an event"""
    # Verify event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    sessions = db.query(SessionAttendance).filter(
        SessionAttendance.event_id == event_id
    ).order_by(SessionAttendance.session_date.desc()).all()
    
    return sessions


@router.get("/{event_id}/sessions/stats", response_model=SessionStats)
async def get_session_stats(event_id: str, db: Session = Depends(get_db)):
    """Get session attendance statistics for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    sessions = db.query(SessionAttendance).filter(
        SessionAttendance.event_id == event_id
    ).all()
    
    total_sessions = calculate_total_sessions(event)
    attended = sum(1 for s in sessions if s.status == SessionStatusEnum.attended)
    missed = sum(1 for s in sessions if s.status == SessionStatusEnum.missed)
    skipped = sum(1 for s in sessions if s.status == SessionStatusEnum.skipped)
    pending = total_sessions - attended - missed - skipped
    
    # Calculate attendance rate (only from attended + missed, not pending/skipped)
    marked_sessions = attended + missed
    attendance_rate = (attended / marked_sessions * 100) if marked_sessions > 0 else 0
    
    streak = calculate_streak(sessions)
    
    return SessionStats(
        total_sessions=total_sessions,
        attended=attended,
        missed=missed,
        skipped=skipped,
        pending=max(0, pending),
        attendance_rate=round(attendance_rate, 1),
        current_streak=streak
    )


@router.post("/{event_id}/sessions", response_model=SessionAttendanceResponse, status_code=201)
async def create_session_attendance(
    event_id: str,
    session_data: SessionAttendanceCreate,
    db: Session = Depends(get_db)
):
    """Create or update a session attendance record"""
    # Verify event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if record already exists for this date
    existing = db.query(SessionAttendance).filter(
        and_(
            SessionAttendance.event_id == event_id,
            SessionAttendance.session_date == session_data.session_date
        )
    ).first()
    
    if existing:
        # Update existing record
        existing.status = session_data.status
        existing.notes = session_data.notes
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new record
    session = SessionAttendance(
        event_id=event_id,
        session_date=session_data.session_date,
        status=session_data.status,
        notes=session_data.notes
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{event_id}/sessions/{session_date}", response_model=SessionAttendanceResponse)
async def update_session_attendance(
    event_id: str,
    session_date: str,
    update_data: SessionAttendanceUpdate,
    db: Session = Depends(get_db)
):
    """Update a specific session attendance record"""
    session = db.query(SessionAttendance).filter(
        and_(
            SessionAttendance.event_id == event_id,
            SessionAttendance.session_date == session_date
        )
    ).first()
    
    if not session:
        # Create new record if it doesn't exist
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        session = SessionAttendance(
            event_id=event_id,
            session_date=session_date,
            status=update_data.status,
            notes=update_data.notes
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    session.status = update_data.status
    if update_data.notes is not None:
        session.notes = update_data.notes
    
    db.commit()
    db.refresh(session)
    return session


@router.get("/{event_id}/sessions/pending", response_model=List[str])
async def get_pending_sessions(event_id: str, db: Session = Depends(get_db)):
    """Get dates of sessions that have ended but not been marked (need user action)"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.daily_start_time or not event.daily_end_time:
        return []
    
    # Get all marked sessions
    marked_sessions = db.query(SessionAttendance).filter(
        SessionAttendance.event_id == event_id
    ).all()
    marked_dates = {s.session_date for s in marked_sessions}
    
    # Calculate all session dates
    start = event.start_date
    end = event.end_date
    if hasattr(start, 'date'):
        start = start.date()
    if hasattr(end, 'date'):
        end = end.date()
    
    today = date.today()
    
    # Parse daily end time to check if today's session has ended
    end_hour, end_min = map(int, event.daily_end_time.split(':'))
    now = datetime.now()
    today_session_ended = now.hour > end_hour or (now.hour == end_hour and now.minute >= end_min)
    
    pending_dates = []
    current = start
    while current <= end and current <= today:
        date_str = current.isoformat() if hasattr(current, 'isoformat') else str(current)
        
        # Only include if not already marked
        if date_str not in marked_dates:
            # For today, only include if session has ended
            if current == today:
                if today_session_ended:
                    pending_dates.append(date_str)
            else:
                # Past dates are always pending if not marked
                pending_dates.append(date_str)
        
        # Move to next day
        if hasattr(current, 'day'):
            from datetime import timedelta
            current = current + timedelta(days=1)
        else:
            break
    
    return pending_dates
