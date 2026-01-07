"""
Pydantic Schemas for API request/response validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class CategoryEnum(str, Enum):
    work = "work"
    personal = "personal"
    health = "health"
    learning = "learning"
    finance = "finance"
    social = "social"


class PriorityEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


# Event Schemas
class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: datetime
    end_date: datetime
    category: CategoryEnum = CategoryEnum.work
    priority: PriorityEnum = PriorityEnum.medium
    is_recurring: bool = False


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category: Optional[CategoryEnum] = None
    priority: Optional[PriorityEnum] = None
    is_recurring: Optional[bool] = None
    is_completed: Optional[bool] = None


class EventResponse(EventBase):
    id: str
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Pomodoro Schemas
class PomodoroSessionCreate(BaseModel):
    mode: str = Field(..., pattern="^(work|shortBreak|longBreak)$")
    duration: int = Field(..., gt=0)
    completed: bool = False


class PomodoroSessionResponse(BaseModel):
    id: str
    mode: str
    duration: int
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PomodoroStats(BaseModel):
    total_sessions: int
    total_work_time: int  # in minutes
    completed_sessions: int
    average_session_length: float  # in minutes
