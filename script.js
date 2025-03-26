// Initialize map
const map = L.map('map').setView([38.4, 117.7], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Date picker
flatpickr("#datePicker", {
  dateFormat: "Y-m-d",
  defaultDate: "2024-12-24",
  onChange: fetchCOData
});

// Fetch CO data from Copernicus API
async function fetchCOData(selectedDates) {
  const date = selectedDates[0].toISOString().split('T')[0];
  
  try {
    const response = await fetch(
      `https://catalogue.dataspace.copernicus.eu/resto/api/collections/S5P/search.json?&productType=L2__CO____&startDate=${date}&endDate=${date}&maxRecords=10`
    );
    const data = await response.json();
    
    displayCOData(data.features);
  } catch (error) {
    console.error("Error fetching CO data:", error);
    alert("Failed to load CO data. Check console for details.");
  }
}

// Display CO data on map
function displayCOData(features) {
  // Clear previous markers
  if (window.coMarkers) {
    window.coMarkers.forEach(marker => map.removeLayer(marker));
  }
  
  window.coMarkers = [];
  
  features.forEach(feature => {
    const coValue = feature.properties.co; // Adjust based on actual API response
    const marker = L.circleMarker(
      [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
      {
        radius: 10,
        color: getCOColor(coValue),
        fillOpacity: 0.8
      }
    ).bindPopup(`CO: ${coValue} ppm`).addTo(map);
    
    window.coMarkers.push(marker);
  });
}

// Color coding based on CO levels
function getCOColor(value) {
  return value > 0.5 ? '#ff0000' : 
         value > 0.2 ? '#ff8000' : '#ffff00';
}
