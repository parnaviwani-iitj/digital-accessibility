document.addEventListener("DOMContentLoaded", () => {
  const products = [...document.querySelectorAll(".shop-product-card")].map(card => ({
    id: Number(card.dataset.productId),
    name: card.querySelector("h3").textContent,
    price: Number(card.querySelector(".shop-price").textContent.match(/\d+/)[0])
  }));
  const productById = new Map(products.map(product => [product.id, product]));
  const cart = new Map();
  const deliveryCharge = 50;
  const productGrid = document.getElementById("productGrid");
  const cartContents = document.getElementById("cartContents");
  const cartCount = document.getElementById("cartCount");
  const cartSummary = document.querySelector(".shop-cart-summary");
  const status = document.getElementById("shopStatus");
  const productSearch = document.getElementById("productSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const checkoutForm = document.getElementById("checkoutForm");
  let order = null;

  function setStatus(message) {
    status.textContent = message;
  }

  function totalItems() {
    return [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  }

  function subtotal() {
    return [...cart].reduce((sum, [id, quantity]) => sum + productById.get(id).price * quantity, 0);
  }

  function makeButton(text, className, action, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.dataset.cartAction = action;
    if (label) button.setAttribute("aria-label", label);
    return button;
  }

  function renderCart() {
    const count = totalItems();
    cartCount.textContent = String(count);
    cartSummary.setAttribute("aria-label", `Cart contains ${count} items`);
    cartContents.replaceChildren();

    if (cart.size === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Your cart is empty.";
      cartContents.append(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "shop-cart-list";
    for (const [id, quantity] of cart) {
      const product = productById.get(id);
      const item = document.createElement("li");
      item.className = "shop-cart-item";
      item.dataset.productId = String(id);
      const heading = document.createElement("h3");
      heading.textContent = product.name;
      item.append(heading);
      for (const text of [
        `Price: ₹${product.price}`,
        `Quantity: ${quantity}`,
        `Subtotal: ₹${product.price * quantity}`
      ]) {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        item.append(paragraph);
      }
      const actions = document.createElement("div");
      actions.className = "shop-cart-actions";
      actions.append(
        makeButton("−", "shop-button", "decrease", `Decrease ${product.name} quantity`),
        makeButton("+", "shop-button", "increase", `Increase ${product.name} quantity`),
        makeButton(`Remove ${product.name}`, "shop-button shop-secondary-button", "remove")
      );
      item.append(actions);
      list.append(item);
    }
    cartContents.append(list);

    const total = document.createElement("h3");
    total.textContent = `Subtotal: ₹${subtotal()}`;
    cartContents.append(total);
    cartContents.append(
      makeButton("Clear cart", "shop-button shop-secondary-button", "clear"),
      makeButton("Proceed to Checkout", "shop-button", "checkout")
    );
  }

  function updateProducts() {
    const term = productSearch.value.trim().toLowerCase();
    const category = categoryFilter.value;
    let visible = 0;
    productGrid.querySelectorAll(".shop-product-card").forEach(card => {
      const matches = (category === "All" || card.dataset.category === category)
        && card.dataset.search.includes(term);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    document.getElementById("productCount").textContent = `${visible} products shown`;
    document.getElementById("noProducts").hidden = visible !== 0;
  }

  function showView(name) {
    document.getElementById("shopView").hidden = name !== "shop";
    document.getElementById("checkoutView").hidden = name !== "checkout";
    document.getElementById("invoiceView").hidden = name !== "invoice";
    document.body.classList.remove("shop-printing");
    const heading = document.querySelector(`#${name === "shop" ? "shopView" : name === "checkout" ? "checkoutView" : "invoiceView"} h2`);
    if (heading) heading.focus();
  }

  function renderCheckoutSummary() {
    const items = document.getElementById("checkoutItems");
    items.replaceChildren();
    for (const [id, quantity] of cart) {
      const product = productById.get(id);
      const item = document.createElement("li");
      item.textContent = `${product.name} × ${quantity} — ₹${product.price * quantity}`;
      items.append(item);
    }
    document.getElementById("checkoutSubtotal").textContent = String(subtotal());
    document.getElementById("checkoutTotal").textContent = String(subtotal() + deliveryCharge);
  }

  function placeOrder() {
    if (cart.size === 0) {
      setStatus("Your cart is empty.");
      showView("shop");
      return;
    }
    const customerName = document.getElementById("customerName");
    const deliveryAddress = document.getElementById("deliveryAddress");
    customerName.setCustomValidity(customerName.value.trim() ? "" : "Enter a demo customer name.");
    deliveryAddress.setCustomValidity(deliveryAddress.value.trim() ? "" : "Enter a fictional demo address.");
    if (!customerName.reportValidity() || !deliveryAddress.reportValidity()) return;
    order = {
      orderId: `ES-${Date.now()}`,
      customerName: customerName.value.trim(),
      deliveryAddress: deliveryAddress.value.trim(),
      paymentMethod: checkoutForm.querySelector('input[name="payment"]:checked').value,
      items: [...cart].map(([id, quantity]) => ({ product: productById.get(id), quantity })),
      subtotal: subtotal(),
      total: subtotal() + deliveryCharge
    };
    document.getElementById("invoiceOrderId").textContent = order.orderId;
    document.getElementById("invoiceCustomer").textContent = order.customerName;
    document.getElementById("invoiceAddress").textContent = order.deliveryAddress;
    document.getElementById("invoicePayment").textContent = order.paymentMethod;
    document.getElementById("invoiceSubtotal").textContent = String(order.subtotal);
    document.getElementById("invoiceTotal").textContent = String(order.total);
    const invoiceItems = document.getElementById("invoiceItems");
    invoiceItems.replaceChildren();
    order.items.forEach(({ product, quantity }) => {
      const line = document.createElement("div");
      const description = document.createElement("p");
      description.textContent = `${product.name} × ${quantity}`;
      const price = document.createElement("p");
      price.textContent = `₹${product.price * quantity}`;
      line.append(description, price);
      invoiceItems.append(line);
    });
    showView("invoice");
    setStatus("Your demo order has been placed successfully.");
  }

  productSearch.addEventListener("input", updateProducts);
  categoryFilter.addEventListener("change", updateProducts);
  productGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-add-product]");
    if (!button) return;
    const product = productById.get(Number(button.dataset.addProduct));
    cart.set(product.id, (cart.get(product.id) || 0) + 1);
    renderCart();
    setStatus(`${product.name} added to cart.`);
  });
  cartContents.addEventListener("click", event => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;
    const action = button.dataset.cartAction;
    const item = button.closest("[data-product-id]");
    const id = item ? Number(item.dataset.productId) : null;
    if (action === "clear") {
      cart.clear();
      renderCart();
      setStatus("Cart cleared.");
    } else if (action === "checkout") {
      renderCheckoutSummary();
      showView("checkout");
      setStatus("Checkout page opened.");
    } else if (action === "remove") {
      const name = productById.get(id).name;
      cart.delete(id);
      renderCart();
      setStatus(`${name} removed from cart.`);
    } else if (action === "increase" || action === "decrease") {
      const quantity = cart.get(id) + (action === "increase" ? 1 : -1);
      if (quantity > 0) cart.set(id, quantity);
      else cart.delete(id);
      renderCart();
      setStatus("Cart quantity updated.");
    }
  });
  document.getElementById("placeOrder").addEventListener("click", placeOrder);
  document.getElementById("backToCart").addEventListener("click", () => showView("shop"));
  document.getElementById("printInvoice").addEventListener("click", () => {
    document.body.classList.add("shop-printing");
    window.print();
  });
  document.getElementById("continueShopping").addEventListener("click", () => {
    cart.clear();
    order = null;
    document.getElementById("customerName").value = "";
    document.getElementById("deliveryAddress").value = "";
    checkoutForm.querySelector('input[name="payment"][value="Cash on Delivery"]').checked = true;
    productSearch.value = "";
    categoryFilter.value = "All";
    updateProducts();
    renderCart();
    showView("shop");
    setStatus("You can start a new shopping session.");
  });
  window.addEventListener("afterprint", () => document.body.classList.remove("shop-printing"));
});
