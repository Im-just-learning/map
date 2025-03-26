// Initialize map
const map = L.map('map').setView([38.40674, 117.69653], 5);

// Add base layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Date picker
flatpickr("#datePicker", {
  dateFormat: "Y-m-d",
  defaultDate: "2024-12-24",
  onChange: (selectedDates) => {
    const date = selectedDates[0].toISOString().split('T')[0];
    updateCOLayer(date); // Load CO data for the selected date
  }
});

// Function to load Copernicus CO layer
function updateCOLayer(date) {
  if (window.coLayer) map.removeLayer(window.coLayer);

  // Use a proxy to bypass CORS (replace with your own if needed)
  const proxyUrl = "https://cors-anywhere.herokuapp.com/";
  const wmsUrl = `${proxyUrl}https://wms.dataspace.copernicus.eu/wms`;

  window.coLayer = L.tileLayer.wms(wmsUrl, {
    layers: 'S5_CO_CDAS',       // Copernicus CO dataset
    styles: 'RASTER/CO_VISUALIZED', // Style for CO visualization
    format: 'image/png',
    transparent: true,
    time: date,                 // Dynamic date
    attribution: 'Copernicus CO Data'
  }).addTo(map);
}

// Load default CO layer
updateCOLayer("2024-12-24");
