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
    updateCopernicusLayer(date);
  }
});

// Load Copernicus layer (with CORS proxy)
function updateCopernicusLayer(date) {
  if (window.copernicusLayer) map.removeLayer(window.copernicusLayer);
  
  const proxyUrl = "https://cors-anywhere.herokuapp.com/";
  const wmsUrl = `${proxyUrl}https://wms.dataspace.copernicus.eu/wms?request=GetMap&layers=S5_CO_CDAS&time=${date}&format=image/png&transparent=true`;
  
  window.copernicusLayer = L.tileLayer(wmsUrl, {
    attribution: 'Copernicus'
  }).addTo(map);
}

// Load default layer
updateCopernicusLayer("2024-12-24");
