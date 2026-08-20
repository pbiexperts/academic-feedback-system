from app.database.session import SessionLocal
from app.services.analytics_builder import rebuild_all_summaries

if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("Rebuilding all analytics summaries...")
        rebuild_all_summaries(db)
        print("Done!")
    finally:
        db.close()
