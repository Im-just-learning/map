// Configuration
const CLIENT_ID = "sh-3e397c85-30e1-4067-9bec-975aa62d574a";
const CLIENT_SECRET = "oEGik5bM249xxsAowSiSvwmK43qdqsBQ";
let map, coLayer, accessToken;

// Initialize map
function initMap() {
  map = L.map('map').setView([38.40674, 117.69653], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// Get OAuth token with WMS scope
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

// Load CO layer
async function loadCOLayer(date) {
  try {
    document.getElementById('loading').style.display = 'block';
    
    // Refresh token if needed
    accessToken = await getToken();
    
    // Clear existing layer
    if (coLayer) map.removeLayer(coLayer);

    // Build WMS URL
    const isoDate = date.toISOString().split('T')[0];
    const wmsUrl = `https://sh.dataspace.copernicus.eu/wms?` +
      `SERVICE=WMS&` +
      `REQUEST=GetMap&` +
      `LAYERS=S5P_L2__CO_____&` +
      `STYLES=RASTER/CO_VISUALIZED&` +
      `FORMAT=image/png&` +
      `TRANSPARENT=true&` +
      `TIME=${isoDate}T00:00:00Z/${isoDate}T23:59:59Z&` +
      `WIDTH=1024&` +
      `HEIGHT=1024&` +
      `CRS=EPSG:3857&` +
      `BBOX=-20037508.34,-20037508.34,20037508.34,20037508.34&` +
      `ACCESS_TOKEN=${accessToken}&` +
      `COLORSCALERANGE=0,0.12`;

    // Add layer
    coLayer = L.imageOverlay(wmsUrl, [[-85.06, -180], [85.06, 180]], {
      opacity: 0.85
    }).addTo(map);

  } catch (error) {
    alert(`Error: ${error.message}`);
    console.error(error);
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  
  document.getElementById('dateInput').addEventListener('change', (e) => {
    loadCOLayer(new Date(e.target.value));
  });

  // Initial load
  await loadCOLayer(new Date('2023-06-15'));
});
