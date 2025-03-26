// Initialize the map
const map = L.map('map').setView([38.40674, 117.69653], 7); // Default lat/lng/zoom from your URL

// Add a base map (e.g., OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Initialize Flatpickr (calendar)
flatpickr("#datePicker", {
  dateFormat: "Y-m-d",
  defaultDate: "2024-12-24", // Default date from your URL
  onChange: function(selectedDates) {
    const selectedDate = selectedDates[0].toISOString().split('T')[0];
    updateCopernicusLayer(selectedDate);
  }
});

// Function to update the Copernicus WMS layer
function updateCopernicusLayer(date) {
  if (window.copernicusLayer) map.removeLayer(window.copernicusLayer);
  
  // Use a proxy (replace "YOUR_PROXY_URL" with a free service like https://cors-anywhere.herokuapp.com/)
  const proxyUrl = "https://cors-anywhere.herokuapp.com/";
  const wmsUrl = `${proxyUrl}https://wms.dataspace.copernicus.eu/wms?request=GetMap&layers=S5_CO_CDAS&time=${date}&format=image/png&transparent=true`;
  
  window.copernicusLayer = L.tileLayer(wmsUrl).addTo(map);
}

  // Add new layer with selected date
  window.copernicusLayer = L.tileLayer.wms('https://wms.dataspace.copernicus.eu/wms', {
    layers: 'S5_CO_CDAS', // Dataset ID from your URL
    format: 'image/png',
    transparent: true,
    time: date, // Dynamic date
