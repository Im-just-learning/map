// script.js
const CLIENT_ID = "sh-3e397c85-30e1-4067-9bec-975aa62d574a";
const CLIENT_SECRET = "oEGik5bM249xxsAowSiSvwmK43qdqsBQ";
const CORS_PROXY = "https://corsproxy.io/?"; // Reliable proxy service

const LAYERS = {
  CO: {
    wmsLayer: 'S5P_L2__CO_____',
    style: 'RASTER/CO_VISUALIZED',
    colorscalerange: '0,0.12',
    unit: 'mol/m²',
    legend: [
      { color: '#2b08a8', label: '0.00-0.02' },
      { color: '#f00008', label: '>0.12' }
    ]
  },
  NO2: {
    wmsLayer: 'S5P_L2__NO2____',
    style: 'RASTER/NO2_VISUALIZED',
    colorscalerange: '0,0.0002',
    unit: 'mol/m²',
    legend: [
      { color: '#2b08a8', label: '0-0.00002' },
      { color: '#f00008', label: '>0.0002' }
    ]
  }
};

let map, currentLayer;

async function getToken() {
  try {
    const response = await fetch(`${CORS_PROXY}https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'openid wms'
      })
    });
    return (await response.json()).access_token;
  } catch (error) {
    console.error('Auth Error:', error);
    throw new Error('Failed to authenticate. Check network connection and credentials.');
  }
}

async function loadLayer() {
  try {
    const layerType = document.getElementById('layerSelector').value;
    const date = new Date(document.getElementById('dateInput').value);
    const config = LAYERS[layerType];
    
    if (currentLayer) map.removeLayer(currentLayer);

    const token = await getToken();
    const isoDate = date.toISOString().split('T')[0];
    
    const wmsUrl = `${CORS_PROXY}https://sh.dataspace.copernicus.eu/wms?` +
      `SERVICE=WMS&` +
      `REQUEST=GetMap&` +
      `LAYERS=${config.wmsLayer}&` +
      `STYLES=${config.style}&` +
      `FORMAT=image/png&` +
      `TRANSPARENT=true&` +
      `TIME=${isoDate}T00:00:00Z/${isoDate}T23:59:59Z&` +
      `WIDTH=1024&` +
      `HEIGHT=1024&` +
      `CRS=EPSG:3857&` +
      `BBOX=-20037508.34,-20037508.34,20037508.34,20037508.34&` +
      `ACCESS_TOKEN=${token}&` +
      `COLORSCALERANGE=${config.colorscalerange}`;

    currentLayer = L.imageOverlay(wmsUrl, [[-85.06, -180], [85.06, 180]], {
      opacity: 0.85
    }).addTo(map);

    updateLegend(layerType);
    
  } catch (error) {
    alert(error.message);
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  
  // Event listeners
  document.getElementById('layerSelector').addEventListener('change', loadLayer);
  document.getElementById('dateInput').addEventListener('change', loadLayer);

  // Initial load
  await loadLayer();
});
