// Initialize map with Copernicus' default view
const map = L.map('map').setView([20.27594, -74.66599], 4);

// Add base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// 1. MODIFIED: WMS Layer with token support
let copernicusCOLayer = null;

async function createCOLayer(date) {
    const token = await getAccessToken();
    return L.tileLayer.wms('https://wms.dataspace.copernicus.eu/wms', {
        layers: 'S5_CO_CDAS',
        styles: 'RASTER/CO_VISUALIZED',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        access_token: token,  // Add token here
        time: date
    });
}

// 2. UPDATED: Date picker with async handler
const datePicker = flatpickr("#datePicker", {
    dateFormat: "Y-m-d",
    defaultDate: "2024-01-15",
    maxDate: "today",
    onChange: async function(selectedDates) {
        const date = selectedDates[0].toISOString().split('T')[0];
        await updateCOLayer(date);
    }
});

// 3. MODIFIED: Update function with token handling
async function updateCOLayer(date) {
    document.getElementById('loading').style.display = 'block';
    
    try {
        // Remove old layer if exists
        if (copernicusCOLayer) {
            map.removeLayer(copernicusCOLayer);
        }
        
        // Create new layer with fresh token
        copernicusCOLayer = await createCOLayer(date);
        copernicusCOLayer.addTo(map);
        
        // Set up auto-refresh (every 5 minutes)
        if (!window.tokenRefreshInterval) {
            window.tokenRefreshInterval = setInterval(async () => {
                const newToken = await getAccessToken();
                copernicusCOLayer.setParams({ access_token: newToken });
            }, 300000); // 5 minutes
        }
        
        // Error handling for the new layer
        copernicusCOLayer.on('tileerror', function() {
            alert('Failed to load CO data tiles. Token may have expired.');
        });
        
    } catch (error) {
        console.error("CO Layer Error:", error);
        alert("Failed to load CO data: " + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// 4. Legend (unchanged)
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

// 5. MODIFIED: Initial load with async wrapper
(async function init() {
    try {
        await updateCOLayer(datePicker.input.value);
    } catch (error) {
        console.error("Initialization failed:", error);
    }
})();
