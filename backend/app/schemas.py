"""
Pydantic Schemas for API request/response validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
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


class ResolutionEnum(str, Enum):
    pending = "pending"
    completed = "completed"
    missed = "missed"
    rescheduled = "rescheduled"


class TimingModeEnum(str, Enum):
    specific = "specific"
    anytime = "anytime"
    deadline = "deadline"


# Subtask Schema
class Subtask(BaseModel):
    id: Optional[str] = Field(default=None)  # Auto-generated if not provided
    title: str
    completed: bool = False


# Event Schemas
class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: datetime
    end_date: datetime
    category: CategoryEnum = CategoryEnum.work
    priority: PriorityEnum = PriorityEnum.medium
    is_recurring: bool = False
    subtasks: List[Subtask] = []
    timing_mode: TimingModeEnum = TimingModeEnum.specific
    daily_start_time: Optional[str] = Field(None, pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")  # "HH:mm" format
    daily_end_time: Optional[str] = Field(None, pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")    # "HH:mm" format


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
    subtasks: Optional[List[Subtask]] = None
    timing_mode: Optional[TimingModeEnum] = None
    resolution: Optional[ResolutionEnum] = None
    daily_start_time: Optional[str] = Field(None, pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    daily_end_time: Optional[str] = Field(None, pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")


class EventResponse(EventBase):
    id: str
    is_completed: bool
    subtasks: List[Subtask] = []
    timing_mode: TimingModeEnum = TimingModeEnum.specific  # Default for NULL DB values
    resolution: ResolutionEnum = ResolutionEnum.pending    # Default for NULL DB values
    reschedule_count: int = 0
    original_start_date: Optional[datetime] = None
    daily_start_time: Optional[str] = None
    daily_end_time: Optional[str] = None
    created_at: Optional[datetime] = Field(default=None)
    updated_at: Optional[datetime] = Field(default=None)

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


# Session Attendance Schemas
class SessionStatusEnum(str, Enum):
    pending = "pending"
    attended = "attended"
    missed = "missed"
    skipped = "skipped"


class SessionAttendanceCreate(BaseModel):
    session_date: str  # YYYY-MM-DD format
    status: SessionStatusEnum
    notes: Optional[str] = None


class SessionAttendanceUpdate(BaseModel):
    status: SessionStatusEnum
    notes: Optional[str] = None


class SessionAttendanceResponse(BaseModel):
    id: str
    event_id: str
    session_date: str
    status: SessionStatusEnum
    notes: Optional[str]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SessionStats(BaseModel):
    total_sessions: int
    attended: int
    missed: int
    skipped: int
    pending: int
    attendance_rate: float  # percentage 0-100
    current_streak: int  # consecutive attended days


# Schedule Import Schemas
class ScheduleImportItem(BaseModel):
    """Single event item in a JSON schedule import — accepts camelCase from AI tools"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: datetime = Field(..., alias="startDate")
    end_date: datetime = Field(..., alias="endDate")
    category: CategoryEnum = CategoryEnum.work
    priority: PriorityEnum = PriorityEnum.medium
    is_recurring: bool = Field(False, alias="isRecurring")
    subtasks: List[Subtask] = []
    timing_mode: TimingModeEnum = Field(TimingModeEnum.specific, alias="timingMode")
    daily_start_time: Optional[str] = Field(None, alias="dailyStartTime", pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    daily_end_time: Optional[str] = Field(None, alias="dailyEndTime", pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")

    class Config:
        populate_by_name = True  # Accept both camelCase alias and snake_case


class ScheduleImportRequest(BaseModel):
    """Request body for importing a full schedule"""
    schedule: List[ScheduleImportItem] = Field(..., min_length=1)


class ImportErrorDetail(BaseModel):
    """Error info for a single failed import item"""
    index: int
    title: Optional[str] = None
    error: str


class ScheduleImportResponse(BaseModel):
    """Response after importing a schedule"""
    imported: List[EventResponse]
    errors: List[ImportErrorDetail]
    total_received: int
    total_imported: int
    total_errors: int
