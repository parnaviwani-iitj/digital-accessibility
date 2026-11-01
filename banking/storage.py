from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from openpyxl import Workbook, load_workbook

from accessibility import preferences as user_storage

BANKING_DIR = Path(__file__).resolve().parent
BANKING_DATA_DIR = BANKING_DIR / "data"
BANKING_WORKBOOK_PATH = BANKING_DATA_DIR / "banking.xlsx"
MAX_BALANCE_CENTS = 99_999_999_999_999
ACCOUNT_HEADERS = ("user_id", "balance_cents")
TRANSACTION_HEADERS = (
    "transaction_id",
    "user_id",
    "kind",
    "amount_cents",
    "balance_after_cents",
    "counterparty",
    "created_at",
)


def _find_user(workbook, user_id):
    users = workbook["Users"]
    return any(
        str(row[0]) == str(user_id)
        for row in users.iter_rows(min_row=2, values_only=True)
        if row[0] is not None
    )


def _account_row(accounts, user_id):
    for row_number in range(2, accounts.max_row + 1):
        if str(accounts.cell(row_number, 1).value) == str(user_id):
            return row_number
    return None


def _open_banking_workbook(user_workbook):
    BANKING_DATA_DIR.mkdir(parents=True, exist_ok=True)
    if BANKING_WORKBOOK_PATH.exists():
        workbook = load_workbook(BANKING_WORKBOOK_PATH)
    else:
        workbook = Workbook()
        accounts = workbook.active
        accounts.title = "BankingAccounts"
        accounts.append(ACCOUNT_HEADERS)
        transactions = workbook.create_sheet("BankingTransactions")
        transactions.append(TRANSACTION_HEADERS)

    if "BankingAccounts" not in workbook.sheetnames:
        accounts = workbook.create_sheet("BankingAccounts")
        accounts.append(ACCOUNT_HEADERS)
    if "BankingTransactions" not in workbook.sheetnames:
        transactions = workbook.create_sheet("BankingTransactions")
        transactions.append(TRANSACTION_HEADERS)

    legacy_sheets = {
        "BankingAccounts": ACCOUNT_HEADERS,
        "BankingTransactions": TRANSACTION_HEADERS,
    }
    for sheet_name, expected_headers in legacy_sheets.items():
        if sheet_name not in user_workbook.sheetnames:
            continue
        source = user_workbook[sheet_name]
        destination = workbook[sheet_name]
        destination_rows = list(destination.iter_rows(min_row=2, values_only=True))
        if tuple(cell.value for cell in destination[1]) != expected_headers:
            raise ValueError(f"Unexpected columns in banking data sheet: {sheet_name}")
        source_headers = tuple(cell.value for cell in source[1])
        if source_headers != expected_headers:
            raise ValueError(f"Unexpected columns in legacy banking sheet: {sheet_name}")

        if sheet_name == "BankingAccounts":
            existing_users = {str(row[0]) for row in destination_rows if row[0] is not None}
            for row in source.iter_rows(min_row=2, values_only=True):
                if row[0] is not None and str(row[0]) not in existing_users:
                    destination.append(row)
                    existing_users.add(str(row[0]))
        else:
            existing_ids = {str(row[0]) for row in destination_rows if row[0] is not None}
            for row in source.iter_rows(min_row=2, values_only=True):
                if row[0] is not None and str(row[0]) not in existing_ids:
                    destination.append(row)
                    existing_ids.add(str(row[0]))

    workbook.save(BANKING_WORKBOOK_PATH)

    removed_legacy_data = False
    for sheet_name in legacy_sheets:
        if sheet_name in user_workbook.sheetnames:
            del user_workbook[sheet_name]
            removed_legacy_data = True
    if removed_legacy_data:
        user_workbook.save(user_storage.WORKBOOK_PATH)

    return workbook


def get_banking_dashboard(user_id):
    with user_storage.locked_workbook() as user_workbook:
        if not _find_user(user_workbook, user_id):
            raise LookupError("Banking account user was not found.")

        workbook = _open_banking_workbook(user_workbook)
        try:
            accounts = workbook["BankingAccounts"]
            row_number = _account_row(accounts, user_id)
            if row_number is None:
                row_number = accounts.max_row + 1
                accounts.append([str(user_id), 0])
            balance_cents = int(accounts.cell(row_number, 2).value or 0)

            transactions = []
            for row in workbook["BankingTransactions"].iter_rows(
                min_row=2, values_only=True
            ):
                if str(row[1]) != str(user_id):
                    continue
                transactions.append({
                    "kind": str(row[2]),
                    "amount_cents": int(row[3]),
                    "balance_after_cents": int(row[4]),
                    "counterparty": str(row[5] or ""),
                    "created_at": str(row[6]),
                })

            workbook.save(BANKING_WORKBOOK_PATH)
        finally:
            workbook.close()

    transactions.reverse()
    return {"balance_cents": balance_cents, "transactions": transactions}


def record_banking_transaction(user_id, kind, amount_cents, counterparty):
    if kind not in ("send", "receive"):
        raise ValueError("Choose a valid transaction type.")
    if amount_cents <= 0:
        raise ValueError("Transaction amount must be greater than zero.")

    with user_storage.locked_workbook() as user_workbook:
        if not _find_user(user_workbook, user_id):
            raise LookupError("Banking account user was not found.")

        workbook = _open_banking_workbook(user_workbook)
        try:
            accounts = workbook["BankingAccounts"]
            row_number = _account_row(accounts, user_id)
            if row_number is None:
                row_number = accounts.max_row + 1
                accounts.append([str(user_id), 0])
            balance_cents = int(accounts.cell(row_number, 2).value or 0)

            if kind == "send" and amount_cents > balance_cents:
                raise ValueError("Insufficient demo balance for this transfer.")

            updated_balance = (
                balance_cents - amount_cents
                if kind == "send"
                else balance_cents + amount_cents
            )
            if updated_balance > MAX_BALANCE_CENTS:
                raise ValueError("This demo account cannot store a balance that large.")
            accounts.cell(row_number, 2).value = updated_balance
            workbook["BankingTransactions"].append([
                str(uuid4()),
                str(user_id),
                kind,
                amount_cents,
                updated_balance,
                counterparty,
                datetime.now(timezone.utc).isoformat(timespec="seconds"),
            ])
            workbook.save(BANKING_WORKBOOK_PATH)
        finally:
            workbook.close()

    return updated_balance
