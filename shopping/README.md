# Shopping section

The EasyShop demo is integrated at `/shopping/` using the shared Flask login and accessibility preferences. It includes a searchable, category-filtered catalogue, an editable cart, demo checkout, and a printable invoice.

The catalogue is defined in `catalog.py`; the page and its browser-side cart logic are in `templates/shopping.html` and `static/js/shopping.js`.

Checkout and payment are demonstrations only. Customer details are used in the browser to create the displayed invoice and are not submitted to the server or persisted. Use fictional details only.
