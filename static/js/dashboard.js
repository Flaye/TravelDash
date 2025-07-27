// static/js/dashboard.js

// Global variables for map instances
let miniMap = null;
let modalMap = null;
let costChartInstance = null; // To store the Chart.js instance

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
    hotels: 0,
    transports: 0,
    activities: 0,
    food: 0,
    shopping: 0,
    other: 0,
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
  routes: [], // Routes are derived from mapPoints, might need manual update or a more complex backend
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
  this.costs.hotels = 0;
  this.costs.transports = 0;
  this.costs.activities = 0;
  this.costs.food = 0;
  this.costs.shopping = 0;
  this.costs.other = 0;
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
const actionMessageDiv = document.getElementById("actionMessage"); // New: Get reference to the action message div

// New DOM elements for trip list and detail views
const tripListView = document.getElementById("tripListView");
const tripDetailView = document.getElementById("tripDetailView");
const tripCardsContainer = document.getElementById("tripCardsContainer");
const noTripsMessage = document.getElementById("noTripsMessage");
const backToTripListBtn = document.getElementById("backToTripListBtn");

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

  // Determine the default date to use for new entries
  const defaultDate = tripData.startDate || "";

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
        value: item ? item.checkInDate : defaultDate,
      },
      {
        name: "checkOutDate",
        label: "Date de départ",
        type: "date",
        value: item ? item.checkOutDate : defaultDate,
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
        value: item ? item.dep : defaultDate ? `${defaultDate}T09:00` : "",
      },
      {
        name: "arr",
        label: "Date et heure d'arrivée",
        type: "datetime-local",
        value: item ? item.arr : defaultDate ? `${defaultDate}T11:00` : "",
      },
    ];
  } else if (category === "mapPoints") {
    // Changed to city_name for geocoding
    fields = [
      {
        name: "name",
        label: "Nom de la ville",
        type: "text",
        value: item ? item.name : "",
      },
      {
        name: "arrivalDate",
        label: "Date d'arrivée",
        type: "date",
        value: item ? item.arrivalDate : defaultDate,
      },
      {
        name: "departureDate",
        label: "Date de départ",
        type: "date",
        value: item ? item.departureDate : defaultDate,
      },
      // Hidden fields for lat/lon, populated by geocoding
      { name: "lat", type: "hidden", value: item ? item.lat : "" },
      { name: "lon", type: "hidden", value: item ? item.lon : "" },
    ];
  } else if (category === "expenses") {
    fields = [
      {
        name: "date",
        label: "Date",
        type: "date",
        value: item ? item.date : defaultDate,
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
        value: item ? item.date : defaultDate,
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        value: item ? item.description : "",
      },
    ];
  } else if (category === "newTrip") {
    // For newTrip, keep values empty as there's no tripData.startDate yet
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

    // Special handling for city_name field with datalist
    if (category === "mapPoints" && field.name === "name") {
      input.setAttribute("list", "city-suggestions");
      input.setAttribute(
        "placeholder",
        "Commencez à taper le nom de la ville..."
      );
      input.addEventListener(
        "input",
        debounce(async (e) => {
          const query = e.target.value;
          if (query.length > 2) {
            await searchCitiesForAutocomplete(query);
          } else {
            document.getElementById("city-suggestions").innerHTML = "";
          }
        }, 300)
      );
      // Add a status indicator for geocoding
      const statusSpan = document.createElement("span");
      statusSpan.id = "city-geocode-status";
      statusSpan.classList.add("text-sm", "text-stone-500", "mt-1");
      div.appendChild(label);
      div.appendChild(input);
      div.appendChild(statusSpan);
      dynamicForm.appendChild(div);

      // Add the datalist element
      const dataList = document.createElement("datalist");
      dataList.id = "city-suggestions";
      dynamicForm.appendChild(dataList);

      // Add event listener for when a suggestion is selected or input is blurred
      input.addEventListener("change", async (e) => {
        const selectedCityName = e.target.value;
        await geocodeCityOnDemand(selectedCityName);
      });
      input.addEventListener("blur", async (e) => {
        const blurredCityName = e.target.value;
        await geocodeCityOnDemand(blurredCityName);
      });
    } else {
      div.appendChild(label);
      div.appendChild(input);
      dynamicForm.appendChild(div);
    }
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
  actionMessageDiv.classList.add("hidden"); // Hide any action message when modal closes
}

// Event listeners for form modal buttons
closeFormModalBtn.addEventListener("click", hideFormModal);
cancelFormBtn.addEventListener("click", hideFormModal);

// --- Geocoding Functions ---
let geocodeTimeout;
function debounce(func, delay) {
  return function (...args) {
    const context = this;
    clearTimeout(geocodeTimeout);
    geocodeTimeout = setTimeout(() => func.apply(context, args), delay);
  };
}

/**
 * Searches for city suggestions using Nominatim API for autocompletion.
 * @param {string} query - The city name query.
 */
async function searchCitiesForAutocomplete(query) {
  const datalist = document.getElementById("city-suggestions");
  const statusSpan = document.getElementById("city-geocode-status");
  datalist.innerHTML = ""; // Clear previous suggestions
  statusSpan.textContent = "Recherche...";

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=5&addressdetails=1`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.length > 0) {
      data.forEach((place) => {
        // Prioritize city, town, village, then fallback to display_name
        let displayName = place.display_name;
        if (
          place.address &&
          (place.address.city || place.address.town || place.address.village)
        ) {
          displayName =
            place.address.city || place.address.town || place.address.village;
          if (place.address.country) {
            displayName += `, ${place.address.country}`;
          }
        }
        const option = document.createElement("option");
        option.value = displayName; // Display name for the user
        option.dataset.lat = place.lat;
        option.dataset.lon = place.lon;
        datalist.appendChild(option);
      });
      statusSpan.textContent = "";
    } else {
      statusSpan.textContent = "Aucune suggestion trouvée.";
    }
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
    statusSpan.textContent = "Erreur de recherche.";
  }
}

/**
 * Geocodes a city name to get its latitude and longitude.
 * Updates hidden form fields and displays status.
 * @param {string} cityName - The name of the city to geocode.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function geocodeCityOnDemand(cityName) {
  const latInput = dynamicForm.querySelector("#lat");
  const lonInput = dynamicForm.querySelector("#lon");
  const statusSpan = document.getElementById("city-geocode-status");

  if (!cityName) {
    latInput.value = "";
    lonInput.value = "";
    statusSpan.textContent = "";
    return false;
  }

  statusSpan.textContent = "Géocodage...";
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        cityName
      )}&format=json&limit=1`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (data.length > 0) {
      latInput.value = data[0].lat;
      lonInput.value = data[0].lon;
      statusSpan.textContent = `Coordonnées trouvées: Lat ${parseFloat(
        data[0].lat
      ).toFixed(2)}, Lon ${parseFloat(data[0].lon).toFixed(2)}`;
      return true;
    } else {
      latInput.value = "";
      lonInput.value = "";
      statusSpan.textContent =
        "Ville non trouvée. Veuillez vérifier l'orthographe.";
      return false;
    }
  } catch (error) {
    console.error("Error geocoding city:", error);
    latInput.value = "";
    lonInput.value = "";
    statusSpan.textContent = "Erreur de géocodage.";
    return false;
  }
}

/**
 * Shows a temporary message to the user.
 * @param {string} message - The message to display.
 */
function showActionMessage(message) {
  actionMessageDiv.textContent = message;
  actionMessageDiv.classList.remove("hidden");
  setTimeout(() => {
    actionMessageDiv.classList.add("hidden");
  }, 3000); // Hide after 3 seconds
}

// Event listener for form submission
dynamicForm.addEventListener("submit", async (e) => {
  console.log("[dynamicForm submit] Form submission initiated."); // Log start of submission
  e.preventDefault();
  const formData = new FormData(dynamicForm);
  const itemData = {};
  for (const [key, value] of formData.entries()) {
    itemData[key] = value;
  }
  console.log("[dynamicForm submit] itemData being sent:", itemData); // Log itemData

  // Special handling for mapPoints: ensure lat/lon are populated
  if (currentCategory === "mapPoints") {
    const cityNameInput = dynamicForm.querySelector("#name"); // The city name input
    const latInput = dynamicForm.querySelector("#lat");
    const lonInput = dynamicForm.querySelector("#lon");

    // If lat/lon are not already set, try to geocode now
    if (!latInput.value || !lonInput.value) {
      const geocoded = await geocodeCityOnDemand(cityNameInput.value);
      if (!geocoded) {
        console.error("Submission blocked: Geocoding failed for map point.");
        showActionMessage(
          "Impossible de géocoder la ville. Veuillez vérifier le nom."
        );
        return; // Stop submission if geocoding failed
      }
    }
    // Always use the latest values from the hidden inputs after potential geocoding
    itemData.lat = latInput.value;
    itemData.lon = lonInput.value;
  }

  if (currentCategory !== "newTrip" && !tripData.id) {
    console.error("No trip selected. Cannot perform action.");
    showActionMessage(
      "Veuillez sélectionner ou créer un voyage d'abord pour effectuer cette action."
    );
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
      console.error(
        "[dynamicForm submit] Server response not OK:",
        response.status,
        errorData
      ); // Log detailed error
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log("[dynamicForm submit] Server response successful:", result); // Log successful result
    showActionMessage("Opération réussie !"); // Success message

    if (currentCategory === "newTrip") {
      window.location.href = `/dashboard?trip_id=${result.tripId}`;
    } else {
      await window.loadCurrentTripData(tripData.id); // Call through window object, pass tripData.id
    }
  } catch (error) {
    console.error("[dynamicForm submit] Error saving data:", error); // Log detailed error
    showActionMessage(`Erreur lors de la sauvegarde: ${error.message}`); // Error message
  } finally {
    hideFormModal();
  }
});

// Explicitly handle submit button click
submitFormBtn.addEventListener("click", () => {
  dynamicForm.requestSubmit(); // Programmatically trigger form submission
});

// Delegate event listeners for "Modifier" and "Supprimer" buttons
document.addEventListener("click", async (e) => {
  // Check if the clicked element or its parent is an "add" button
  const clickedAddButton = e.target.closest(
    "#addHotelBtn, #addTransportBtn, #addItineraryBtn, #addExpenseBtn, #addOverviewItineraryBtn, #openMapModal"
  );

  // If an "add" button was clicked AND no trip is selected, show message and return
  if (clickedAddButton && !tripData.id) {
    showActionMessage(
      "Veuillez sélectionner ou créer un voyage d'abord pour effectuer cette action."
    );
    return;
  }

  // Existing logic for edit and delete buttons
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
      showActionMessage("Élément non trouvé pour modification.");
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
      showActionMessage("Élément supprimé avec succès !"); // Success message
      await window.loadCurrentTripData(tripData.id); // Call through window object, pass tripData.id
    } catch (error) {
      console.error(`Error deleting document ${id} from ${category}:`, error);
      showActionMessage(`Erreur lors de la suppression: ${error.message}`); // Error message
    }
  }
});

// Add event listeners for "Add" buttons (now handled by delegated event listener above)
document.getElementById("addHotelBtn").addEventListener("click", () => {
  if (!tripData.id) {
    showActionMessage("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter un nouvel hôtel", "hotels");
});
document.getElementById("addTransportBtn").addEventListener("click", () => {
  if (!tripData.id) {
    showActionMessage("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter un nouveau transport", "transports");
});
document.getElementById("addItineraryBtn").addEventListener("click", () => {
  if (!tripData.id) {
    showActionMessage("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter une nouvelle étape", "mapPoints");
});
document.getElementById("addExpenseBtn").addEventListener("click", () => {
  if (!tripData.id) {
    showActionMessage("Veuillez sélectionner ou créer un voyage d'abord.");
    return;
  }
  showFormModal("Ajouter une nouvelle dépense", "expenses");
});
document
  .getElementById("addOverviewItineraryBtn")
  .addEventListener("click", () => {
    if (!tripData.id) {
      showActionMessage("Veuillez sélectionner ou créer un voyage d'abord.");
      return;
    }
    showFormModal("Ajouter une étape à l'itinéraire principal", "itinerary");
  });

// New Trip and Trip Selection Listeners
document.getElementById("createNewTripBtn").addEventListener("click", () => {
  showFormModal("Créer un nouveau voyage", "newTrip");
});

// New: Back to trip list button
backToTripListBtn.addEventListener("click", () => {
  tripData.clear(); // Clear current trip data
  showTripListView(); // Show the list of trips
  renderTripList(); // Re-render the list to ensure it's up-to-date
});

// Initial load logic when dashboard.html is loaded
document.addEventListener("DOMContentLoaded", async function () {
  setupTabs();
  setupWeatherNavigation();

  const rawTripDataAttribute = tripDetailView.dataset.currentTripData;
  console.log(
    "[DOMContentLoaded] Raw data-current-trip-data:",
    rawTripDataAttribute
  ); // Log raw attribute value

  let currentTripDataFromFlask = null;
  // Check if the attribute exists AND is not an empty string AND is not the string 'null'
  if (
    rawTripDataAttribute &&
    rawTripDataAttribute !== "" &&
    rawTripDataAttribute !== "null"
  ) {
    try {
      currentTripDataFromFlask = JSON.parse(rawTripDataAttribute);
      console.log(
        "[DOMContentLoaded] Parsed currentTripDataFromFlask:",
        currentTripDataFromFlask
      );
    } catch (e) {
      console.error(
        "[DOMContentLoaded] JSON parsing error for data-current-trip-data:",
        e
      );
      console.error(
        "[DOMContentLoaded] Malformed string was:",
        rawTripDataAttribute
      );
      // Optionally, show an error message to the user
      showActionMessage(
        "Erreur de chargement des données du voyage. Le format est incorrect."
      );
    }
  } else {
    console.log(
      "[DOMContentLoaded] No initial trip data from Flask (it was null or empty string)."
    );
  }

  const initialTripIdFromData = tripDetailView.dataset.currentTripId;

  if (
    initialTripIdFromData &&
    initialTripIdFromData !== "None" &&
    currentTripDataFromFlask
  ) {
    // A specific trip was passed from Flask, show its details
    tripData.id = initialTripIdFromData;
    Object.assign(tripData, currentTripDataFromFlask);
    console.log("Initial trip data loaded from Flask context:", tripData);

    document.querySelector("h1").textContent = `Mon Voyage : ${tripData.name}`;
    document.querySelector("header p").textContent = `Du ${
      tripData.startDate
    } au ${tripData.endDate} (${calculateDuration(
      tripData.startDate,
      tripData.endDate
    )} jours)`;

    renderAllSections();
    showTripDetailView(); // Show the detail view, which now also invalidates map size

    if (miniMap) {
      destroyLeafletMap(miniMap);
    }
    const initialLat =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lat : 41.9028;
    const initialLon =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lon : 12.4964;
    miniMap = initializeLeafletMap("leafletMap", initialLat, initialLon, 5);
    // No need for miniMap.invalidateSize() here, showTripDetailView handles it.
  } else {
    // No specific trip, show the list of all trips
    tripData.clear();
    renderAllSections(); // Clear any previous rendering
    showTripListView(); // Show the list view, which also disables interactivity
    await renderTripList(); // Populate the list
  }

  // Map modal event listeners
  document.getElementById("openMapModal").addEventListener("click", () => {
    if (!tripData.id) {
      showActionMessage("Veuillez sélectionner ou créer un voyage d'abord.");
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

// Explicitly define loadCurrentTripData on the window object
window.loadCurrentTripData = async function (tripId) {
  console.log(`[loadCurrentTripData] Attempting to load trip: ${tripId}`);
  if (!tripId) {
    console.warn("[loadCurrentTripData] No trip ID provided.");
    showActionMessage("Aucun voyage sélectionné.");
    return;
  }

  try {
    const response = await fetch(`/api/trips/${tripId}/all_data`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }
    const data = await response.json();

    // Update local tripData object
    Object.assign(tripData, data);
    console.log("[loadCurrentTripData] Trip data loaded from Flask:", tripData);

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

    renderAllSections();
    showTripDetailView(); // Show the detail view, which now also invalidates map size
    console.log("[loadCurrentTripData] showTripDetailView called.");

    // Re-initialize mini-map if it exists or create it
    if (miniMap) {
      destroyLeafletMap(miniMap);
    }
    const initialLat =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lat : 41.9028;
    const initialLon =
      tripData.mapPoints.length > 0 ? tripData.mapPoints[0].lon : 12.4964;
    miniMap = initializeLeafletMap("leafletMap", initialLat, initialLon, 5);
    // No need for miniMap.invalidateSize() here, showTripDetailView handles it.
  } catch (error) {
    console.error(
      "[loadCurrentTripData] Error loading trip data from Flask API:",
      error
    );
    tripData.clear();
    renderAllSections();
    showTripListView(); // Go back to list view on error
    document.getElementById("tripStatusMessage").textContent =
      "Erreur lors du chargement du voyage. Veuillez réessayer ou créer un nouveau voyage.";
  }
};

/**
 * Renders the list of all trips as cards.
 */
async function renderTripList() {
  console.log("[renderTripList] Starting to render trip list.");
  tripCardsContainer.innerHTML = ""; // Clear existing cards
  noTripsMessage.classList.add("hidden"); // Hide no trips message by default

  try {
    const response = await fetch("/api/user_trips_summary");
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }
    const trips = await response.json();
    console.log("[renderTripList] Fetched trips summary:", trips);

    if (trips.length > 0) {
      trips.forEach((trip) => {
        const card = document.createElement("div");
        card.classList.add(
          "bg-white",
          "p-6",
          "rounded-xl",
          "shadow-md",
          "border",
          "border-stone-200",
          "cursor-pointer",
          "hover:shadow-lg",
          "transition-shadow"
        );
        card.dataset.tripId = trip.id;
        card.innerHTML = `
                    <h3 class="text-xl font-bold text-stone-800 mb-2">${
                      trip.name
                    }</h3>
                    <p class="text-sm text-stone-600 mb-1">Du ${
                      trip.startDate
                    } au ${trip.endDate}</p>
                    <p class="text-sm text-stone-600 mb-1">Participants: N/A</p> <!-- Placeholder for participants -->
                    <p class="text-lg font-semibold text-blue-700 mt-2">Coût total: ${trip.totalCalculatedCost.toFixed(
                      0
                    )} €</p>
                    <p class="text-sm text-stone-500">Budget: ${trip.totalBudget.toFixed(
                      0
                    )} €</p>
                `;
        card.addEventListener("click", () => {
          console.log(`[renderTripList] Card clicked for trip ID: ${trip.id}`);
          window.loadCurrentTripData(trip.id);
        });
        tripCardsContainer.appendChild(card);
      });
      document.getElementById(
        "tripStatusMessage"
      ).textContent = `Sélectionnez un voyage ci-dessous ou créez-en un nouveau.`;
    } else {
      noTripsMessage.classList.remove("hidden");
      document.getElementById("tripStatusMessage").textContent =
        "Aucun voyage trouvé. Créez un nouveau voyage pour commencer.";
    }
  } catch (error) {
    console.error("[renderTripList] Error fetching trip list:", error);
    showActionMessage(
      `Erreur lors du chargement des voyages: ${error.message}`
    );
    noTripsMessage.classList.remove("hidden");
    document.getElementById("tripStatusMessage").textContent =
      "Erreur lors du chargement des voyages. Veuillez réessayer.";
  }
  console.log("[renderTripList] Finished rendering trip list.");
}

/**
 * Shows the trip list view and hides the trip detail view.
 */
function showTripListView() {
  console.log("Showing Trip List View");
  tripListView.classList.remove("hidden");
  tripDetailView.classList.add("hidden");
  document.getElementById(
    "tripStatusMessage"
  ).textContent = `Sélectionnez un voyage ci-dessous ou créez-en un nouveau.`;
  // Ensure all tabs are reset to inactive when returning to list view
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("nav-active");
    btn.classList.add("nav-inactive");
  });
  // Set the overview tab as active by default for the detail view
  document
    .querySelector(".tab-button[data-tab='overview']")
    .classList.add("nav-active");
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.add("hidden");
  });
  // Show the overview content
  document.getElementById("overview-content").classList.remove("hidden");

  toggleDashboardInteractivity(false); // Disable interaction on trip detail view elements
}

/**
 * Shows the trip detail view and hides the trip list view.
 */
function showTripDetailView() {
  console.log("Showing Trip Detail View");
  tripListView.classList.add("hidden");
  tripDetailView.classList.remove("hidden");
  // Enable interaction on trip detail view elements
  toggleDashboardInteractivity(true);

  // Invalidate map size after the container is visible
  if (miniMap) {
    miniMap.invalidateSize();
    console.log("miniMap invalidateSize called in showTripDetailView");
  }
}

/**
 * Toggles the interactivity of dashboard elements based on whether a trip is loaded.
 * This function now specifically targets elements within the tripDetailView.
 * @param {boolean} enable - True to enable, false to disable.
 */
function toggleDashboardInteractivity(enable) {
  // Only apply pointer-events and opacity to the tripDetailView content
  // The tripListView visibility is handled by showTripListView/showTripDetailView
  const elementsToToggle = tripDetailView.querySelectorAll(
    ".tab-button, #addHotelBtn, #addTransportBtn, #addItineraryBtn, #addExpenseBtn, #addOverviewItineraryBtn, #openMapModal, #backToTripListBtn"
  );

  if (enable) {
    tripDetailView.classList.remove("pointer-events-none", "opacity-50");
    elementsToToggle.forEach((el) => {
      el.classList.remove("pointer-events-none", "opacity-50");
      el.removeAttribute("disabled");
    });
  } else {
    tripDetailView.classList.add("pointer-events-none", "opacity-50");
    elementsToToggle.forEach((el) => {
      el.classList.add("pointer-events-none", "opacity-50");
      el.setAttribute("disabled", "true");
    });
  }
}

// --- Utility Functions (previously missing, now re-added) ---

/**
 * Sets up tab switching functionality.
 */
function setupTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons and hide all content
      document.querySelectorAll(".tab-button").forEach((btn) => {
        btn.classList.remove("nav-active");
        btn.classList.add("nav-inactive");
      });
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.add("hidden");
      });

      // Add active class to clicked button and show relevant content
      this.classList.remove("nav-inactive");
      this.classList.add("nav-active");
      const tabId = this.dataset.tab;
      document.getElementById(`${tabId}-content`).classList.remove("hidden");

      // Special handling for map tab to invalidate size when it becomes visible
      if (tabId === "overview" && miniMap) {
        setTimeout(() => miniMap.invalidateSize(), 100);
      }
    });
  });
}

/**
 * Sets up navigation for the weather carousel.
 */
function setupWeatherNavigation() {
  const weatherCarousel = document.getElementById("weather-carousel-container");
  const prevBtn = document.getElementById("weather-prev");
  const nextBtn = document.getElementById("weather-next");

  if (weatherCarousel && prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      weatherCarousel.scrollBy({
        left: -weatherCarousel.clientWidth / 2, // Scroll half the container width
        behavior: "smooth",
      });
    });

    nextBtn.addEventListener("click", () => {
      weatherCarousel.scrollBy({
        left: weatherCarousel.clientWidth / 2, // Scroll half the container width
        behavior: "smooth",
      });
    });
  }
}

/**
 * Initializes a Leaflet map.
 * @param {string} mapId - The ID of the map container.
 * @param {number} lat - Initial latitude.
 * @param {number} lon - Initial longitude.
 * @param {number} zoom - Initial zoom level.
 * @returns {L.Map} The Leaflet map instance.
 */
function initializeLeafletMap(mapId, lat, lon, zoom) {
  const mapElement = document.getElementById(mapId);
  if (!mapElement) {
    console.error(`Map element with ID '${mapId}' not found.`);
    return null;
  }

  // Check if a map instance already exists on this element
  if (mapElement._leaflet_id) {
    // If it exists, destroy it first
    const existingMap = L.map(mapId); // Get existing instance
    existingMap.remove(); // Remove it
    console.log(`Existing Leaflet map on '${mapId}' destroyed.`);
  }

  const leafletMap = L.map(mapId).setView([lat, lon], zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(leafletMap);

  return leafletMap;
}

/**
 * Destroys a Leaflet map instance.
 * @param {L.Map} mapInstance - The Leaflet map instance to destroy.
 */
function destroyLeafletMap(mapInstance) {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    console.log("Leaflet map instance destroyed.");
  }
}

/**
 * Renders all sections of the dashboard based on current tripData.
 */
function renderAllSections() {
  updateHeaderInfo();
  renderCostChart();
  renderWeatherCarousel();
  renderItineraryList();
  renderHotelsList();
  renderTransportsList();
  renderExpensesList();
  updateMap();
}

/**
 * Updates the header information (trip name, dates, duration).
 */
function updateHeaderInfo() {
  const h1 = document.querySelector("h1");
  const headerP = document.querySelector("header p");
  if (tripData.id) {
    h1.textContent = `Mon Voyage : ${tripData.name}`;
    headerP.textContent = `Du ${tripData.startDate} au ${
      tripData.endDate
    } (${calculateDuration(tripData.startDate, tripData.endDate)} jours)`;
  } else {
    h1.textContent = `Tableau de Bord de Voyage`;
    headerP.textContent = `Connectez-vous pour gérer vos voyages.`;
  }
}

/**
 * Renders or updates the cost distribution chart.
 */
function renderCostChart() {
  const ctx = document.getElementById("costChart").getContext("2d");
  const totalEstimatedCostSpan = document.getElementById("totalEstimatedCost");
  const chartCenterText = document.getElementById("costChartCenterText");

  if (!tripData.id) {
    if (costChartInstance) {
      costChartInstance.destroy();
      costChartInstance = null;
    }
    totalEstimatedCostSpan.textContent = "0.00 €";
    chartCenterText.innerHTML =
      '<div class="text-xl font-bold text-stone-900">0.00 €</div><div class="text-sm text-stone-500">Total</div>';
    return;
  }

  const categories = tripData.expenseCategories;
  const dataValues = categories.map((cat) => {
    let sum = 0;
    // Sum expenses by category
    tripData.expenses
      .filter((e) => e.category === cat)
      .forEach((e) => (sum += parseFloat(e.amount || 0)));
    // Add hotel/transport costs to relevant categories
    if (cat === "Hébergement") {
      tripData.hotels.forEach((h) => (sum += parseFloat(h.totalPrice || 0)));
    }
    if (cat === "Transport") {
      tripData.transports.forEach((t) => {
        if (t.type === "Voiture") {
          sum +=
            parseFloat(t.estimationCarburant || 0) +
            parseFloat(t.estimationPeage || 0);
        } else {
          sum += parseFloat(t.price || 0);
        }
      });
    }
    return sum;
  });

  const totalCost = dataValues.reduce((acc, val) => acc + val, 0);
  totalEstimatedCostSpan.textContent = `${totalCost.toFixed(2)} €`;
  chartCenterText.innerHTML = `<div class="text-xl font-bold text-stone-900">${totalCost.toFixed(
    2
  )} €</div><div class="text-sm text-stone-500">Total</div>`;

  const backgroundColors = [
    "#60A5FA", // Blue-400
    "#A78BFA", // Purple-400
    "#FACC15", // Yellow-400
    "#34D399", // Green-400
    "#FB923C", // Orange-400
    "#F87171", // Red-400
  ];
  const hoverBackgroundColors = [
    "#3B82F6", // Blue-500
    "#8B5CF6", // Purple-500
    "#F59E0B", // Yellow-500
    "#10B981", // Green-500
    "#EA580C", // Orange-500
    "#EF4444", // Red-500
  ];

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: dataValues,
        backgroundColor: backgroundColors,
        hoverBackgroundColor: hoverBackgroundColors,
        borderColor: "transparent",
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          font: {
            size: 14,
            family: "'Inter', sans-serif",
          },
          color: "#334155", // stone-700
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
              }).format(context.parsed);
            }
            return label;
          },
        },
      },
    },
  };

  if (costChartInstance) {
    costChartInstance.data = chartData;
    costChartInstance.options = chartOptions;
    costChartInstance.update();
  } else {
    costChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: chartData,
      options: chartOptions,
    });
  }
}

/**
 * Renders the weather carousel.
 */
function renderWeatherCarousel() {
  const container = document.getElementById("weather-carousel-container");
  container.innerHTML = ""; // Clear existing content

  if (!tripData.id || tripData.weather.length === 0) {
    container.innerHTML =
      '<p class="text-stone-500 text-center w-full">Prévisions météo non disponibles.</p>';
    return;
  }

  tripData.weather.forEach((day) => {
    const card = document.createElement("div");
    card.classList.add(
      "flex-none",
      "w-40",
      "p-4",
      "bg-stone-50",
      "rounded-lg",
      "shadow-sm",
      "text-center",
      "border",
      "border-stone-200"
    );
    card.innerHTML = `
            <p class="text-sm font-semibold text-stone-700 mb-1">${day.day}</p>
            <p class="text-3xl mb-2">${day.icon}</p>
            <p class="text-lg font-bold text-stone-800">${day.temp}</p>
            <p class="text-xs text-stone-600">${day.condition}</p>
        `;
    container.appendChild(card);
  });
}

/**
 * Renders the main itinerary list.
 */
function renderItineraryList() {
  const listContainer = document.getElementById("itinerary-list");
  listContainer.innerHTML = ""; // Clear existing content

  if (!tripData.id || tripData.itinerary.length === 0) {
    listContainer.innerHTML =
      '<li class="text-stone-500">Aucune étape d\'itinéraire planifiée.</li>';
    return;
  }

  // Sort itinerary by date
  const sortedItinerary = [...tripData.itinerary].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  sortedItinerary.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.classList.add(
      "flex",
      "items-start",
      "space-x-3",
      "p-2",
      "rounded-md",
      "hover:bg-stone-50"
    );
    listItem.innerHTML = `
            <div class="flex-shrink-0 text-stone-500">📅</div>
            <div class="flex-grow">
                <p class="font-medium text-stone-800">${formatDate(
                  item.date
                )}</p>
                <p class="text-stone-700 text-sm">${item.description}</p>
            </div>
            <div class="flex-shrink-0 flex space-x-2">
                <button class="edit-btn text-blue-500 hover:text-blue-700 text-sm" data-id="${
                  item.id
                }" data-category="itinerary">Modifier</button>
                <button class="delete-btn text-red-500 hover:text-red-700 text-sm" data-id="${
                  item.id
                }" data-category="itinerary">Supprimer</button>
            </div>
        `;
    listContainer.appendChild(listItem);
  });
}

/**
 * Renders the hotels list.
 */
function renderHotelsList() {
  const listContainer = document.getElementById("hotels-list");
  listContainer.innerHTML = ""; // Clear existing content

  if (!tripData.id || tripData.hotels.length === 0) {
    listContainer.innerHTML =
      '<p class="text-stone-500 text-center">Aucune réservation d\'hôtel ajoutée.</p>';
    return;
  }

  // Sort hotels by check-in date
  const sortedHotels = [...tripData.hotels].sort(
    (a, b) => new Date(a.checkInDate) - new Date(b.checkInDate)
  );

  sortedHotels.forEach((hotel) => {
    const card = document.createElement("div");
    card.classList.add(
      "bg-white",
      "p-6",
      "rounded-xl",
      "shadow-sm",
      "border",
      "border-stone-200"
    );
    card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-stone-800">${
                      hotel.name
                    } <span class="text-yellow-500">${"★".repeat(
      hotel.stars
    )}</span></h3>
                    <p class="text-sm text-stone-600">${hotel.address}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-btn text-blue-500 hover:text-blue-700 text-sm" data-id="${
                      hotel.id
                    }" data-category="hotels">Modifier</button>
                    <button class="delete-btn text-red-500 hover:text-red-700 text-sm" data-id="${
                      hotel.id
                    }" data-category="hotels">Supprimer</button>
                </div>
            </div>
            <p class="text-stone-700 mb-2">Du ${formatDate(
              hotel.checkInDate
            )} au ${formatDate(hotel.checkOutDate)}</p>
            <p class="text-stone-700 mb-2">Prix: ${parseFloat(
              hotel.totalPrice || 0
            ).toFixed(2)} € ( ${parseFloat(hotel.pricePerNight || 0).toFixed(
      2
    )} €/nuit)</p>
            ${
              hotel.info
                ? `<p class="text-stone-700 text-sm mb-2">Info: ${hotel.info}</p>`
                : ""
            }
            ${
              hotel.bookingUrl
                ? `<a href="${hotel.bookingUrl}" target="_blank" class="text-blue-600 hover:underline text-sm">Voir la réservation</a>`
                : ""
            }
        `;
    listContainer.appendChild(card);
  });
}

/**
 * Renders the transports list.
 */
function renderTransportsList() {
  const listContainer = document.getElementById("transports-list");
  listContainer.innerHTML = ""; // Clear existing content

  if (!tripData.id || tripData.transports.length === 0) {
    listContainer.innerHTML =
      '<p class="text-stone-500 text-center">Aucun transport ajouté.</p>';
    return;
  }

  // Sort transports by departure date
  const sortedTransports = [...tripData.transports].sort(
    (a, b) => new Date(a.dep) - new Date(b.dep)
  );

  sortedTransports.forEach((transport) => {
    const card = document.createElement("div");
    card.classList.add(
      "bg-white",
      "p-6",
      "rounded-xl",
      "shadow-sm",
      "border",
      "border-stone-200"
    );
    let details = "";
    let priceInfo = "";

    if (transport.type === "Avion" || transport.type === "Train") {
      details = `
                <p class="text-stone-700 mb-1">Compagnie: ${
                  transport.company || "N/A"
                }</p>
                <p class="text-stone-700 mb-1">Numéro: ${
                  transport.number || "N/A"
                }</p>
                <p class="text-stone-700 mb-1">Siège: ${
                  transport.seat || "N/A"
                }</p>
            `;
      priceInfo = `Prix: ${parseFloat(transport.price || 0).toFixed(2)} €`;
    } else if (transport.type === "Voiture") {
      details = `
                <p class="text-stone-700 mb-1">Estimation Carburant: ${parseFloat(
                  transport.estimationCarburant || 0
                ).toFixed(2)} €</p>
                <p class="text-stone-700 mb-1">Estimation Péage: ${parseFloat(
                  transport.estimationPeage || 0
                ).toFixed(2)} €</p>
            `;
      priceInfo = `Coût total estimé: ${parseFloat(
        transport.price || 0
      ).toFixed(2)} €`;
    }

    card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-stone-800">${
                      transport.type
                    }: ${transport.from} &rarr; ${transport.to}</h3>
                    <p class="text-sm text-stone-600">Départ: ${formatDate(
                      transport.dep
                    )} à ${formatTime(transport.dep)}</p>
                    <p class="text-sm text-stone-600">Arrivée: ${formatDate(
                      transport.arr
                    )} à ${formatTime(transport.arr)}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="edit-btn text-blue-500 hover:text-blue-700 text-sm" data-id="${
                      transport.id
                    }" data-category="transports">Modifier</button>
                    <button class="delete-btn text-red-500 hover:text-red-700 text-sm" data-id="${
                      transport.id
                    }" data-category="transports">Supprimer</button>
                </div>
            </div>
            ${details}
            <p class="text-lg font-semibold text-blue-700 mt-2">${priceInfo}</p>
        `;
    listContainer.appendChild(card);
  });
}

/**
 * Renders the expenses list.
 */
function renderExpensesList() {
  const tableBody = document.getElementById("expenses-table-body");
  const totalSpentSpan = document.getElementById("totalSpentExpenses");
  const totalBudgetSpan = document.getElementById("totalBudgetExpenses");
  tableBody.innerHTML = ""; // Clear existing content

  if (!tripData.id || tripData.expenses.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-stone-500">Aucune dépense enregistrée.</td></tr>';
    totalSpentSpan.textContent = "0.00 €";
    totalBudgetSpan.textContent = `${parseFloat(
      tripData.totalBudget || 0
    ).toFixed(2)} €`;
    return;
  }

  // Sort expenses by date
  const sortedExpenses = [...tripData.expenses].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let totalSpent = 0;
  sortedExpenses.forEach((expense) => {
    const amount = parseFloat(expense.amount || 0);
    totalSpent += amount;

    const row = document.createElement("tr");
    row.classList.add(
      "bg-white",
      "border-b",
      "border-stone-100",
      "hover:bg-stone-50"
    );
    row.innerHTML = `
            <td class="px-6 py-4 font-medium text-stone-900">${formatDate(
              expense.date
            )}</td>
            <td class="px-6 py-4">${expense.category}</td>
            <td class="px-6 py-4">${expense.desc}</td>
            <td class="px-6 py-4 text-right">${amount.toFixed(2)} €</td>
            <td class="px-6 py-4 text-right">
                <button class="edit-btn text-blue-500 hover:text-blue-700 text-sm mr-2" data-id="${
                  expense.id
                }" data-category="expenses">Modifier</button>
                <button class="delete-btn text-red-500 hover:text-red-700 text-sm" data-id="${
                  expense.id
                }" data-category="expenses">Supprimer</button>
            </td>
        `;
    tableBody.appendChild(row);
  });

  totalSpentSpan.textContent = `${totalSpent.toFixed(2)} €`;
  totalBudgetSpan.textContent = `${parseFloat(
    tripData.totalBudget || 0
  ).toFixed(2)} €`;
}

/**
 * Updates the Leaflet map with current trip map points and routes.
 */
function updateMap() {
  if (!miniMap) {
    console.warn("Mini map not initialized. Cannot update.");
    return;
  }

  // Clear existing layers (markers, polylines)
  miniMap.eachLayer(function (layer) {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
      miniMap.removeLayer(layer);
    }
  });

  if (!tripData.id || tripData.mapPoints.length === 0) {
    // If no trip or no map points, just show a default view or message
    miniMap.setView([43.7696, 11.2558], 6); // Default view (Florence)
    return;
  }

  const markers = [];
  tripData.mapPoints.forEach((point) => {
    if (point.lat && point.lon) {
      const marker = L.marker([point.lat, point.lon])
        .addTo(miniMap)
        .bindPopup(
          `${point.name}<br>Arrivée: ${formatDate(
            point.arrivalDate
          )}<br>Départ: ${formatDate(point.departureDate)}`
        );
      markers.push(marker);
    }
  });

  // Draw route if there are multiple map points
  if (tripData.mapPoints.length > 1) {
    const routeCoordinates = tripData.mapPoints
      .filter((p) => p.lat && p.lon)
      .map((p) => [p.lat, p.lon]);

    if (routeCoordinates.length > 1) {
      const polyline = L.polyline(routeCoordinates, {
        color: "#3B82F6",
        weight: 4,
        opacity: 0.7,
      }).addTo(miniMap);
      // Fit map bounds to the polyline
      miniMap.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  } else if (tripData.mapPoints.length === 1 && markers.length === 1) {
    // If only one point, set view to that point
    miniMap.setView([tripData.mapPoints[0].lat, tripData.mapPoints[0].lon], 10);
  }
}

/**
 * Calculates the duration between two dates in days.
 * @param {string} startDateStr - Start date string (YYYY-MM-DD).
 * @param {string} endDateStr - End date string (YYYY-MM-DD).
 * @returns {number} Number of days.
 */
function calculateDuration(startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (isNaN(startDate) || isNaN(endDate)) return 0;
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formats a date string to a more readable format (e.g., "DD/MM/YYYY").
 * @param {string} dateString - The date string (YYYY-MM-DD).
 * @returns {string} Formatted date string.
 */
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  try {
    return new Date(dateString).toLocaleDateString("fr-FR", options);
  } catch (e) {
    return dateString; // Return original if invalid
  }
}

/**
 * Formats a datetime string to a time string (e.g., "HH:MM").
 * @param {string} datetimeString - The datetime string (YYYY-MM-DDTHH:MM).
 * @returns {string} Formatted time string.
 */
function formatTime(datetimeString) {
  if (!datetimeString) return "N/A";
  const options = { hour: "2-digit", minute: "2-digit" };
  try {
    return new Date(datetimeString).toLocaleTimeString("fr-FR", options);
  } catch (e) {
    return datetimeString; // Return original if invalid
  }
}
