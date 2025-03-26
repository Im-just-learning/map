// Configure WMS defaults
L.TileLayer.WMS.mergeOptions({
    detectRetina: true,
    updateWhenIdle: true,
    maxZoom: 9,
    tileSize: 512
});

// Initial Load
(async () => {
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - 3); // Use 3 days ago for better data availability
    
    const product = await fetchCOProducts(testDate);
    if (product) {
        await displayCOProduct(product);
        const [minX, minY, maxX, maxY] = product.properties.bbox;
        map.fitBounds([[minY, minX], [maxY, maxX]]);
    }
})();

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
    if (!product) return;
    
    if (window.coLayer) map.removeLayer(window.coLayer);
    
    const token = await getAccessToken();
    const acquisitionTime = product.properties.startDate.split('T')[1].substring(0,8);
    
    window.coLayer = L.tileLayer.wms('https://sh.dataspace.copernicus.eu/wms', {
        layers: 'S5_CO_CDAS',
        styles: 'RASTER/CO_VISUALIZED',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        opacity: 0.7,
        env: 'color-scalerange:0:0.12',
        time: `${product.properties.startDate.split('T')[0]}T${acquisitionTime}`,
        width: 1024,
        height: 1024,
        srs: 'EPSG:3857',
        bbox: '{bbox-epsg-3857}',
        access_token: token
    }).addTo(map);
    
    updateAcquisitionTime(product.properties.startDate);
    
    // Apply visual enhancements
    const style = document.createElement('style');
    style.textContent = `
        .leaflet-layer img.leaflet-tile-loaded {
            filter: hue-rotate(-10deg) saturate(1.2) contrast(0.95);
            mix-blend-mode: multiply;
        }
    `;
    document.head.appendChild(style);
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

function updateAcquisitionTime(time) {
    const timeElement = document.getElementById('acquisition-time');
    if (timeElement) {
        const date = new Date(time);
        timeElement.textContent = date.toUTCString();
    }
}

// 4. Legend for CO Values
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
        <div style="margin-top:8px;font-size:0.8em">
            <span style="color:#666">Acquisition: </span>
            <span id="acquisition-time"></span>
        </div>
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
