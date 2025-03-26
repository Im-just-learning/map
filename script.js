// 1. Initialize Map with EPSG:3857 Projection
const map = L.map('map', {
  crs: L.CRS.EPSG3857,
  preferCanvas: true
}).setView([20, 0], 3);

// 2. Base Map Configuration
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap | CO Data: Sentinel-5P'
}).addTo(map);

// 3. WMS Tile Configuration
L.TileLayer.WMS.mergeOptions({
  detectRetina: true,
  updateWhenIdle: true,
  maxZoom: 9,
  tileSize: 512,
  opacity: 0.8
});

// 4. Authentication Management
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  
  try {
    const response = await fetch(COPERNICUS_AUTH.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: COPERNICUS_AUTH.clientId,
        client_secret: COPERNICUS_AUTH.clientSecret,
        grant_type: 'client_credentials',
        scope: 'openid wms resto' // Required scopes
      })
    });

    if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
    
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000; // 30s buffer
    return accessToken;
    
  } catch (error) {
    console.error("Authentication Error:", error);
    throw error;
  }
}

// 5. CO Product Fetching
async function fetchCOProducts(date) {
  document.getElementById('loading').style.display = 'block';
  
  try {
    // Validate the date parameter
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("Invalid date provided");
    }
    
    const formattedDate = date.toISOString().split('T')[0];
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://catalogue.dataspace.copernicus.eu/resto/api/collections/Sentinel5P/search.json?` +
      `productType=${PRODUCT_ID}&` +
      `startDate=${formattedDate}T00:00:00Z&` +
      `endDate=${formattedDate}T23:59:59Z&` +
      `processingLevel=Level2&` +
      `processingMode=Offline&` +
      `cloudCover=[0,30]&` +
      `maxRecords=5`, {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error("No CO data available for this date");
    }
    
    // Filter valid products according to S5P specs
    return data.features.filter(product => 
      product.properties.organisationName === 'S5P' &&
      product.properties.productType === PRODUCT_ID &&
      product.properties.processingLevel === 'L2'
    );
    
  } catch (error) {
    console.error("Fetch Error:", error);
    alert(`CO data loading failed: ${error.message}`);
    return [];
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// 6. CO Layer Display
async function displayCOProduct(product) {
  if (!product) return;
  
  try {
    // Remove existing layer
    if (coLayer) {
      map.removeLayer(coLayer);
      coLayer = null;
    }
    
    const token = await getAccessToken();
    const acquisitionTime = getAcquisitionTime(product);
    
    // Create WMS layer with official parameters
    coLayer = L.tileLayer.wms('https://sh.dataspace.copernicus.eu/wms', {
      layers: 'S5_CO_CDAS',
      styles: 'RASTER/CO_VISUALIZED',
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      env: 'color-scalerange:0:0.12;opacity:0.8',
      time: acquisitionTime,
      width: 1024,
      height: 1024,
      srs: 'EPSG:3857',
      bbox: '{bbox-epsg-3857}',
      access_token: token,
      colorscalerange: '0,0.12',
      logscale: 'false',
      abovemaxcolor: 'extend',
      belowmincolor: 'extend'
    }).addTo(map);
    
    // Set up auto-refresh
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
    
    // Update UI
    updateAcquisitionTime(product.properties.startDate);
    fitToProductBounds(product);
    
  } catch (error) {
    console.error("Display Error:", error);
  }
}

// 7. Helper Functions
function getAcquisitionTime(product) {
  // Calculate mid-point of acquisition window
  const start = new Date(product.properties.startDate);
  const end = new Date(product.properties.completionDate);
  const midTime = new Date((start.getTime() + end.getTime()) / 2);
  return midTime.toISOString().split('.')[0] + 'Z';
}

function fitToProductBounds(product) {
  if (product.properties.bbox) {
    const [minX, minY, maxX, maxY] = product.properties.bbox;
    map.fitBounds([[minY, minX], [maxY, maxX]], {
      padding: [50, 50],
      maxZoom: 8
    });
  }
}

function updateAcquisitionTime(time) {
  const timeElement = document.getElementById('acquisition-time');
  if (timeElement) {
    const date = new Date(time);
    timeElement.textContent = date.toUTCString();
  }
}

// 8. Legend Control
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
legend.addTo(map);

// 9. Date Picker Configuration
const datePicker = flatpickr("#datePicker", {
  dateFormat: "Y-m-d",
  defaultDate: new Date(Date.now() - 86400000 * 3), // Default to 3 days ago
  maxDate: new Date(),
  onChange: async (dates) => {
    const products = await fetchCOProducts(dates[0]);
    if (products.length > 0) {
      await displayCOProduct(products[0]);
    }
  }
});

// 10. Initial Load
(async () => {
  try {
    const products = await fetchCOProducts(datePicker.input.value);
    if (products.length > 0) {
      await displayCOProduct(products[0]);
    }
  } catch (error) {
    console.error("Initialization error:", error);
  }
})();

// Cleanup
window.addEventListener('beforeunload', () => {
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
});
