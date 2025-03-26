// Configuration
const AUTH_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products';
const PRODUCT_ID = 'L2__CO____'; // Sentinel-5P CO product type
const CLIENT_ID = "sh-3e397c85-30e1-4067-9bec-975aa62d574a",
const CLIENT_SECRET = "oEGik5bM249xxsAowSiSvwmK43qdqsBQ",

// Get authentication token
async function getAccessToken() {
  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token Error:', error);
    throw new Error('Failed to obtain access token');
  }
}

// Fetch CO products for a specific date
async function fetchCOProducts(date) {
  document.getElementById('loading').style.display = 'block';
  
  try {
    // Validate date
    if (!(date instanceof Date) || isNaN(date)) {
      throw new Error("Invalid date provided");
    }
    
    const formattedDate = date.toISOString().split('T')[0];
    const token = await getAccessToken();
    
    // Build OData query
    const query = new URLSearchParams({
      '$filter': `Collection/Name eq 'Sentinel5P' and ` +
                 `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq '${PRODUCT_ID}') and ` +
                 `ContentDate/Start ge ${formattedDate}T00:00:00Z and ` +
                 `ContentDate/End le ${formattedDate}T23:59:59Z`,
      '$top': '5',
      '$orderby': 'ContentDate/Start desc'
    });
    
    const apiUrl = `${CATALOG_URL}?${query.toString()}`;
    console.log('API Request:', apiUrl); // Debug
    
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', data); // Debug
    
    if (!data.value || data.value.length === 0) {
      throw new Error("No CO data available for this date");
    }
    
    // Return simplified product information
    return data.value.map(product => ({
      id: product.Id,
      name: product.Name,
      date: product.ContentDate.Start,
      footprint: product.GeoFootprint,
      downloadLink: product.Links.find(link => link.rel === 'download')?.href
    }));
    
  } catch (error) {
    console.error("Fetch Error:", error);
    alert(`CO data loading failed: ${error.message}`);
    return [];
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}

// Example usage with map integration
async function loadAndDisplayCOData() {
  try {
    const date = new Date(); // Or get from user input
    const products = await fetchCOProducts(date);
    
    if (products.length > 0) {
      // Assuming you have a function to add CO layer to your map
      addCOLayerToMap(products[0]);
    } else {
      alert("No CO data found for selected date");
    }
  } catch (error) {
    console.error("Display Error:", error);
  }
}
