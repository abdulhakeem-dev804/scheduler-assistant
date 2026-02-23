"""
Import Schedule Router - Bulk import events from JSON
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List
import uuid

from app.database import get_db
from app.models import Event
from app.schemas import (
    ScheduleImportRequest,
    ScheduleImportResponse,
    ImportErrorDetail,
    EventResponse,
)

router = APIRouter()


@router.post("/schedule", response_model=ScheduleImportResponse, status_code=201)
async def import_schedule(payload: ScheduleImportRequest, db: Session = Depends(get_db)):
    """
    Import a schedule from JSON.
    Accepts an array of events (camelCase fields) and creates them in bulk.
    Returns successfully imported events and any per-item errors.
    """
    imported: List[Event] = []
    errors: List[ImportErrorDetail] = []

    for idx, item in enumerate(payload.schedule):
        try:
            # Validate: end_date must be after start_date
            if item.end_date <= item.start_date:
                errors.append(ImportErrorDetail(
                    index=idx,
                    title=item.title,
                    error="End time must be after start time"
                ))
                continue

            # Generate subtask IDs if missing
            subtasks_data = []
            for subtask in item.subtasks:
                subtasks_data.append({
                    "id": subtask.id or str(uuid.uuid4()),
                    "title": subtask.title,
                    "completed": subtask.completed,
                })

            # Create the event
            event = Event(
                id=str(uuid.uuid4()),
                title=item.title,
                description=item.description,
                start_date=item.start_date,
                end_date=item.end_date,
                category=item.category,
                priority=item.priority,
                is_recurring=item.is_recurring,
                subtasks=subtasks_data,
                timing_mode=item.timing_mode,
                daily_start_time=item.daily_start_time,
                daily_end_time=item.daily_end_time,
            )
            db.add(event)
            imported.append(event)

        except (ValueError, TypeError) as e:
            errors.append(ImportErrorDetail(
                index=idx,
                title=item.title if item else None,
                error=str(e)
            ))
        except SQLAlchemyError as e:
            errors.append(ImportErrorDetail(
                index=idx,
                title=item.title if item else None,
                error=f"Database error: {str(e)}"
            ))

    # Commit all valid events in one transaction
    if imported:
        try:
            db.commit()
            for event in imported:
                db.refresh(event)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to commit imported events: {str(e)}"
            )

    return ScheduleImportResponse(
        imported=imported,
        errors=errors,
        total_received=len(payload.schedule),
        total_imported=len(imported),
        total_errors=len(errors),
    )
