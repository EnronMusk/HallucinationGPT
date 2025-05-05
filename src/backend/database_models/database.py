import os
from typing import Annotated, Any, Generator
import logging

from dotenv import load_dotenv
from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg2://postgres:postgres@db:5432"
)

# Reduce pool_size and max_overflow to avoid hitting max_connections
# Add echo_pool=True to debug connection issues
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_size=50,  # Reduced from 50
    max_overflow=50,  # Reduced from 50
    pool_timeout=30, 
    pool_recycle=30,  # Reduced from 60 to recycle more frequently
    pool_pre_ping=True,  # Add connection validation before use
    echo_pool=True  # Log pool events for debugging
)

# Create a sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session() -> Generator[Session, Any, None]:
    session = SessionLocal()
    try:
        yield session
    except Exception as e:
        session.rollback()
        logging.error(f"Database error: {str(e)}")
        raise
    finally:
        session.close()  # Ensure session gets closed


DBSessionDep = Annotated[Session, Depends(get_session)]


# postgres:14.11-alpine

#    docker exec -it a070f4725e1c psql -U postgres -c "SHOW max_connections;"