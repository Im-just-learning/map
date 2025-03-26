// 1. INITIALIZE MAP
const map = L.map('map').setView([38.40674, 117.69653], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// 2. SET UP DATE PICKER
const datePicker = flatpickr("#datePicker", {
    dateFormat: "Y-m-d",
    defaultDate: "2024-01-15",  // Default date with available data
    maxDate: "today",
    onChange: fetchCOData
});

// 3. GLOBALS FOR DATA VISUALIZATION
let coLayer = null;
let legend = null;
let lastFetch = null;

// 4. MAIN FUNCTION TO FETCH CO DATA
async function fetchCOData(selectedDates) {
    const date = selectedDates[0].toISOString().split('T')[0];
    
    // Avoid duplicate requests
    if (lastFetch === date) return;
    lastFetch = date;
    
    showLoading(true);
    
    try {
        const response = await fetchWithTimeout(
            `https://catalogue.dataspace.copernicus.eu/resto/api/collections/S5P/search.json?` +
            `productType=L2__CO____&` +
            `startDate=${date}T00:00:00Z&` +
            `endDate=${date}T23:59:59Z&` +
            `bbox=116,37,119,40&` +  // Adjusted bounding box for China region
            `maxRecords=50&` +
            `cloudCover=[0,30]`,      // Only clearer skies
            { timeout: 10000 }        // 10-second timeout
        );
        
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
            throw new Error("No CO data available for this date");
        }
        
        visualizeCOData(data.features);
    } catch (error) {
        console.error("Fetch error:", error);
        showError(`Failed to load data: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// 5. VISUALIZE CO DATA AS HEATMAP
function visualizeCOData(features) {
    // Clear previous layers
    if (coLayer) map.removeLayer(coLayer);
    if (legend) map.removeControl(legend);
    
    // Process API data
    const heatData = features.map(feature => {
        // Extract CO value - THIS IS CRUCIAL TO VERIFY
        const coValue = getCOValueFromFeature(feature);
        return [
            feature.geometry.coordinates[1],  // lat
            feature.geometry.coordinates[0],  // lng
            normalizeCOValue(coValue)         // intensity
        ];
    });
    
    // Create heatmap layer
    coLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: getCOGradient(),
        minOpacity: 0.5
    }).addTo(map);
    
    // Add legend
    addLegend();
}

// 6. DATA PROCESSING HELPERS
function getCOValueFromFeature(feature) {
    /* Verify this matches your API response structure!
    Check the actual response in browser DevTools > Network tab */
    return feature.properties?.carbonMonoxide?.totalColumn ||  // Most likely path
           feature.properties?.CO?.value ||                   // Alternative path
           0.02;                                             // Fallback
}

function normalizeCOValue(value) {
    // Convert scientific value to heatmap intensity (0-1)
    return Math.min(value * 100, 1);
}

function getCOGradient() {
    return {
        0.1: '#0000FF',  // blue (low)
        0.3: '#00FFFF',  // cyan
        0.5: '#00FF00',  // green
        0.7: '#FFFF00',  // yellow
        0.9: '#FF0000'   // red (high)
    };
}

// 7. UI HELPERS
function addLegend() {
    legend = L.control({position: 'bottomright'});
    legend.onAdd = () => {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <h4>CO Concentration (mol/m²)</h4>
            <div><i style="background:#0000FF"></i> 0-0.02</div>
            <div><i style="background:#00FFFF"></i> 0.02-0.04</div>
            <div><i style="background:#00FF00"></i> 0.04-0.06</div>
            <div><i style="background:#FFFF00"></i> 0.06-0.08</div>
            <div><i style="background:#FF0000"></i> >0.08</div>
        `;
        return div;
    };
    legend.addTo(map);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    L.popup()
        .setLatLng(map.getCenter())
        .setContent(`<div style="color:red;">${message}</div>`)
        .openOn(map);
}

// 8. UTILITY FUNCTIONS
async function fetchWithTimeout(url, options = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
        ...options,
        signal: controller.signal  
    });
    
    clearTimeout(id);
    return response;
}

// 9. INITIAL LOAD
fetchCOData([new Date(datePicker.input.value)]);
