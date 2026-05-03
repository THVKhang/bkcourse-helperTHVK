import os
import sys
sys.path.insert(0, os.getcwd())

from app.db.session import engine
from app.db.base import Base
import app.models
from sqlalchemy import text

# Create all tables (this will create prerequisites if it doesn't exist)
Base.metadata.create_all(bind=engine)

# Add column program_type to students table if it doesn't exist
with engine.connect() as con:
    try:
        con.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS program_type VARCHAR(20) DEFAULT 'STANDARD'"))
        con.commit()
        print("Successfully added program_type column.")
    except Exception as e:
        print(f"Error (maybe column exists): {e}")
