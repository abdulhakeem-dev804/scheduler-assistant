"""
SQLAlchemy Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, JSON
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid


class CategoryEnum(str, enum.Enum):
    work = "work"
    personal = "personal"
    health = "health"
    learning = "learning"
    finance = "finance"
    social = "social"


class PriorityEnum(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class ResolutionEnum(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    missed = "missed"
    rescheduled = "rescheduled"


class TimingModeEnum(str, enum.Enum):
    specific = "specific"    # Exact start/end time
    anytime = "anytime"      # Flexible - do anytime before deadline
    deadline = "deadline"    # Only end date matters


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    category = Column(Enum(CategoryEnum), default=CategoryEnum.work)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.medium)
    is_recurring = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)
    
    # Smart Planner fields
    subtasks = Column(JSON, default=list)  # [{id, title, completed}]
    timing_mode = Column(Enum(TimingModeEnum), default=TimingModeEnum.specific)
    resolution = Column(Enum(ResolutionEnum), default=ResolutionEnum.pending)
    reschedule_count = Column(Integer, default=0)
    original_start_date = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mode = Column(String(20), nullable=False)  # work, shortBreak, longBreak
    duration = Column(String, nullable=False)  # in seconds
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
