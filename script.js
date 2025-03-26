// 1. Configuration Constants
const CONFIG = {
  map: {
    crs: L.CRS.EPSG3857,
    center: [20, 0],
    zoom: 3,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  },
  copernicus: {
    authUrl: 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    catalogUrl: 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products',
    wmsUrl: 'https://sh.dataspace.copernicus.eu/wms',
    clientId: "sh-3e397c85-30e1-4067-9bec-975aa62d574a",
    clientSecret: "oEGik5bM249xxsAowSiSvwmK43qdqsBQ",
    productId: 'L2__CO____'
  },
  visualization: {
    layerName: 'S5_CO_CDAS',
    style: 'RASTER/CO_VISUALIZED',
    colorRange: '0,0.12',
    opacity: 0.8
  }
};

// 2. Application State
const state = {
  map: null,
  coLayer: null,
  tokenRefreshInterval: null,
  accessToken: null,
  tokenExpiry: null
};

// 3. Initialize Application
function init() {
  setupMap();
  setupLegend();
  setupDatePicker();
  loadInitialData();
}

// 4. Map Setup
function setupMap() {
  state.map = L.map('map', {
    crs: CONFIG.map.crs,
    preferCanvas: true
  }).setView(CONFIG.map.center, CONFIG.map.zoom);

  L.tileLayer(CONFIG.map.tileLayer, {
    attribution: '© OpenStreetMap | CO Data: Sentinel-5P'
  }).addTo(state.map);
}

// 5. Authentication Management
async function getAccessToken() {
  if (state.accessToken && Date.now() < state.tokenExpiry) {
    return state.accessToken;
  }

  try {
    const response = await fetch(CONFIG.copernicus.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CONFIG.copernicus.clientId,
        client_secret: CONFIG.copernicus.clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
    
    const data = await response.json();
    state.accessToken = data.access_token;
    state.tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000; // 30s buffer
    return state.accessToken;
    
  } catch (error) {
    console.error("Authentication Error:", error);
    throw error;
  }
}

// 6. CO Product Fetching (Updated for OData API)
async function fetchCOProducts(date) {
  document.getElementById('loading').style.display = 'block';
  
  try {
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("Invalid date provided");
    }
    
    const formattedDate = date.toISOString().split('T')[0];
    const token = await getAccessToken();
    
    const query = new URLSearchParams({
      '$filter': `Collection/Name eq 'Sentinel5P' and ` +
                 `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq '${CONFIG.copernicus.productId}') and ` +
                 `ContentDate/Start ge ${formattedDate}T00:00:00Z and ` +
                 `ContentDate/End le ${formattedDate}T23:59:59Z`,
      '$top': '5'
    });
    
    const response = await fetch(`${CONFIG.copernicus.catalogUrl}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.value || data.value.length === 0) {
      throw new Error("No CO data available for this date");
    }
    
    return data.value.map(product => ({
      id: product.Id,
      name: product.Name,
      startDate: product.ContentDate.Start,
      endDate: product.ContentDate.End,
      footprint: product.GeoFootprint
    }));
    
  } catch (error) {
    console.error("Fetch Error:", error);
    alert(`CO data loading failed: ${error.message}`);
    return [];
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// 7. CO Layer Display
async function displayCOProduct(product) {
  if (!product) return;
  
  try {
    // Remove existing layer
    if (state.coLayer) {
      state.map.removeLayer(state.coLayer);
      state.coLayer = null;
    }
    
    const token = await getAccessToken();
    const acquisitionTime = getAcquisitionTime(product);
    
    // Create WMS layer
    state.coLayer = L.tileLayer.wms(CONFIG.copernicus.wmsUrl, {
      layers: CONFIG.visualization.layerName,
      styles: CONFIG.visualization.style,
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      time: acquisitionTime,
      width: 1024,
      height: 1024,
      srs: 'EPSG:3857',
      bbox: '{bbox-epsg-3857}',
      access_token: token,
      colorscalerange: CONFIG.visualization.colorRange,
      opacity: CONFIG.visualization.opacity
    }).addTo(state.map);
    
    // Set up token refresh
    setupTokenRefresh();
    
    // Update UI
    updateAcquisitionTime(product.startDate);
    fitToProductBounds(product);
    
  } catch (error) {
    console.error("Display Error:", error);
    alert("Failed to display CO layer");
  }
}

function setupTokenRefresh() {
  if (state.tokenRefreshInterval) return;
  
  state.tokenRefreshInterval = setInterval(async () => {
    try {
      const newToken = await getAccessToken();
      if (state.coLayer) {
        state.coLayer.setParams({ access_token: newToken });
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  }, 300000); // 5 minutes
}

// 8. Helper Functions
function getAcquisitionTime(product) {
  const start = new Date(product.startDate);
  const end = new Date(product.endDate);
  const midTime = new Date((start.getTime() + end.getTime()) / 2);
  return midTime.toISOString().split('.')[0] + 'Z';
}

function fitToProductBounds(product) {
  if (product.footprint?.coordinates) {
    const coords = product.footprint.coordinates[0];
    const latLngs = coords.map(coord => L.latLng(coord[1], coord[0]));
    state.map.fitBounds(L.latLngBounds(latLngs), {
      padding: [50, 50],
      maxZoom: 8
    });
  }
}

function updateAcquisitionTime(time) {
  const timeElement = document.getElementById('acquisition-time');
  if (timeElement) {
    timeElement.textContent = new Date(time).toUTCString();
  }
}

// 9. Legend Control
function setupLegend() {
  const legend = L.control({ position: 'bottomright' });
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
      <div style="margin-top:10px;font-size:0.8em">
        <span style="color:#666">Acquisition: </span>
        <span id="acquisition-time"></span>
      </div>
    `;
    return div;
  };
  legend.addTo(state.map);
}

// 10. Date Picker Setup
function setupDatePicker() {
  flatpickr("#datePicker", {
    dateFormat: "Y-m-d",
    defaultDate: new Date(Date.now() - 86400000 * 3), // 3 days ago
    maxDate: new Date(),
    onChange: async (dates) => {
      const products = await fetchCOProducts(dates[0]);
      if (products.length > 0) {
        await displayCOProduct(products[0]);
      }
    }
  });
}

// 11. Initial Data Load
async function loadInitialData() {
  try {
    const defaultDate = document.getElementById('datePicker').value;
    const products = await fetchCOProducts(new Date(defaultDate));
    if (products.length > 0) {
      await displayCOProduct(products[0]);
    }
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// 12. Cleanup
window.addEventListener('beforeunload', () => {
  if (state.tokenRefreshInterval) {
    clearInterval(state.tokenRefreshInterval);
  }
});

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
