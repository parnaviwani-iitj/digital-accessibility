# Banking section

The central app serves the accessible banking dashboard at `/banking/`. It
inherits the central login session and accessibility preferences and provides:

- Send and receive simulated transactions.
- The dashboard template in `banking/templates/`.
- A per-user balance and transaction history persisted in
  `banking/data/banking.xlsx`.
- General investment education tips.

The demo balance starts at INR 0.00. Incoming transactions add to it; outgoing
transactions are rejected if the balance is insufficient. Transactions are
fictional and do not connect to accounts, payment networks, or real funds.

On the first banking request after this update, any existing banking balance
and transaction records are moved from the central user workbook into the
banking workbook. User login records and accessibility preferences remain in
the central `data/users.xlsx` workbook.
