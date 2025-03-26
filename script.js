// Map initialization
const map = L.map('map').setView([20.27594, -74.66599], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// CO Layer Management
let coLayer = null;
let tokenRefreshInterval = null;

async function createCOLayer(date) {
    const token = await getAccessToken();
    return L.tileLayer.wms('https://sh.dataspace.copernicus.eu/wms', {
        layers: 'S5_CO_CDAS',
        styles: 'RASTER/CO_VISUALIZED',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        crs: L.CRS.EPSG3857,
        access_token: token,
        time: date,
        attribution: 'Copernicus Atmosphere Monitoring Service'
    });
}

async function updateCOLayer(date) {
    document.getElementById('loading').style.display = 'block';
    
    try {
        // Clear existing layer
        if (coLayer) {
            map.removeLayer(coLayer);
            coLayer = null;
        }

        // Create new layer
        coLayer = await createCOLayer(date);
        coLayer.addTo(map);

        // Set up token refresh
        if (!tokenRefreshInterval) {
            tokenRefreshInterval = setInterval(async () => {
                try {
                    const newToken = await getAccessToken();
                    coLayer.setParams({ access_token: newToken });
                } catch (error) {
                    console.error("Token refresh failed:", error);
                }
            }, 300000); // 5 minutes
        }

    } catch (error) {
        console.error("CO Layer Error:", error);
        alert(`Failed to load data: ${error.message}`);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Date picker
const datePicker = flatpickr("#datePicker", {
    dateFormat: "Y-m-d",
    defaultDate: "2024-01-15",
    maxDate: "today",
    onChange: (dates) => updateCOLayer(dates[0].toISOString().split('T')[0])
});

// Legend
const legend = L.control({position: 'bottomright'});
legend.onAdd = () => {
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

// Initial load
updateCOLayer(datePicker.input.value);

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
});
