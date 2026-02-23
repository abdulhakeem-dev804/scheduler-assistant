"""
Scheduler Assistant - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import socketio

from app.routers import events, pomodoro, sessions, import_schedule
from app.database import create_db_and_tables


# Allowed origins for CORS - No wildcard when credentials=True
# Forced redeploy check for CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://scheduler-assist.abdulhakeem.dev",
    "https://scheduler-api.abdulhakeem.dev",
    "https://scheduler-assistant-git-main-abdulhakeem-shaiks-projects.vercel.app",
    "https://scheduler-assistant-abdulhakeem-shaiks-projects.vercel.app",
]

# Socket.io server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"  # Allow all for development
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    create_db_and_tables()
    yield
    # Shutdown


app = FastAPI(
    title="Scheduler Assistant API",
    description="Backend API for the Scheduler Assistant application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(pomodoro.router, prefix="/api/pomodoro", tags=["Pomodoro"])
app.include_router(sessions.router, prefix="/api/events", tags=["Sessions"])
app.include_router(import_schedule.router, prefix="/api/import", tags=["Import"])


@app.get("/")
async def root():
    return {"message": "Scheduler Assistant API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Socket.io event handlers
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


@sio.event
async def event_created(sid, data):
    """Broadcast when a new event is created"""
    await sio.emit("event_update", {"action": "created", "data": data}, skip_sid=sid)


@sio.event
async def event_updated(sid, data):
    """Broadcast when an event is updated"""
    await sio.emit("event_update", {"action": "updated", "data": data}, skip_sid=sid)


@sio.event
async def event_deleted(sid, data):
    """Broadcast when an event is deleted"""
    await sio.emit("event_update", {"action": "deleted", "data": data}, skip_sid=sid)


# Mount Socket.io
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
