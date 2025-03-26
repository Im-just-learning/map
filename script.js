// Configuration
const CLIENT_ID = "sh-3e397c85-30e1-4067-9bec-975aa62d574a";
const CLIENT_SECRET = "oEGik5bM249xxsAowSiSvwmK43qdqsBQ";
let map, wmsSource;

// Initialize map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// Get access token with WMS scope
async function getToken() {
    try {
        const response = await fetch(
            'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'client_credentials',
                    scope: 'openid wms'
                })
            }
        );
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
}

// Load CO layer with proper WMS parameters
async function loadCOLayer(date) {
    try {
        document.getElementById('loading').style.display = 'block';
        
        // Clear existing layer
        if (wmsSource) map.removeLayer(wmsSource);

        // Get fresh token
        const token = await getToken();
        
        // Configure WMS source
        wmsSource = L.WMS.source("https://sh.dataspace.copernicus.eu/wms", {
            access_token: token,
            transparent: true,
            format: 'image/png',
            version: '1.3.0',
            styles: 'RASTER/CO_VISUALIZED',
            time: `${date}T00:00:00Z/${date}T23:59:59Z`,
            colorscalerange: '0,0.12'
        });

        // Add CO layer
        const coLayer = wmsSource.getLayer("S5P_L2__CO_____");
        coLayer.addTo(map);

    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Layer load error:', error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    
    document.getElementById('dateInput').addEventListener('change', (e) => {
        loadCOLayer(e.target.value);
    });

    // Initial load with verified date
    await loadCOLayer('2023-06-15');
});
