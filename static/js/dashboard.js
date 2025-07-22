// static/js/dashboard.js

// Global variables for map instances
let miniMap = null;
let modalMap = null;

// Global variables for form modal state
let currentCategory = "";
let currentItemId = null;

// Data cache (will be populated by Flask or API calls)
const tripData = {
  id: null,
  name: "",
  startDate: "",
  endDate: "",
  description: "",
  totalBudget: 0,
  costs: {
    total: 0,
  },
  weather: [
    {
      day: "Mer 16 Juil",
      icon: "☀️",
      temp: "20/28°C",
      condition: "Ensoleillé",
    },
    {
      day: "Jeu 17 Juil",
      icon: "🌤️",
      temp: "18/26°C",
      condition: "Partiellement nuageux",
    },
    {
      day: "Ven 18 Juil",
      icon: "🌧️",
      temp: "17/23°C",
      condition: "Pluie éparse",
    },
    {
      day: "Sam 19 Juil",
      icon: "🌤️",
      temp: "19/27°C",
      condition: "Partiellement nuageux",
    },
    {
      day: "Dim 20 Juil",
      icon: "☀️",
      temp: "21/29°C",
      condition: "Ensoleillé",
    },
    {
      day: "Lun 21 Juil",
      icon: "☀️",
      temp: "22/30°C",
      condition: "Ensoleillé",
    },
    {
      day: "Mar 22 Juil",
      icon: "🌤️",
      temp: "21/28°C",
      condition: "Partiellement nuageux",
    },
  ],
  itinerary: [],
  mapPoints: [],
  routes: [],
  hotels: [],
  transports: [],
  expenses: [],
  expenseCategories: [
    "Nourriture",
    "Transport",
    "Hébergement",
    "Activités",
    "Shopping",
    "Divers",
  ],
};

// Helper to clear tripData (used when no trip is selected or found)
tripData.clear = function () {
  this.id = null;
  this.name = "";
  this.startDate = "";
  this.endDate = "";
  this.description = "";
  this.totalBudget = 0;
  this.costs.total = 0;
  this.itinerary = [];
  this.mapPoints = [];
  this.routes = [];
  this.hotels = [];
  this.transports = [];
  this.expenses = [];
};

// DOM elements for the form modal
const formModal = document.getElementById("formModal");
const formModalTitle = document.getElementById("formModalTitle");
const dynamicForm = document.getElementById("dynamicForm");
const closeFormModalBtn = document.getElementById("closeFormModal");
const cancelFormBtn = document.getElementById("cancelFormBtn");
const submitFormBtn = document.getElementById("submitFormBtn");

/**
 * Navigates to a specific tab and closes the map modal.
 * @param {string} tabName - The data-tab attribute value of the target tab button.
 */
function navigateAndCloseModal(tabName) {
  event.preventDefault(); // Prevents default link behavior
  document.querySelector(`.tab-button[data-tab='${tabName}']`).click();
  document.getElementById("mapModal").classList.add("hidden");
}

/**
 * Closes the map modal and opens a new URL in a blank tab.
 * @param {string} url - The URL to open.
 */
function closeMapModalAndOpenLink(url) {
  document.getElementById("mapModal").classList.add("hidden");
  window.open(url, "_blank");
}

/**
 * Helper function to create form input elements.
 * @param {object} field - Field configuration object.
 * @returns {HTMLElement} The created input element.
 */
function createFormField(field) {
  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
  } else if (field.type === "select") {
    input = document.createElement("select");
    field.options.forEach((optionText) => {
      const option = document.createElement("option");
      option.value = optionText;
      option.textContent = optionText;
      input.appendChild(option);
    });
  } else {
    input = document.createElement("input");
    input.type = field.type;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.step !== undefined) input.step = field.step;
  }
  input.id = field.name;
  input.name = field.name;
  input.value = field.value;
  input.classList.add(
    "p-2",
    "border",
    "border-stone-300",
    "rounded-md",
    "focus:ring-blue-500",
    "focus:border-blue-500",
    "bg-white",
    "text-stone-800",
    "w-full"
  );

  if (document.body.classList.contains("dark")) {
    input.classList.add(
      "dark:bg-gray-700",
      "dark:border-gray-600",
      "dark:text-gray-200"
    );
  }
  return input;
}

/**
 * Renders dynamic fields for the transport form based on type.
 * @param {string} transportType - The selected transport type ('Avion', 'Train', 'Voiture').
 * @param {object} item - The item data for pre-filling.
 */
function renderTransportFields(transportType, item) {
  const transportSpecificFieldsContainer = document.getElementById(
    "transportSpecificFields"
  );
  if (!transportSpecificFieldsContainer) return;

  transportSpecificFieldsContainer.innerHTML = ""; // Clear existing fields

  let specificFields = [];
  if (transportType === "Avion" || transportType === "Train") {
    specificFields = [
      {
        name: "company",
        label: "Compagnie",
        type: "text",
        value: item ? item.company : "",
      },
      {
        name: "number",
        label: "Numéro",
        type: "text",
        value: item ? item.number : "",
      },
      {
        name: "price",
        label: "Prix (€)",
        type: "number",
        value: item ? item.price || "" : "",
        step: "0.01",
      },
      {
        name: "seat",
        label: "Siège",
        type: "text",
        value: item ? item.seat : "",
      },
    ];
  } else if (transportType === "Voiture") {
    specificFields = [
      {
        name: "estimationCarburant",
        label: "Estimation Carburant (€)",
        type: "number",
        value: item ? item.estimationCarburant || "" : "",
        step: "0.01",
      },
      {
        name: "estimationPeage",
        label: "Estimation Péage (€)",
        type: "number",
        value: item ? item.estimationPeage || "" : "",
        step: "0.01",
      },
      {
        name: "price",
        label: "Coût total estimé (€)",
        type: "number",
        value: item ? item.price || "" : "",
        step: "0.01",
      },
    ];
  }

  specificFields.forEach((field) => {
    const div = document.createElement("div");
    div.classList.add("flex", "flex-col");
    const label = document.createElement("label");
    label.htmlFor = field.name;
    label.textContent = field.label;
    label.classList.add("mb-1", "font-medium", "text-stone-700");
    const input = createFormField(field);
    div.appendChild(label);
    div.appendChild(input);
    transportSpecificFieldsContainer.appendChild(div);
  });
}

/**
 * Displays the generic form modal with dynamic fields.
 * @param {string} title - The title for the modal.
 * @param {string} category - The category of data being added/edited (e.g., 'hotels', 'transports').
 * @param {object} [item=null] - The item object if editing, otherwise null for adding.
 */
function showFormModal(title, category, item = null) {
  formModalTitle.textContent = title;
  currentCategory = category;
  currentItemId = item ? item.id : null;
  dynamicForm.innerHTML = ""; // Clear previous form fields

  let fields = [];
  if (category === "hotels") {
    fields = [
      {
        name: "name",
        label: "Nom de l'hôtel",
        type: "text",
        value: item ? item.name : "",
      },
      {
        name: "address",
        label: "Adresse",
        type: "text",
        value: item ? item.address : "",
      },
      {
        name: "stars",
        label: "Étoiles",
        type: "number",
        value: item ? item.stars : "",
        min: 1,
        max: 5,
      },
      {
        name: "checkInDate",
        label: "Date d'arrivée",
        type: "date",
        value: item ? item.checkInDate : "",
      },
      {
        name: "checkOutDate",
        label: "Date de départ",
        type: "date",
        value: item ? item.checkOutDate : "",
      },
      {
        name: "pricePerNight",
        label: "Prix / nuit (€)",
        type: "number",
        value: item ? item.pricePerNight || "" : "",
        step: "0.01",
      },
      {
        name: "totalPrice",
        label: "Prix total (€)",
        type: "number",
        value: item ? item.totalPrice || "" : "",
        step: "0.01",
      },
      {
        name: "info",
        label: "Informations",
        type: "textarea",
        value: item ? item.info : "",
      },
      {
        name: "bookingUrl",
        label: "URL de réservation",
        type: "url",
        value: item ? item.bookingUrl : "",
      },
    ];
  } else if (category === "transports") {
    fields = [
      {
        name: "type",
        label: "Type",
        type: "select",
        options: ["Avion", "Train", "Voiture"],
        value: item ? item.type : "Avion",
      },
      { name: "from", label: "De", type: "text", value: item ? item.from : "" },
      { name: "to", label: "À", type: "text", value: item ? item.to : "" },
      {
        name: "dep",
        label: "Date et heure de départ",
        type: "datetime-local",
        value: item ? item.dep : "",
      },
      {
        name: "arr",
        label: "Date et heure d'arrivée",
        type: "datetime-local",
        value: item ? item.arr : "",
      },
    ];
  } else if (category === "mapPoints") {
    fields = [
      {
        name: "name",
        label: "Nom de la ville",
        type: "text",
        value: item ? item.name : "",
      },
      {
        name: "lat",
        label: "Latitude",
        type: "number",
        value: item ? item.lat : "",
        step: "any",
      },
      {
        name: "lon",
        label: "Longitude",
        type: "number",
        value: item ? item.lon : "",
        step: "any",
      },
      {
        name: "type",
        label: "Type (origin/stop)",
        type: "text",
        value: item ? item.type : "",
      },
      {
        name: "arrivalDate",
        label: "Date d'arrivée",
        type: "date",
        value: item ? item.arrivalDate : "",
      },
      {
        name: "departureDate",
        label: "Date de départ",
        type: "date",
        value: item ? item.departureDate : "",
      },
    ];
  } else if (category === "expenses") {
    fields = [
      {
        name: "date",
        label: "Date",
        type: "date",
        value: item ? item.date : "",
      },
      {
        name: "category",
        label: "Catégorie",
        type: "select",
        options: tripData.expenseCategories,
        value: item ? item.category : "",
      },
      {
        name: "desc",
        label: "Description",
        type: "textarea",
        value: item ? item.desc : "",
      },
      {
        name: "amount",
        label: "Montant",
        type: "number",
        value: item ? item.amount || "" : "",
        step: "0.01",
      },
    ];
  } else if (category === "itinerary") {
    fields = [
      {
        name: "date",
        label: "Date",
        type: "date",
        value: item ? item.date : "",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        value: item ? item.description : "",
      },
    ];
  } else if (category === "newTrip") {
    fields = [
      { name: "name", label: "Nom du voyage", type: "text", value: "" },
      { name: "startDate", label: "Date de début", type: "date", value: "" },
      { name: "endDate", label: "Date de fin", type: "date", value: "" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        value: "",
      },
      {
        name: "totalBudget",
        label: "Budget total (€)",
        type: "number",
        value: "",
        step: "0.01",
      },
    ];
  }

  fields.forEach((field) => {
    const div = document.createElement("div");
    div.classList.add("flex", "flex-col");
    const label = document.createElement("label");
    label.htmlFor = field.name;
    label.textContent = field.label;
    label.classList.add("mb-1", "font-medium", "text-stone-700");
    const input = createFormField(field);
    div.appendChild(label);
    div.appendChild(input);
    dynamicForm.appendChild(div);
  });

  // Specific logic for Hotels price calculation
  if (category === "hotels") {
    const checkInDateInput = dynamicForm.querySelector("#checkInDate");
    const checkOutDateInput = dynamicForm.querySelector("#checkOutDate");
    const pricePerNightInput = dynamicForm.querySelector("#pricePerNight");
    const totalPriceInput = dynamicForm.querySelector("#totalPrice");

    const calculateNights = () => {
      const start = new Date(checkInDateInput.value);
      const end = new Date(checkOutDateInput.value);
      if (start && end && start < end) {
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return 0;
    };

    const updatePrices = (changedInput) => {
      const numNights = calculateNights();
      if (numNights === 0) {
        pricePerNightInput.value = "";
        totalPriceInput.value = "";
        return;
      }

      if (
        changedInput === pricePerNightInput &&
        pricePerNightInput.value !== ""
      ) {
        totalPriceInput.value = (
          parseFloat(pricePerNightInput.value) * numNights
        ).toFixed(2);
      } else if (
        changedInput === totalPriceInput &&
        totalPriceInput.value !== ""
      ) {
        pricePerNightInput.value = (
          parseFloat(totalPriceInput.value) / numNights
        ).toFixed(2);
      }
    };

    checkInDateInput.addEventListener("change", () =>
      updatePrices(pricePerNightInput)
    );
    checkOutDateInput.addEventListener("change", () =>
      updatePrices(pricePerNightInput)
    );
    pricePerNightInput.addEventListener("input", () =>
      updatePrices(pricePerNightInput)
    );
    totalPriceInput.addEventListener("input", () =>
      updatePrices(totalPriceInput)
    );

    if (item) {
      updatePrices(pricePerNightInput);
    }
  }

  // Specific logic for Transports dynamic fields
  if (category === "transports") {
    const typeSelect = dynamicForm.querySelector("#type");
    const transportSpecificFieldsContainer = document.createElement("div");
    transportSpecificFieldsContainer.id = "transportSpecificFields";
    dynamicForm.appendChild(transportSpecificFieldsContainer);

    const updateTransportFields = () => {
      renderTransportFields(typeSelect.value, item);
    };

    typeSelect.addEventListener("change", updateTransportFields);
    updateTransportFields();
  }

  formModal.classList.remove("hidden");
}

/**
 * Hides the generic form modal.
 */
function hideFormModal() {
  formModal.classList.add("hidden");
  dynamicForm.innerHTML = "";
  currentCategory = "";
  currentItemId = null;
}

// Event listeners for form modal buttons
closeFormModalBtn.addEventListener("click", hideFormModal);
cancelFormBtn.addEventListener("click", hideFormModal);

// Event listener for form submission
dynamicForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(dynamicForm);
  const itemData = {};
  for (const [key, value] of formData.entries()) {
    itemData[key] = value;
  }

  if (currentCategory !== "newTrip" && !tripData.id) {
    console.error("No trip selected. Cannot perform action.");
    alert("Veuillez sélectionner ou créer un voyage d'abord.");
    hideFormModal();
    return;
  }

  try {
    let response;
    if (currentCategory === "newTrip") {
      response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });
    } else if (currentItemId) {
      response = await fetch(
        `/api/trips/${tripData.id}/${currentCategory}/${currentItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        }
      );
    } else {
      response = await fetch(`/api/trips/${tripData.id}/${currentCategory}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log("Opération réussie:", result);

    // After any successful operation, reload the current trip data
    if (currentCategory === "newTrip") {
      // If a new trip was created, set it as the current trip and reload dashboard
      window.location.href = `/dashboard?trip_id=${result.tripId}`;
    } else {
      await loadCurrentTripData(); // Reload data for the current trip
    }
  } catch (error) {
    console.error("Error saving data:", error);
    alert(`Erreur lors de la sauvegarde: ${error.message}`);
  } finally {
    hideFormModal();
  }
});

/**
 * Loads the current trip data from the Flask backend and updates the UI.
 * This function replaces the client-side loadTripData.
 */
async function loadCurrentTripData() {
  if (!tripData.id) {
    console.warn("No current trip ID set. Cannot load data.");
    document.getElementById("mainContent").classList.add("hidden");
    document.getElementById("tripStatusMessage").textContent =
      "Veuillez sélectionner ou créer un voyage.";
    return;
  }

  try {
    const response = await fetch(`/api/trips/${tripData.id}/all_data`); // Assuming Flask has an endpoint for all trip data
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();

    // Update local tripData object
    Object.assign(tripData, data);
    console.log("Trip data loaded from Flask:", tripData);

    // Update header and status message
    document.querySelector("h1").textContent = `Mon Voyage : ${tripData.name}`;
    document.querySelector("header p").textContent = `Du ${
      tripData.startDate
    } au ${tripData.endDate} (${calculateDuration(
      tripData.startDate,
      tripData.endDate
    )} jours)`;
    document.getElementById(
      "tripStatusMessage"
    ).textContent = `Voyage chargé: ${tripData.name}`;
    document.getElementById("mainContent").classList.remove("hidden");

    renderAllSections(); // Re-render all UI components

    // Re-initialize mini-map if it exists
    if (miniMap) {
      destroyLeafletMap(miniMap);
    }
    const initialLat =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lat : 41.9028;
    const initialLon =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lon : 12.4964;
    miniMap = initializeLeafletMap("leafletMap", initialLat, initialLon, 5);
    if (miniMap) miniMap.invalidateSize();
  } catch (error) {
    console.error("Error loading trip data from Flask API:", error);
    alert(`Erreur lors du chargement des données du voyage: ${error.message}`);
    tripData.clear();
    renderAllSections();
    document.getElementById("mainContent").classList.add("hidden");
    document.getElementById("tripStatusMessage").textContent =
      "Erreur lors du chargement du voyage. Veuillez réessayer ou créer un nouveau voyage.";
  }
}

function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Initializes a Leaflet map in the given container.
 * @param {string} mapId - The ID of the map container element.
 * @param {number} initialLat - Initial latitude for the map center.
 * @param {number} initialLon - Initial longitude for the map center.
 * @param {number} initialZoom - Initial zoom level for the map.
 * @returns {L.Map} The initialized Leaflet map instance.
 */
function initializeLeafletMap(mapId, initialLat, initialLon, initialZoom) {
  const mapContainer = L.DomUtil.get(mapId);
  if (mapContainer && mapContainer._leaflet_id) {
    mapContainer._leaflet_id = null;
    mapContainer.innerHTML = "";
  }

  const mapInstance = L.map(mapId).setView(
    [initialLat, initialLon],
    initialZoom
  );

  L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(mapInstance);

  tripData.mapPoints.forEach((city) => {
    const hotelLinkHtml =
      city.hotelName !== "N/A"
        ? `<div>Hôtel: <span class="font-semibold">${city.hotelName}</span></div>
            <a href="#" class="text-blue-600 hover:text-blue-800 underline" onclick="navigateAndCloseModal('hotels');">Voir hôtels</a>`
        : "";

    const popupContent = `
            <div class="font-bold text-base mb-1">${city.name}</div>
            <div>Arrivée: <span class="font-semibold">${city.arrivalDate}</span></div>
            <div>Départ: <span class="font-semibold">${city.departureDate}</span></div>
            ${hotelLinkHtml}
        `;
    L.marker([city.lat, city.lon]).addTo(mapInstance).bindPopup(popupContent);
  });

  tripData.routes.forEach((routeInfo) => {
    const fromCity = tripData.mapPoints.find((p) => p.name === routeInfo.from);
    const toCity = tripData.mapPoints.find((p) => p.name === routeInfo.to);

    if (fromCity && toCity) {
      const polyline = L.polyline(
        [
          [fromCity.lat, fromCity.lon],
          [toCity.lat, toCity.lon],
        ],
        { color: "blue" }
      ).addTo(mapInstance);

      let googleMapsLinkHtml = "";
      const transport = tripData.transports.find(
        (t) => t.id === routeInfo.transportId
      ); // Find by ID now
      if (
        transport &&
        (transport.type === "Train" || transport.type === "Voiture")
      ) {
        googleMapsLinkHtml = `<div><a href="${routeInfo.googleMapsLink}" target="_blank" class="text-blue-600 hover:text-blue-800 underline" onclick="closeMapModalAndOpenLink('${routeInfo.googleMapsLink}');">Voir sur Google Maps</a></div>`;
      }

      const popupContent = `
                <div class="font-bold text-base mb-1">${routeInfo.from} → ${
        routeInfo.to
      }</div>
                <div>Type: <span class="font-semibold">${
                  transport ? transport.type : "N/A"
                }</span></div>
                <div>Durée: <span class="font-semibold">${
                  routeInfo.duration
                }</span></div>
                <div>Distance: <span class="font-semibold">${
                  routeInfo.distance
                }</span></div>
                ${googleMapsLinkHtml}
                <a href="#" class="text-blue-600 hover:text-blue-800 underline" onclick="navigateAndCloseModal('transports');">Voir transports</a>
            `;
      polyline.bindPopup(popupContent);
    }
  });

  return mapInstance;
}

/**
 * Destroys a given Leaflet map instance.
 * @param {L.Map} mapInstance - The Leaflet map instance to destroy.
 */
function destroyLeafletMap(mapInstance) {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}

/**
 * Sets up the tab navigation functionality.
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;

      tabButtons.forEach((btn) => {
        btn.classList.remove("nav-active");
        btn.classList.add("nav-inactive");
      });
      button.classList.add("nav-active");
      button.classList.remove("nav-inactive");

      tabContents.forEach((content) => {
        if (content.id === `${tab}-content`) {
          content.classList.remove("hidden");
        } else {
          content.classList.add("hidden");
        }
      });
    });
  });
}

let costChartInstance = null;

/**
 * Renders or updates the cost distribution donut chart.
 */
function renderCostChart() {
  const ctx = document.getElementById("costChart").getContext("2d");
  const centerTextElement = document.getElementById("costChartCenterText");
  const totalCostDiv = centerTextElement.querySelector(".text-xl");
  const labelDiv = centerTextElement.querySelector(".text-sm");
  const totalEstimatedCostSpan = document.getElementById("totalEstimatedCost");
  const totalSpentExpensesSpan = document.getElementById("totalSpentExpenses");
  const totalBudgetExpensesSpan = document.getElementById(
    "totalBudgetExpenses"
  );

  const aggregatedCosts = {};
  tripData.expenseCategories.forEach((cat) => {
    aggregatedCosts[cat] = 0;
  });
  if (!aggregatedCosts["Hébergement"]) aggregatedCosts["Hébergement"] = 0;
  if (!aggregatedCosts["Transport"]) aggregatedCosts["Transport"] = 0;
  if (!aggregatedCosts["Activités"]) aggregatedCosts["Activités"] = 0;

  tripData.hotels.forEach((hotel) => {
    aggregatedCosts["Hébergement"] += parseFloat(hotel.totalPrice || 0);
  });

  tripData.transports.forEach((transport) => {
    if (transport.type === "Voiture") {
      aggregatedCosts["Transport"] +=
        parseFloat(transport.estimationCarburant || 0) +
        parseFloat(transport.estimationPeage || 0);
    } else {
      aggregatedCosts["Transport"] += parseFloat(transport.price || 0);
    }
  });

  let totalExpensesAmount = 0;
  tripData.expenses.forEach((expense) => {
    const amount = parseFloat(expense.amount || 0);
    totalExpensesAmount += amount;
    if (aggregatedCosts[expense.category] !== undefined) {
      aggregatedCosts[expense.category] += amount;
    } else {
      aggregatedCosts[expense.category] =
        (aggregatedCosts[expense.category] || 0) + amount;
    }
  });

  const dynamicCostCategories = Object.keys(aggregatedCosts)
    .filter((category) => aggregatedCosts[category] > 0)
    .map((category) => ({
      label: category,
      amount: aggregatedCosts[category],
    }));

  const newTotal = dynamicCostCategories.reduce(
    (sum, cat) => sum + cat.amount,
    0
  );
  tripData.costs.total = newTotal;

  totalCostDiv.textContent = `${tripData.costs.total.toFixed(0)} €`;
  labelDiv.textContent = "Coût Total";
  totalEstimatedCostSpan.textContent = `${tripData.costs.total.toFixed(0)} €`;

  totalSpentExpensesSpan.textContent = `${totalExpensesAmount.toFixed(0)} €`;
  totalBudgetExpensesSpan.textContent = `${tripData.costs.total.toFixed(0)} €`;

  const chartData = {
    labels: dynamicCostCategories.map((cat) => cat.label),
    datasets: [
      {
        data: dynamicCostCategories.map((cat) => cat.amount),
        backgroundColor: [
          "#3b82f6",
          "#16a34a",
          "#f97316",
          "#ef4444",
          "#6b7280",
          "#8b5cf6",
          "#ec4899",
        ],
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverBorderColor: "#f3f4f6",
      },
    ],
  };

  if (costChartInstance) {
    costChartInstance.data = chartData;
    costChartInstance.update();
  } else {
    costChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
            external: function (context) {
              const tooltipModel = context.tooltip;
              if (tooltipModel.opacity === 0) {
                totalCostDiv.textContent = `${tripData.costs.total.toFixed(
                  0
                )} €`;
                labelDiv.textContent = "Coût Total";
                return;
              }

              if (tooltipModel.dataPoints.length > 0) {
                const dataPoint = tooltipModel.dataPoints[0];
                const label = dynamicCostCategories[dataPoint.dataIndex].label;
                const value = dynamicCostCategories[dataPoint.dataIndex].amount;
                totalCostDiv.textContent = `${value.toFixed(0)} €`;
                labelDiv.textContent = label;
              }
            },
          },
        },
      },
    });
  }
}

/**
 * Renders the weather forecast carousel.
 */
function renderWeather() {
  const container = document.getElementById("weather-carousel-container");
  if (!container) return;
  let html = "";
  if (tripData.weather && tripData.weather.length > 0) {
    tripData.weather.forEach((w) => {
      html += `
                <div class="flex-shrink-0 text-center p-4 border rounded-lg bg-stone-50 w-36">
                    <div class="font-semibold text-sm">${w.day}</div>
                    <div class="text-4xl my-2">${w.icon}</div>
                    <div class="font-bold text-sm">${w.temp}</div>
                    <div class="text-xs text-stone-500">${w.condition}</div>
                </div>
            `;
    });
  } else {
    html = '<p class="text-stone-500">Aucune donnée météo disponible.</p>';
  }
  container.innerHTML = html;
}

/**
 * Sets up navigation for the weather carousel.
 */
function setupWeatherNavigation() {
  const carousel = document.getElementById("weather-carousel-container");
  const prevBtn = document.getElementById("weather-prev");
  const nextBtn = document.getElementById("weather-next");

  if (!carousel || !prevBtn || !nextBtn) return;

  const scrollAmount = 160;

  prevBtn.addEventListener("click", () => {
    carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  });

  nextBtn.addEventListener("click", () => {
    carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
  });
}

/**
 * Renders the main itinerary list on the overview tab.
 */
function renderItinerary() {
  const list = document.getElementById("itinerary-list");
  if (!list) return;
  let html = "";
  if (tripData.itinerary && tripData.itinerary.length > 0) {
    tripData.itinerary.forEach((item) => {
      html += `
                <li class="flex items-start justify-between py-2 border-b border-stone-100 last:border-b-0">
                   <div class="flex items-start">
                     <span class="bg-blue-100 text-blue-800 text-xs font-semibold mr-3 px-2.5 py-1 rounded-full">${item.date}</span>
                     <span>${item.description}</span>
                   </div>
                   <div class="flex space-x-2">
                       <button data-id="${item.id}" data-category="itinerary" class="edit-btn text-blue-500 hover:text-blue-700 p-1 rounded-full">
                           <i class="fas fa-edit"></i>
                       </button>
                       <button data-id="${item.id}" data-category="itinerary" class="delete-btn text-red-500 hover:text-red-700 p-1 rounded-full">
                           <i class="fas fa-trash-alt"></i>
                       </button>
                   </div>
                </li>
            `;
    });
  } else {
    html = '<p class="text-stone-500">Aucun itinéraire principal défini.</p>';
  }
  list.innerHTML = html;
}

/**
 * Renders the list of hotels.
 */
function renderHotels() {
  const list = document.getElementById("hotels-list");
  if (!list) return;
  let html = "";
  if (tripData.hotels && tripData.hotels.length > 0) {
    tripData.hotels.forEach((h) => {
      let starsHtml = "";
      for (let i = 0; i < 5; i++) {
        starsHtml += `<span class="text-yellow-400">${
          i < h.stars ? "★" : "☆"
        }</span>`;
      }

      const checkIn = new Date(h.checkInDate);
      const checkOut = new Date(h.checkOutDate);
      const diffTime = Math.abs(checkOut - checkIn);
      const numberOfNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      html += `
                <div class="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-bold">${h.name}</h3>
                            <p class="text-sm text-stone-500">${h.address}</p>
                        </div>
                        <div class="text-lg">${starsHtml}</div>
                    </div>
                    <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div><p class="font-semibold">Arrivée</p><p>${
                          h.checkInDate
                        }</p></div>
                        <div><p class="font-semibold">Départ</p><p>${
                          h.checkOutDate
                        }</p></div>
                        <div><p class="font-semibold">Nuits</p><p>${numberOfNights}</p></div>
                        <div><p class="font-semibold">Prix / nuit</p><p>${
                          h.pricePerNight
                        } €</p></div>
                        <div><p class="font-semibold">Prix total</p><p>${
                          h.totalPrice
                        } €</p></div>
                        <div class="col-span-2 md:col-span-1"><p class="font-semibold">Infos</p><p>${
                          h.info
                        }</p></div>
                        ${
                          h.bookingUrl
                            ? `<div><p class="font-semibold">Réservation</p><p><a href="${h.bookingUrl}" target="_blank" class="text-blue-600 hover:underline">Lien Booking</a></p></div>`
                            : ""
                        }
                    </div>
                    <div class="mt-4 flex justify-end space-x-2">
                        <button data-id="${
                          h.id
                        }" data-category="hotels" class="edit-btn bg-blue-500 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-600">Modifier</button>
                        <button data-id="${
                          h.id
                        }" data-category="hotels" class="delete-btn bg-red-500 text-white text-xs px-3 py-1 rounded-full hover:bg-red-600">Supprimer</button>
                    </div>
                </div>
            `;
    });
  } else {
    html =
      '<p class="text-stone-500">Aucun hôtel enregistré pour ce voyage.</p>';
  }
  list.innerHTML = html;
}

/**
 * Renders the list of transports.
 */
function renderTransports() {
  const list = document.getElementById("transports-list");
  if (!list) return;
  const iconMap = { Avion: "✈️", Train: "🚆", Voiture: "🚗" };
  let html = "";
  if (tripData.transports && tripData.transports.length > 0) {
    tripData.transports.forEach((t) => {
      let specificDetails = "";
      if (t.type === "Avion" || t.type === "Train") {
        specificDetails = `
                    <div><p class="font-semibold">Compagnie</p><p>${
                      t.company || "N/A"
                    }</p></div>
                    <div><p class="font-semibold">Numéro</p><p>${
                      t.number || "N/A"
                    }</p></div>
                    <div><p class="font-semibold">Siège</p><p>${
                      t.seat || "N/A"
                    }</p></div>
                    <div><p class="font-semibold">Prix</p><p>${
                      t.price ? t.price + " €" : "N/A"
                    }</p></div>
                `;
      } else if (t.type === "Voiture") {
        specificDetails = `
                    <div><p class="font-semibold">Carburant estimé</p><p>${
                      t.estimationCarburant
                        ? t.estimationCarburant + " €"
                        : "N/A"
                    }</p></div>
                    <div><p class="font-semibold">Péage estimé</p><p>${
                      t.estimationPeage ? t.estimationPeage + " €" : "N/A"
                    }</p></div>
                    ${
                      t.price
                        ? `<div><p class="font-semibold">Coût total estimé</p><p>${t.price} €</p></div>`
                        : ""
                    }
                `;
      }

      html += `
                <div class="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                    <div class="flex items-center mb-4">
                        <span class="text-2xl mr-4">${iconMap[t.type]}</span>
                        <div>
                            <h3 class="font-bold">${t.type}: ${t.from} → ${
        t.to
      }</h3>
                            <p class="text-sm text-stone-600">Départ: ${t.dep.replace(
                              "T",
                              " "
                            )} | Arrivée: ${t.arr.replace("T", " ")}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        ${specificDetails}
                    </div>
                    <div class="mt-4 flex justify-end space-x-2">
                        <button data-id="${
                          t.id
                        }" data-category="transports" class="edit-btn bg-blue-500 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-600">Modifier</button>
                        <button data-id="${
                          t.id
                        }" data-category="transports" class="delete-btn bg-red-500 text-white text-xs px-3 py-1 rounded-full hover:bg-red-600">Supprimer</button>
                    </div>
                </div>
            `;
    });
  } else {
    html =
      '<p class="text-stone-500">Aucun transport enregistré pour ce voyage.</p>';
  }
  list.innerHTML = html;
}

/**
 * Renders the list of itinerary points (cities).
 */
function renderItineraries() {
  const list = document.getElementById("itineraries-list");
  if (!list) return;
  let html = "";
  if (tripData.mapPoints && tripData.mapPoints.length > 0) {
    tripData.mapPoints.forEach((p) => {
      html += `
                <div class="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                    <h3 class="text-lg font-bold">${p.name}</h3>
                    <p class="text-sm text-stone-500">Arrivée: ${p.arrivalDate}</p>
                    <p class="text-sm text-stone-500">Départ: ${p.departureDate}</p>
                    <div class="mt-4 flex justify-end space-x-2">
                        <button data-id="${p.id}" data-category="mapPoints" class="edit-btn bg-blue-500 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-600">Modifier</button>
                        <button data-id="${p.id}" data-category="mapPoints" class="delete-btn bg-red-500 text-white text-xs px-3 py-1 rounded-full hover:bg-red-600">Supprimer</button>
                    </div>
                </div>
            `;
    });
  } else {
    html =
      '<p class="text-stone-500">Aucun point d\'itinéraire enregistré pour ce voyage.</p>';
  }
  list.innerHTML = html;
}

/**
 * Renders the list of expenses in a table.
 */
function renderExpenses() {
  const tableBody = document.getElementById("expenses-table-body");
  if (!tableBody) return;
  let html = "";
  let currentTotalSpent = 0;
  if (tripData.expenses && tripData.expenses.length > 0) {
    tripData.expenses.forEach((e) => {
      currentTotalSpent += parseFloat(e.amount || 0);
      html += `
                <tr class="bg-white border-b">
                    <td class="px-6 py-4">${e.date}</td>
                    <td class="px-6 py-4"><span class="bg-stone-100 text-stone-800 text-xs font-medium px-2.5 py-0.5 rounded">${e.category}</span></td>
                    <td class="px-6 py-4">${e.desc}</td>
                    <td class="px-6 py-4 font-medium">${e.amount} €</td>
                    <td class="px-6 py-4 text-right">
                        <button data-id="${e.id}" data-category="expenses" class="edit-btn bg-blue-500 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-600 mr-2">Modifier</button>
                        <button data-id="${e.id}" data-category="expenses" class="delete-btn bg-red-500 text-white text-xs px-3 py-1 rounded-full hover:bg-red-600">Supprimer</button>
                    </td>
                </tr>
            `;
    });
  } else {
    html = `<tr><td colspan="5" class="px-6 py-4 text-center text-stone-500">Aucune dépense enregistrée pour ce voyage.</td></tr>`;
  }
  tableBody.innerHTML = html;

  document.getElementById(
    "totalSpentExpenses"
  ).textContent = `${currentTotalSpent.toFixed(0)} €`;
}

/**
 * Renders all sections of the dashboard.
 */
function renderAllSections() {
  renderCostChart();
  renderWeather();
  setupWeatherNavigation();
  renderItinerary();
  renderHotels();
  renderTransports();
  renderItineraries();
  renderExpenses();
}

// Delegate event listeners for "Modifier" and "Supprimer" buttons
document.addEventListener("click", async (e) => {
  if (!tripData.id) {
    console.error("No trip selected. Cannot perform action.");
    alert("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }

  if (e.target.closest(".edit-btn")) {
    const btn = e.target.closest(".edit-btn");
    const id = btn.dataset.id;
    const category = btn.dataset.category;

    // Fetch item data from the local tripData cache
    let item;
    if (tripData[category]) {
      item = tripData[category].find((i) => i.id === id);
    }

    if (item) {
      showFormModal(
        `Modifier ${
          item.name || item.description || item.type || item.date || item.desc
        }`,
        category,
        item
      );
    } else {
      console.error("Item not found for editing:", id, category);
      alert("Élément non trouvé pour modification.");
    }
  } else if (e.target.closest(".delete-btn")) {
    const btn = e.target.closest(".delete-btn");
    const id = btn.dataset.id;
    const category = btn.dataset.category;
    console.log(`Attempting to delete ${category} ID: ${id}`);

    try {
      const response = await fetch(
        `/api/trips/${tripData.id}/${category}/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      console.log(`Document ${id} deleted from ${category}.`);
      await loadCurrentTripData(); // Reload all data after deletion
    } catch (error) {
      console.error(`Error deleting document ${id} from ${category}:`, error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    }
  }
});

// Add event listeners for "Add" buttons
document.getElementById("addHotelBtn").addEventListener("click", () => {
  if (!tripData.id) {
    alert("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter un nouvel hôtel", "hotels");
});
document.getElementById("addTransportBtn").addEventListener("click", () => {
  if (!tripData.id) {
    alert("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter un nouveau transport", "transports");
});
document.getElementById("addItineraryBtn").addEventListener("click", () => {
  if (!tripData.id) {
    alert("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter une nouvelle étape", "mapPoints");
});
document.getElementById("addExpenseBtn").addEventListener("click", () => {
  if (!tripData.id) {
    alert("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter une nouvelle dépense", "expenses");
});
document
  .getElementById("addOverviewItineraryBtn")
  .addEventListener("click", () => {
    if (!tripData.id) {
      alert("Veuillez sélectionner ou créer un voyage d'abord.");
      return;
    }
    showFormModal("Ajouter une étape à l'itinéraire principal", "itinerary");
  });

// New Trip and Trip Selection Listeners
document.getElementById("createNewTripBtn").addEventListener("click", () => {
  showFormModal("Créer un nouveau voyage", "newTrip");
});

document.getElementById("tripSelect").addEventListener("change", async (e) => {
  const selectedTripId = e.target.value;
  if (selectedTripId) {
    tripData.id = selectedTripId; // Update the global tripId
    await loadCurrentTripData();
  } else {
    tripData.clear();
    renderAllSections();
    document.getElementById("tripStatusMessage").textContent =
      "Veuillez sélectionner ou créer un voyage.";
    document.getElementById("mainContent").classList.add("hidden");
  }
});

// Initial load logic when dashboard.html is loaded
document.addEventListener("DOMContentLoaded", async function () {
  setupTabs();
  setupWeatherNavigation();

  // Check if a trip_id is present in the URL (e.g., after creating a new trip or direct link)
  const urlParams = new URLSearchParams(window.location.search);
  const initialTripId = urlParams.get("trip_id");

  if (initialTripId) {
    tripData.id = initialTripId;
    await loadCurrentTripData();
  } else {
    // If no trip_id in URL, let Flask handle the initial load (which might redirect or show empty state)
    // The Flask route /dashboard already loads the first trip if available.
    // We just need to ensure the client-side tripData is synced.
    // For simplicity in this Flask migration, we'll rely on Flask to pass initial data.
    // If current_trip_data is passed from Flask, initialize tripData with it.
    const currentTripDataFromFlask = JSON.parse(
      document.getElementById("mainContent").dataset.currentTripData || "null"
    );
    if (currentTripDataFromFlask) {
      Object.assign(tripData, currentTripDataFromFlask);
      tripData.id = currentTripDataFromFlask.id; // Ensure ID is set
      renderAllSections();
      const initialLat =
        tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lat : 41.9028;
      const initialLon =
        tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lon : 12.4964;
      miniMap = initializeLeafletMap("leafletMap", initialLat, initialLon, 5);
      if (miniMap) miniMap.invalidateSize();
    } else {
      // No trip data from Flask, hide main content
      document.getElementById("mainContent").classList.add("hidden");
      document.getElementById("tripStatusMessage").textContent =
        "Aucun voyage trouvé. Créez un nouveau voyage pour commencer.";
    }
  }

  // Map modal event listeners
  document.getElementById("openMapModal").addEventListener("click", () => {
    if (!tripData.id) {
      alert("Veuillez sélectionner ou créer un voyage pour voir la carte.");
      return;
    }
    const modal = document.getElementById("mapModal");
    modal.classList.remove("hidden");

    destroyLeafletMap(miniMap);

    const initialLat =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lat : 43.7696;
    const initialLon =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lon : 11.2558;
    modalMap = initializeLeafletMap(
      "leafletModalMap",
      initialLat,
      initialLon,
      6
    );
    setTimeout(() => {
      if (modalMap) modalMap.invalidateSize();
    }, 100);
  });

  document.getElementById("closeMapModal").addEventListener("click", () => {
    document.getElementById("mapModal").classList.add("hidden");

    destroyLeafletMap(modalMap);

    const initialLat =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lat : 41.9028;
    const initialLon =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lon : 12.4964;
    miniMap = initializeLeafletMap("leafletMap", initialLat, initialLon, 5);
    setTimeout(() => {
      if (miniMap) miniMap.invalidateSize();
    }, 100);
  });
});
