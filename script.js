// 1. Initialize Map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// 2. CO Layer Management
let coLayer = null;

async function fetchCOProducts(date) {
  const formattedDate = date.toISOString().split('T')[0];
  const response = await fetch(
    `https://catalogue.dataspace.copernicus.eu/resto/api/collections/S5P/search.json?` +
    `productType=L2__CO____&` +
    `startDate=${formattedDate}T00:00:00Z&` +
    `endDate=${formattedDate}T23:59:59Z&` +
    `maxRecords=10`
  );
  
  const data = await response.json();
  window.COPERNICUS_DATA.products = data.features;
  return data.features[0]; // Get most recent product
}

async function displayCOProduct(product) {
  if (coLayer) map.removeLayer(coLayer);
  
  // Get WMS URL from product metadata
  const wmsUrl = product.properties.services.find(s => s.type === 'wms').url;
  const layerName = product.properties.productIdentifier.split('/').pop();
  
  coLayer = L.tileLayer.wms(wmsUrl, {
    layers: layerName,
    styles: 'RASTER/CO_VISUALIZED',
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    attribution: 'Sentinel-5P CO Data'
  }).addTo(map);
  
  // Update map view to product coverage
  const [minX, minY, maxX, maxY] = product.properties.bbox;
  map.fitBounds([[minY, minX], [maxY, maxX]]);
}

// 3. Date Picker Integration
flatpickr("#datePicker", {
  dateFormat: "Y-m-d",
  defaultDate: new Date(),
  maxDate: new Date(),
  onChange: async (dates) => {
    const product = await fetchCOProducts(dates[0]);
    await displayCOProduct(product);
  }
});

// 4. Legend for CO Values
const legend = L.control({position: 'bottomright'});
legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = `
    <h4>CO (mol/m²)</h4>
    <div><i style="background:#0000FF"></i> 0-0.02</div>
    <div><i style="background:#00FFFF"></i> 0.02-0.04</div>
    <div><i style="background:#00FF00"></i> 0.04-0.06</div>
    <div><i style="background:#FFFF00"></i> 0.06-0.08</div>
    <div><i style="background:#FF0000"></i> >0.08</div>
  `;
  return div;
};
legend.addTo(map);

// 5. Initial Load
(async () => {
  const today = new Date();
  const product = await fetchCOProducts(today);
  await displayCOProduct(product);
})();
