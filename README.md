# Central Access Portal

A Flask prototype with a shared account, saved accessibility preferences, and four service sections: Healthcare, Banking, Shopping, and Tours.

## Features

- Central registration, login, and logout using one Flask session.
- Excel workbook storage in `data/users.xlsx` for demo accounts and accessibility preferences.
- Accessibility preferences managed from the Accessibility page and applied across the home page and service pages. New profiles use normal settings by default; users can change and save preferences at any time.
- Shared quick-access controls for optional read-aloud and keyboard-navigation guidance.
- Healthcare directory and appointment-request demonstration.
- Banking dashboard with fictional demo balance and transactions.
- EasyShop catalogue with product search, category filters, cart management, demo checkout, and printable invoice.
- AccessTravel with destination search, estimated costs, group-budget filtering, traveller names, optional voice search, accessibility requests, booking estimate, and printable invoice.
- Responsive home-page service cards with aligned section buttons.

## Run locally

1. Open this folder in a terminal.
2. Create and activate a Python virtual environment.
3. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

4. Copy `.env.example` to `.env` and replace the development values with long, random secrets.
5. Start the app:

   ```powershell
   python app.py
   ```

6. Open `http://127.0.0.1:5000`, create an account, and log in.
7. Open Accessibility to review or update saved settings, or open a service from the home page.

On Windows PowerShell, copy the environment template with:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```sh
cp .env.example .env
```

## Project layout

- `app.py`: Flask application, shared authentication and service routes.
- `auth/`: account registration and authentication helpers.
- `accessibility/`: saved preference defaults and Excel persistence.
- `templates/`: shared portal pages, including home and accessibility preferences.
- `static/`: shared styles and accessibility JavaScript.
- `health/`: Healthcare template, styles, scripts, and placeholder directory data.
- `banking/`: Banking dashboard, storage logic, and demo workbook.
- `shopping/`: EasyShop catalogue, template, styles, and cart/checkout behavior.
- `tours/`: AccessTravel template, styles, and trip-search/estimate behavior.
- `data/users.xlsx`: local demo users and accessibility preferences; created as needed.

## Demo and privacy boundaries

This is a classroom prototype, not a production service. Healthcare appointment requests do not book appointments or store submitted personal information. Shopping checkout is simulated; its customer and address fields stay in the browser and are not submitted or saved. Tours prices and invoices are estimates only; no trip booking is submitted or confirmed. Use fictional details in all demos.

The project uses one same-origin Flask session; this is not production SSO. Excel storage is for a small local demo and is not suitable for concurrent or high-load production use. Do not store medical records, bank credentials, payment data, or other sensitive personal information.
Project presentation link - https://canva.link/gv0xagcjddyqluq
