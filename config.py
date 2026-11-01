import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
WORKBOOK_PATH = DATA_DIR / "users.xlsx"

SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-only-change-this-secret")
PREFERENCES_API_KEY = os.getenv("PREFERENCES_API_KEY", "dev-only-change-this-api-key")
