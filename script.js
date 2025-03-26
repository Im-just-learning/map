// Initialize map with Copernicus' default view
const map = L.map('map').setView([20.27594, -74.66599], 4);

// Add base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// 1. Configure Copernicus WMS Layer (CO Visualization)
const copernicusCOLayer = L.tileLayer.wms('https://wms.dataspace.copernicus.eu/wms', {
    layers: 'S5_CO_CDAS',
    styles: 'RASTER/CO_VISUALIZED',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    attribution: 'Copernicus Atmosphere Monitoring Service'
});

// 2. Set up date picker with enhanced options
const datePicker = flatpickr("#datePicker", {
    dateFormat: "Y-m-d",
    defaultDate: "2024-01-15",
    maxDate: "today", // Restrict to past dates
    onChange: function(selectedDates) {
        const date = selectedDates[0].toISOString().split('T')[0];
        updateCOLayer(date);
    }
});

// 3. Update WMS layer with new date
function updateCOLayer(date) {
    // Show loading state
    document.getElementById('loading').style.display = 'block';
    
    copernicusCOLayer.setParams({
        time: date,
        // Optional: Add cloud coverage filter (0-30%)
        // cql_filter: "cloudCover<=30" 
    });
    
    // Add layer if not already on map
    if (!map.hasLayer(copernicusCOLayer)) {
        copernicusCOLayer.addTo(map);
    }
    
    // Hide loading after short delay (better UX)
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 500);
}

// 4. Add professional legend (matches Copernicus exactly)
const legend = L.control({position: 'bottomright'});
legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <h4>CO Column (mol/m²)</h4>
        <div><i style="background:#2b08a8"></i> 0.00-0.02</div>
        <div><i style="background:#1b4df0"></i> 0.02-0.04</div>
        <div><i style="background:#00a8f0"></i> 0.04-0.06</div>
        <div><i style="background:#00f0a8"></i> 0.06-0.08</div>
        <div><i style="background:#a8f000"></i> 0.08-0.10</div>
        <div><i style="background:#f0a800"></i> 0.10-0.12</div>
        <div><i style="background:#f00008"></i> >0.12</div>
        <div style="margin-top:5px;font-size:0.8em">Data: Sentinel-5P</div>
    `;
    return div;
};
legend.addTo(map);

// 5. Initial load
updateCOLayer(datePicker.input.value);

// 6. Error handling for WMS
copernicusCOLayer.on('load', function() {
    document.getElementById('loading').style.display = 'none';
});

copernicusCOLayer.on('loading', function() {
    document.getElementById('loading').style.display = 'block';
});

copernicusCOLayer.on('tileerror', function() {
    alert('Failed to load CO data. The server may be unavailable or your access token expired.');
});
