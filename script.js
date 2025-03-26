const CLIENT_ID = "sh-3e397c85-30e1-4067-9bec-975aa62d574a";
const CLIENT_SECRET = "oEGik5bM249xxsAowSiSvwmK43qdqsBQ";

// Layer configurations
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

let map, currentLayer, accessToken;

function initMap() {
  map = L.map('map').setView([38.40674, 117.69653], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

async function getToken() {
  const response = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
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
}

function updateLegend(layerType) {
  const config = LAYERS[layerType];
  document.getElementById('legendTitle').textContent = 
    `${layerType} Column (${config.unit})`;
  
  const legendContainer = document.getElementById('legendColors');
  legendContainer.innerHTML = config.legend
    .map(item => `
      <div>
        <span class="legend-color" style="background:${item.color}"></span>
        ${item.label}
      </div>
    `).join('');
}

async function loadLayer() {
  try {
    document.getElementById('loading').style.display = 'block';
    
    // Get current selections
    const layerType = document.getElementById('layerSelector').value;
    const date = new Date(document.getElementById('dateInput').value);
    const config = LAYERS[layerType];

    // Clear existing layer
    if (currentLayer) map.removeLayer(currentLayer);

    // Get fresh token
    accessToken = await getToken();

    // Build WMS URL
    const isoDate = date.toISOString().split('T')[0];
    const wmsUrl = `https://sh.dataspace.copernicus.eu/wms?` +
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
      `ACCESS_TOKEN=${accessToken}&` +
      `COLORSCALERANGE=${config.colorscalerange}`;

    // Add new layer
    currentLayer = L.imageOverlay(wmsUrl, [[-85.06, -180], [85.06, 180]], {
      opacity: 0.85
    }).addTo(map);

    updateLegend(layerType);

  } catch (error) {
    alert(`Error: ${error.message}`);
    console.error(error);
  } finally {
    document.getElementById('loading').style.display = 'none';
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
