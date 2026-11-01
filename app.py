import os
from pathlib import Path
from functools import wraps
from datetime import date
from decimal import Decimal, InvalidOperation
import csv

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_from_directory
from jinja2 import ChoiceLoader, FileSystemLoader
from config import SECRET_KEY, PREFERENCES_API_KEY
from auth.authentication import register_user, authenticate_user
from accessibility.preferences import get_preferences, save_preferences
from banking.storage import (
    MAX_BALANCE_CENTS,
    get_banking_dashboard,
    record_banking_transaction,
)
from shopping.catalog import CATEGORIES as SHOPPING_CATEGORIES, PRODUCTS as SHOPPING_PRODUCTS

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)
app.jinja_loader = ChoiceLoader((
    app.jinja_loader,
    FileSystemLoader(BASE_DIR / "banking" / "templates"),
    FileSystemLoader(BASE_DIR / "health" / "templates"),
    FileSystemLoader(BASE_DIR / "shopping" / "templates"),
    FileSystemLoader(BASE_DIR / "tours" / "templates"),
))
app.secret_key = SECRET_KEY
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "0") == "1",
)

def current_preferences():
    if session.get("user_id"):
        return get_preferences(session["user_id"])
    from accessibility.preferences import DEFAULTS
    return DEFAULTS.copy()

def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped

@app.context_processor
def inject_common():
    return {"accessibility_prefs": current_preferences()}

@app.get("/")
def home():
    return render_template("home.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        ok, message = register_user(request.form.get("username", ""), request.form.get("password", ""))
        flash(message, "success" if ok else "error")
        if ok:
            return redirect(url_for("login"))
    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = authenticate_user(request.form.get("username", ""), request.form.get("password", ""))
        if user:
            session.clear()
            session["user_id"] = user["user_id"]
            session["username"] = user["username"]
            target = request.args.get("next", "")
            if not target.startswith("/") or target.startswith("//"):
                target = url_for("accessibility")
            return redirect(target)
        flash("Invalid username or password.", "error")
    return render_template("login.html")

@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("home"))

@app.route("/accessibility", methods=["GET", "POST"])
@login_required
def accessibility():
    if request.method == "POST":
        prefs = save_preferences(session["user_id"], request.form)
        flash("Your accessibility preferences have been saved and will be used across all pages.", "success")
        return render_template("accessibility.html", prefs=prefs)
    return render_template("accessibility.html", prefs=get_preferences(session["user_id"]))

@app.get("/api/preferences")
@login_required
def my_preferences():
    return jsonify(get_preferences(session["user_id"]))

@app.get("/api/preferences/<user_id>")
def preferences_for_integrated_apps(user_id):
    supplied = request.headers.get("X-Preferences-Key", "")
    if not PREFERENCES_API_KEY or supplied != PREFERENCES_API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(get_preferences(user_id))

# Healthcare routes adapted from the supplied Healthcare Flask app.
def read_health_csv(filename):
    path = BASE_DIR / "health" / "data" / filename
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))

@app.get("/health/")
def health_home():
    if not session.get("user_id"):
        return redirect(url_for("login", next="/health/"))
    return render_template("index.html", accessibility_prefs=current_preferences())

@app.get("/health/api/hospitals")
def health_hospitals():
    return jsonify(read_health_csv("hospitals.csv"))

@app.get("/health/api/doctors")
def health_doctors():
    return jsonify(read_health_csv("doctors.csv"))

@app.post("/health/api/appointments")
def health_appointments():
    data = request.get_json(silent=True) or {}
    for field in ("name", "doctor", "date", "time"):
        if not str(data.get(field, "")).strip():
            return jsonify({"success": False, "message": "Please complete all required fields."}), 400
    try:
        appointment_date = date.fromisoformat(data["date"])
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Please select a valid date."}), 400
    if appointment_date < date.today():
        return jsonify({"success": False, "message": "Please select today or a future date."}), 400
    return jsonify({"success": True, "message": "Demonstration request received. No real appointment was booked and no personal information was stored."})

@app.get("/health/static/<path:filename>")
def health_static(filename):
    from flask import send_from_directory
    return send_from_directory(BASE_DIR / "health" / "static", filename)

@app.get("/banking/")
def banking_home():
    if not session.get("user_id"):
        return redirect(url_for("login", next=request.path))
    dashboard = get_banking_dashboard(session["user_id"])
    return render_template(
        "banking.html",
        accessibility_prefs=current_preferences(),
        balance_cents=dashboard["balance_cents"],
        transactions=dashboard["transactions"],
    )

@app.post("/banking/transactions")
@login_required
def banking_transaction():
    kind = request.form.get("kind", "")
    amount_text = request.form.get("amount", "").strip()
    counterparty_field = "recipient" if kind == "send" else "sender"
    counterparty = request.form.get(counterparty_field, "").strip()

    try:
        amount = Decimal(amount_text)
        if (
            not amount.is_finite()
            or amount <= 0
            or amount.as_tuple().exponent < -2
            or int(amount * 100) > MAX_BALANCE_CENTS
        ):
            raise ValueError
    except (InvalidOperation, ValueError):
        flash("Enter a valid amount greater than zero with no more than two decimal places.", "error")
        return redirect(url_for("banking_home"))

    if kind not in ("send", "receive"):
        flash("Choose Send Money or Receive Money.", "error")
        return redirect(url_for("banking_home"))
    if not counterparty or len(counterparty) > 80:
        flash("Enter a name of 1 to 80 characters.", "error")
        return redirect(url_for("banking_home"))

    try:
        updated_balance = record_banking_transaction(
            session["user_id"],
            kind,
            int(amount * 100),
            counterparty,
        )
    except ValueError as error:
        flash(str(error), "error")
        return redirect(url_for("banking_home"))

    action = "sent" if kind == "send" else "received"
    flash(
        f"Demo transfer {action}: INR {amount:,.2f}. "
        f"Your new balance is INR {updated_balance / 100:,.2f}.",
        "success",
    )
    return redirect(url_for("banking_home"))

@app.get("/shopping/")
def shopping_home():
    if not session.get("user_id"):
        return redirect(url_for("login", next=request.path))
    return render_template(
        "shopping.html",
        accessibility_prefs=current_preferences(),
        products=SHOPPING_PRODUCTS,
        categories=SHOPPING_CATEGORIES,
    )

@app.get("/shopping/static/<path:filename>")
def shopping_static(filename):
    return send_from_directory(BASE_DIR / "shopping" / "static", filename)

@app.get("/tours/")
def tours_home():
    if not session.get("user_id"):
        return redirect(url_for("login", next=request.path))
    return render_template("tours.html", accessibility_prefs=current_preferences())

@app.get("/tours/static/<path:filename>")
def tours_static(filename):
    return send_from_directory(BASE_DIR / "tours" / "static", filename)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "0") == "1")
