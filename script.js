// ======================
// 1. CONFIGURATION
// ======================
const CONFIG = {
  // API Endpoints
  CATALOG_URL: 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products',
  WMS_URL: 'https://sh.dataspace.copernicus.eu/wms',
  
  // Product Type (Sentinel-5P CO)
  PRODUCT_ID: 'L2__CO____',
  
  // Visualization
  WMS_LAYER: 'S5P_L2__CO_____',
  WMS_STYLE: 'DEFAULT',
  COLOR_RANGE: '0,0.12',
  OPACITY: 0.8
};

// ======================
// 2. MAIN FUNCTIONS
// ======================

/**
 * Fetch CO products for a specific date
 */
async function fetchCOProducts(date) {
  try {
    // Validate date
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("Invalid date provided");
    }
    
    const formattedDate = date.toISOString().split('T')[0];
    const token = await getAccessToken(); // Use your existing token function
    
    // Build OData query
    const query = new URLSearchParams({
      '$filter': `Collection/Name eq 'Sentinel5P' and ` +
                 `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq '${CONFIG.PRODUCT_ID}') and ` +
                 `ContentDate/Start ge ${formattedDate}T00:00:00Z and ` +
                 `ContentDate/End le ${formattedDate}T23:59:59Z`,
      '$top': '5'
    });
    
    const response = await fetch(`${CONFIG.CATALOG_URL}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.value || data.value.length === 0) {
      throw new Error("No CO data available for this date");
    }
    
    // Return simplified product information
    return data.value.map(product => ({
      id: product.Id,
      name: product.Name,
      startDate: product.ContentDate.Start,
      endDate: product.ContentDate.End,
      footprint: product.GeoFootprint
    }));
    
  } catch (error) {
    console.error("CO Data Fetch Error:", error);
    throw error; // Rethrow for handling in UI
  }
}

/**
 * Add CO layer to map
 */
async function displayCOLayer(product) {
  try {
    // Remove existing layer if any
    if (window.coLayer) {
      window.map.removeLayer(window.coLayer);
    }
    
    const token = await getAccessToken();
    const time = new Date(product.startDate).toISOString();
    
    // Create WMS layer
    window.coLayer = L.tileLayer.wms(CONFIG.WMS_URL, {
      layers: CONFIG.WMS_LAYER,
      styles: CONFIG.WMS_STYLE,
      format: 'image/png',
      transparent: true,
      time: time,
      width: 1024,
      height: 1024,
      srs: 'EPSG:3857',
      access_token: token,
      colorscalerange: CONFIG.COLOR_RANGE,
      opacity: CONFIG.OPACITY
    }).addTo(window.map);
    
    // Fit to bounds if footprint available
    if (product.footprint?.coordinates) {
      const coords = product.footprint.coordinates[0];
      const bounds = coords.map(coord => [coord[1], coord[0]]);
      window.map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    return true;
    
  } catch (error) {
    console.error("Layer Display Error:", error);
    throw error;
  }
}

// ======================
// 3. INTEGRATION WITH YOUR EXISTING CODE
// ======================

/**
 * Initialize map (keep your existing setup)
 */
function initMap() {
  window.map = L.map('map').setView([20, 0], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(window.map);
}

/**
 * Date picker handler (update your existing one)
 */
async function onDateSelected(selectedDate) {
  try {
    showLoading(true);
    const products = await fetchCOProducts(new Date(selectedDate));
    if (products.length > 0) {
      await displayCOLayer(products[0]);
      updateAcquisitionTime(products[0].startDate);
    } else {
      alert("No CO data available for selected date");
    }
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// ======================
// 4. HELPER FUNCTIONS
// ======================

function showLoading(show) {
  const loader = document.getElementById('loading');
  if (loader) loader.style.display = show ? 'block' : 'none';
}

function updateAcquisitionTime(timeString) {
  const timeElement = document.getElementById('acquisition-time');
  if (timeElement) {
    timeElement.textContent = new Date(timeString).toUTCString();
  }
}

// ======================
// 5. INITIALIZATION
// ======================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  
  // Set up date picker (using your existing flatpickr config)
  flatpickr("#datePicker", {
    dateFormat: "Y-m-d",
    defaultDate: new Date(),
    maxDate: new Date(),
    onChange: (dates) => onDateSelected(dates[0])
  });
  
  // Load initial data
  onDateSelected(new Date());
});
