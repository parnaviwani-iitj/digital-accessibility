document.addEventListener("DOMContentLoaded", () => {
  const tripCosts = {
    Jaipur: 4500, Udaipur: 7000, Jodhpur: 6000, Goa: 12000, Manali: 14000,
    Shimla: 11000, Agra: 5000, Delhi: 7000, Mumbai: 11000, Kerala: 15000,
    Varanasi: 6500, Amritsar: 7000, Srinagar: 16000, Rishikesh: 8500, Darjeeling: 13000
  };
  const destinationCosts = {
    Jaipur: { transport: 1500, food: 1200, activities: 800 },
    Goa: { transport: 4000, food: 1800, activities: 2000 },
    Agra: { transport: 1800, food: 1000, activities: 700 },
    Delhi: { transport: 2500, food: 1400, activities: 1000 },
    Mumbai: { transport: 3500, food: 1800, activities: 1500 },
    Udaipur: { transport: 2000, food: 1300, activities: 1000 },
    Jodhpur: { transport: 1800, food: 1200, activities: 800 },
    Manali: { transport: 3500, food: 1600, activities: 2000 },
    Shimla: { transport: 3000, food: 1500, activities: 1500 },
    Kerala: { transport: 4500, food: 2000, activities: 2500 },
    Varanasi: { transport: 2200, food: 1000, activities: 800 },
    Amritsar: { transport: 2200, food: 1200, activities: 900 },
    Srinagar: { transport: 5000, food: 2000, activities: 3000 },
    Rishikesh: { transport: 2500, food: 1200, activities: 1500 },
    Darjeeling: { transport: 4000, food: 1600, activities: 2000 }
  };
  const hotelCosts = {
    "Taj Hotel": 12000, "ITC Hotels": 10000, "The Oberoi": 16000,
    "Radisson Hotel": 8000, "Holiday Inn": 6000
  };
  const supportLabels = {
    none: "No specific request", wheelchair: "Wheelchair access requested",
    hearing: "Hearing accessibility requested", visual: "Visual accessibility requested",
    mobility: "Mobility assistance requested", other: "Other assistance requested"
  };
  const destinationInput = document.getElementById("destination");
  const travelDate = document.getElementById("travelDate");
  const travellers = document.getElementById("travellers");
  const bookingDate = document.getElementById("bookingDate");
  const bookingPeople = document.getElementById("bookingPeople");
  const namesContainer = document.getElementById("travellerNames");
  const budgetMin = document.getElementById("budgetMin");
  const budgetMax = document.getElementById("budgetMax");
  const estimate = document.getElementById("tripEstimate");
  const bookingResult = document.getElementById("bookingResult");
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };
  travelDate.min = today();
  bookingDate.min = today();

  function getPlaceCost(place) {
    const key = Object.keys(tripCosts).find(name => name.toLowerCase() === place.trim().toLowerCase());
    return key ? { name: key, amount: tripCosts[key] } : null;
  }

  function rupees(amount) {
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  }

  function groupSize(input) {
    return Math.max(1, Math.min(20, Number.parseInt(input.value, 10) || 1));
  }

  function createTravellerFields() {
    const count = groupSize(travellers);
    const previousNames = [...namesContainer.querySelectorAll("input")].map(input => input.value);
    namesContainer.replaceChildren();
    namesContainer.hidden = false;
    const heading = document.createElement("h3");
    heading.textContent = "Traveller names";
    namesContainer.append(heading);
    for (let index = 0; index < count; index += 1) {
      const field = document.createElement("div");
      field.className = "tour-traveller-name-field";
      const label = document.createElement("label");
      label.htmlFor = `traveller-${index + 1}`;
      label.textContent = `Traveller ${index + 1} full name`;
      const input = document.createElement("input");
      input.type = "text";
      input.id = `traveller-${index + 1}`;
      input.autocomplete = "name";
      input.required = true;
      input.value = previousNames[index] || "";
      field.append(label, input);
      namesContainer.append(field);
    }
  }

  function updateEstimate() {
    const place = destinationInput.value.trim();
    const cost = getPlaceCost(place);
    if (!place) {
      estimate.textContent = "Select a destination to view estimated trip cost.";
      return;
    }
    if (!cost) {
      estimate.textContent = `No estimate is available for ${place}. Select a listed destination to see a demo estimate.`;
      return;
    }
    const count = groupSize(travellers);
    estimate.textContent = `Destination: ${cost.name} | Estimated per person: ${rupees(cost.amount)} | Travellers: ${count} | Estimated group total: ${rupees(cost.amount * count)}. Demo estimate only; actual prices may vary.`;
  }

  function updateDestinationCards() {
    document.querySelectorAll(".tour-destination-card").forEach(card => {
      const place = card.querySelector("h3").textContent.trim();
      const cost = getPlaceCost(place);
      if (!cost) return;
      let price = card.querySelector(".tour-destination-price");
      if (!price) {
        price = document.createElement("p");
        price.className = "tour-destination-price";
        card.querySelector(".tour-card-content").insertBefore(price, card.querySelector(".choose-destination"));
      }
      const count = groupSize(travellers);
      price.textContent = `Estimated: ${rupees(cost.amount)} per person | Group total: ${rupees(cost.amount * count)}`;
    });
  }

  function applyBudgetFilter() {
    const minimum = budgetMin.value === "" ? null : Number(budgetMin.value);
    const maximum = budgetMax.value === "" ? null : Number(budgetMax.value);
    const count = groupSize(travellers);
    let visibleCount = 0;
    document.querySelectorAll(".tour-destination-card").forEach(card => {
      const cost = getPlaceCost(card.querySelector("h3").textContent);
      let visible = true;
      if (minimum !== null || maximum !== null) {
        visible = Boolean(cost)
          && (minimum === null || cost.amount * count >= minimum)
          && (maximum === null || cost.amount * count <= maximum);
      }
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    let message = document.getElementById("budgetFilterMessage");
    if (!message) {
      message = document.createElement("p");
      message.id = "budgetFilterMessage";
      message.className = "tour-budget-message";
      message.setAttribute("role", "status");
      document.querySelector(".tour-destination-grid").before(message);
    }
    const filtering = minimum !== null || maximum !== null;
    message.textContent = filtering
      ? visibleCount === 0 ? "No destinations match this budget. Try a different range." : `${visibleCount} destination(s) match your budget.`
      : "";
  }

  function syncSearchToBooking() {
    document.getElementById("bookingDestination").value = destinationInput.value.trim();
    bookingDate.value = travelDate.value;
    bookingPeople.value = String(groupSize(travellers));
    createTravellerFields();
    updateDestinationCards();
    applyBudgetFilter();
  }

  document.getElementById("searchForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!destinationInput.reportValidity() || !travelDate.reportValidity() || !travellers.reportValidity()) return;
    if (travelDate.value < today()) {
      travelDate.setCustomValidity("Choose today or a future travel date.");
      travelDate.reportValidity();
      travelDate.setCustomValidity("");
      return;
    }
    if (budgetMin.value !== "" && budgetMax.value !== "" && Number(budgetMin.value) > Number(budgetMax.value)) {
      document.getElementById("searchMessage").textContent = "Minimum budget cannot be greater than maximum budget.";
      budgetMin.focus();
      return;
    }
    syncSearchToBooking();
    document.getElementById("searchMessage").textContent = `Your trip search for ${destinationInput.value.trim()} is ready. Review your booking request below.`;
    document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
    document.getElementById("bookingDestination").focus({ preventScroll: true });
  });

  document.querySelectorAll(".choose-destination").forEach(button => {
    button.addEventListener("click", () => {
      destinationInput.value = button.dataset.place;
      document.getElementById("bookingDestination").value = button.dataset.place;
      updateEstimate();
      document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
      document.getElementById("bookingDestination").focus({ preventScroll: true });
    });
  });

  travellers.addEventListener("input", () => {
    createTravellerFields();
    bookingPeople.value = String(groupSize(travellers));
    updateEstimate();
    updateDestinationCards();
    applyBudgetFilter();
  });
  destinationInput.addEventListener("input", updateEstimate);
  destinationInput.addEventListener("change", updateEstimate);
  budgetMin.addEventListener("input", applyBudgetFilter);
  budgetMax.addEventListener("input", applyBudgetFilter);
  bookingPeople.addEventListener("input", () => {
    travellers.value = String(groupSize(bookingPeople));
    createTravellerFields();
    updateEstimate();
    updateDestinationCards();
    applyBudgetFilter();
  });

  document.getElementById("bookingForm").addEventListener("submit", event => {
    event.preventDefault();
    const destination = document.getElementById("bookingDestination").value.trim();
    const date = bookingDate.value;
    const people = groupSize(bookingPeople);
    const hotel = document.getElementById("hotel").value;
    const place = Object.keys(destinationCosts).find(name => name.toLowerCase() === destination.toLowerCase());
    if (!destination || !date || date < today() || people < 1 || people > 20 || !hotel) {
      bookingResult.textContent = "Enter a destination, choose a hotel, select today or a future date, and enter 1–20 travellers.";
      bookingResult.focus();
      return;
    }
    if (!place) {
      bookingResult.textContent = "Please choose a destination with a demo estimate from the list.";
      bookingResult.focus();
      return;
    }
    const travellerNames = [...namesContainer.querySelectorAll("input")];
    if (travellerNames.length !== people || travellerNames.some(input => !input.value.trim())) {
      bookingResult.textContent = "Please enter the name of every traveller in the search section.";
      namesContainer.hidden = false;
      const firstEmpty = travellerNames.find(input => !input.value.trim());
      if (firstEmpty) firstEmpty.focus();
      else namesContainer.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const costs = destinationCosts[place];
    const bill = {
      destination: place,
      date,
      people,
      names: travellerNames.map(input => input.value.trim()),
      hotel,
      support: supportLabels[document.getElementById("support").value],
      notes: document.getElementById("notes").value.trim(),
      transport: costs.transport * people,
      food: costs.food * people,
      activities: costs.activities * people,
      hotelCost: hotelCosts[hotel],
      total: (costs.transport + costs.food + costs.activities) * people + hotelCosts[hotel]
    };
    renderInvoice(bill);
  });

  function renderInvoice(bill) {
    const details = document.getElementById("invoiceDetails");
    details.replaceChildren();
    const addRow = (labelText, valueText) => {
      const row = document.createElement("div");
      row.className = "tour-invoice-row";
      const label = document.createElement("span");
      label.textContent = labelText;
      const value = document.createElement("strong");
      value.textContent = valueText || "Not provided";
      row.append(label, value);
      details.append(row);
    };
    addRow("Destination", bill.destination);
    addRow("Travel date", bill.date);
    addRow("Number of travellers", String(bill.people));
    bill.names.forEach((name, index) => addRow(`Traveller ${index + 1}`, name));
    addRow("Selected hotel", bill.hotel);
    addRow("Accessibility requirements", bill.support);
    addRow("Additional details", bill.notes || "None");
    const heading = document.createElement("h3");
    heading.textContent = "Estimated cost breakdown";
    details.append(heading);
    addRow("Transport", rupees(bill.transport));
    addRow("Hotel (two-night estimate)", rupees(bill.hotelCost));
    addRow("Food", rupees(bill.food));
    addRow("Activities and other costs", rupees(bill.activities));
    document.getElementById("invoiceTotal").textContent = rupees(bill.total);
    document.getElementById("invoiceStatus").textContent = "Please check your selected trip details and estimated costs.";
    document.getElementById("tripInvoice").hidden = false;
    document.getElementById("tripInvoice").scrollIntoView({ behavior: "smooth" });
    document.getElementById("invoiceTitle").focus({ preventScroll: true });
    bookingResult.textContent = "Your estimate is ready. This is not a confirmed booking.";
  }

  document.getElementById("backToBooking").addEventListener("click", () => {
    document.getElementById("tripInvoice").hidden = true;
    document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
    document.getElementById("bookingDestination").focus({ preventScroll: true });
  });
  document.getElementById("printInvoice").addEventListener("click", () => {
    document.body.classList.add("tour-printing");
    window.print();
  });
  window.addEventListener("afterprint", () => document.body.classList.remove("tour-printing"));

  const voiceSearchButton = document.getElementById("voiceSearch");
  const voiceMessage = document.getElementById("voiceMessage");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition) {
    const recognition = new Recognition();
    recognition.interimResults = false;
    recognition.continuous = false;
    voiceSearchButton.addEventListener("click", () => {
      recognition.lang = document.getElementById("speechLanguage").value;
      voiceMessage.textContent = "Listening... Please speak your destination.";
      voiceSearchButton.disabled = true;
      try {
        recognition.start();
      } catch {
        voiceSearchButton.disabled = false;
        voiceMessage.textContent = "Voice search could not start. Please type your destination instead.";
      }
    });
    recognition.onresult = event => {
      destinationInput.value = event.results[0][0].transcript.trim();
      updateEstimate();
      voiceMessage.textContent = `Destination detected: ${destinationInput.value}`;
    };
    recognition.onerror = () => {
      voiceMessage.textContent = "Voice search failed. Please try again or type your destination.";
    };
    recognition.onend = () => {
      voiceSearchButton.disabled = false;
    };
  } else {
    voiceSearchButton.disabled = true;
    voiceMessage.textContent = "Voice search is not supported in this browser.";
  }

  createTravellerFields();
  updateEstimate();
  updateDestinationCards();
});
