from pathlib import Path
from uuid import uuid4
from threading import RLock
from contextlib import contextmanager
from filelock import FileLock
from openpyxl import Workbook, load_workbook
from config import WORKBOOK_PATH, DATA_DIR

# In-process lock plus a cross-process file lock. For a small demo only.
_thread_lock = RLock()
_file_lock = FileLock(str(WORKBOOK_PATH) + ".lock")

DEFAULTS = {
    "text_scale": 100,
    "high_contrast": False,
    "underline_links": False,
    "increased_spacing": False,
    "large_controls": False,
    "reduced_motion": False,
    "easy_read": False,
    "read_aloud": False,
    "written_communication": False,
    "keyboard_support": False,
}

def _ensure_workbook():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if WORKBOOK_PATH.exists():
        return
    wb = Workbook()
    users = wb.active
    users.title = "Users"
    users.append(["user_id", "username", "password_hash"])
    prefs = wb.create_sheet("Accessibility")
    prefs.append(["user_id", *DEFAULTS.keys()])
    wb.save(WORKBOOK_PATH)

def _open():
    _ensure_workbook()
    return load_workbook(WORKBOOK_PATH)

@contextmanager
def locked_workbook():
    with _thread_lock, _file_lock:
        wb = _open()
        try:
            yield wb
        finally:
            wb.close()

def find_user_by_username(username):
    with _thread_lock, _file_lock:
        wb = _open()
        ws = wb["Users"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row[1] and str(row[1]).lower() == username.lower():
                result = {"user_id": str(row[0]), "username": str(row[1]), "password_hash": str(row[2])}
                wb.close()
                return result
        wb.close()
    return None

def add_user(username, password_hash):
    with _thread_lock, _file_lock:
        wb = _open()
        ws = wb["Users"]
        if any(str(r[1]).lower() == username.lower() for r in ws.iter_rows(min_row=2, values_only=True) if r[1]):
            wb.close()
            raise ValueError("Username already exists")
        user_id = str(uuid4())
        ws.append([user_id, username, password_hash])
        pws = wb["Accessibility"]
        pws.append([user_id, *[DEFAULTS[k] for k in DEFAULTS]])
        wb.save(WORKBOOK_PATH)
        wb.close()
    return user_id

def get_preferences(user_id):
    with _thread_lock, _file_lock:
        wb = _open()
        ws = wb["Accessibility"]
        headers = [c.value for c in ws[1]]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if str(row[0]) == str(user_id):
                data = dict(zip(headers[1:], row[1:]))
                wb.close()
                return {**DEFAULTS, **data}
        wb.close()
    return DEFAULTS.copy()

def save_preferences(user_id, submitted):
    clean = {}
    for key, default in DEFAULTS.items():
        value = submitted.get(key, default)
        if isinstance(default, bool):
            clean[key] = str(value).lower() in ("1", "true", "yes", "on")
        else:
            try:
                clean[key] = max(100, min(200, int(value)))
            except (TypeError, ValueError):
                clean[key] = default

    with _thread_lock, _file_lock:
        wb = _open()
        ws = wb["Accessibility"]
        headers = [c.value for c in ws[1]]
        found = False
        for row_num in range(2, ws.max_row + 1):
            if str(ws.cell(row_num, 1).value) == str(user_id):
                for col_num, key in enumerate(headers[1:], start=2):
                    ws.cell(row_num, col_num).value = clean[key]
                found = True
                break
        if not found:
            wb.close()
            raise ValueError("User preference row not found")
        wb.save(WORKBOOK_PATH)
        wb.close()
    return clean
