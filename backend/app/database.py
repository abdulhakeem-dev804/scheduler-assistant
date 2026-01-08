"""
Database configuration with SQLAlchemy
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./scheduler.db")

# Handle PostgreSQL URL format from Railway/Render
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


from sqlalchemy import text, inspect
import logging

def create_db_and_tables():
    """Create all database tables and migrate schema if needed"""
    Base.metadata.create_all(bind=engine)
    
    # Simple migration script for existing production DBs
    try:
        inspector = inspect(engine)
        if "events" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("events")]
            
            with engine.connect() as conn:
                # Add subtasks
                if "subtasks" not in columns:
                    logging.info("Migrating: Adding subtasks column")
                    # Postgres uses JSONB, SQLite uses JSON
                    col_type = "JSONB" if engine.dialect.name == "postgresql" else "JSON"
                    conn.execute(text(f"ALTER TABLE events ADD COLUMN subtasks {col_type} DEFAULT '[]'"))
                
                # Add timing_mode
                if "timing_mode" not in columns:
                    logging.info("Migrating: Adding timing_mode column")
                    conn.execute(text("ALTER TABLE events ADD COLUMN timing_mode VARCHAR(20) DEFAULT 'specific'"))
                    
                # Add resolution
                if "resolution" not in columns:
                    logging.info("Migrating: Adding resolution column")
                    conn.execute(text("ALTER TABLE events ADD COLUMN resolution VARCHAR(20) DEFAULT 'pending'"))
                    
                # Add reschedule_count
                if "reschedule_count" not in columns:
                    logging.info("Migrating: Adding reschedule_count column")
                    conn.execute(text("ALTER TABLE events ADD COLUMN reschedule_count INTEGER DEFAULT 0"))
                    
                # Add original_start_date
                if "original_start_date" not in columns:
                    logging.info("Migrating: Adding original_start_date column")
                    # Postgres specific timestamp with timezone
                    col_type = "TIMESTAMP WITH TIME ZONE" if engine.dialect.name == "postgresql" else "DATETIME"
                    conn.execute(text(f"ALTER TABLE events ADD COLUMN original_start_date {col_type}"))
                    
                conn.commit()
    except Exception as e:
        logging.error(f"Migration failed: {e}")



def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
