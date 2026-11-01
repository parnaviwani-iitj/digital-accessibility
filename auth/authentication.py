from werkzeug.security import generate_password_hash, check_password_hash
from accessibility.preferences import find_user_by_username, add_user

def register_user(username: str, password: str):
    username = username.strip().lower()
    if not username or len(username) < 3:
        return False, "Username must contain at least 3 characters."
    if len(password) < 10:
        return False, "Password must contain at least 10 characters."
    if find_user_by_username(username):
        return False, "That username is already registered."

    add_user(username, generate_password_hash(password))
    return True, "Account created. You can now log in."

def authenticate_user(username: str, password: str):
    user = find_user_by_username(username.strip().lower())
    if not user or not check_password_hash(user["password_hash"], password):
        return None
    return {"user_id": user["user_id"], "username": user["username"]}
