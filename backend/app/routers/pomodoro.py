"""
Pomodoro Router - Session tracking and statistics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import PomodoroSession
from app.schemas import PomodoroSessionCreate, PomodoroSessionResponse, PomodoroStats

router = APIRouter()


@router.get("/sessions", response_model=List[PomodoroSessionResponse])
async def get_sessions(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get recent pomodoro sessions"""
    sessions = db.query(PomodoroSession).order_by(
        PomodoroSession.created_at.desc()
    ).limit(limit).all()
    return sessions


@router.post("/sessions", response_model=PomodoroSessionResponse, status_code=201)
async def create_session(
    session_data: PomodoroSessionCreate,
    db: Session = Depends(get_db)
):
    """Record a new pomodoro session"""
    session = PomodoroSession(
        mode=session_data.mode,
        duration=str(session_data.duration),
        completed=session_data.completed
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/stats", response_model=PomodoroStats)
async def get_stats(db: Session = Depends(get_db)):
    """Get pomodoro statistics"""
    sessions = db.query(PomodoroSession).filter(
        PomodoroSession.mode == "work"
    ).all()
    
    total_sessions = len(sessions)
    completed_sessions = len([s for s in sessions if s.completed])
    total_work_time = sum(int(s.duration) for s in sessions if s.completed) // 60
    avg_length = total_work_time / completed_sessions if completed_sessions > 0 else 0
    
    return PomodoroStats(
        total_sessions=total_sessions,
        total_work_time=total_work_time,
        completed_sessions=completed_sessions,
        average_session_length=round(avg_length, 1)
    )
