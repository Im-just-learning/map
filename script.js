// Initialize map
const map = L.map('map').setView([38.4, 117.7], 5);

// Add base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Mock CO data (semi-transparent orange layer)
const mockCOLayer = L.rectangle([[30, 100], [45, 130]], {
  color: '#ff7800',
  fillColor: '#ff7800',
  fillOpacity: 0.5,
  weight: 1
}).addTo(map);

// Add legend
const legend = L.control({position: 'bottomright'});
legend.onAdd = function() {
  const div = L.DomUtil.create('div', 'info legend');
  div.innerHTML = `
    <h4>CO Levels (mock data)</h4>
    <div style="background:#ff7800; opacity:0.5; height:20px;"></div>
    <p>High Concentration</p>
  `;
  return div;
};
legend.addTo(map);

// Date picker (functional but won't change real data)
flatpickr("#datePicker", {
  dateFormat: "Y-m-d",
  defaultDate: "2024-12-24",
  onChange: function(selectedDates) {
    const date = selectedDates[0].toISOString().split('T')[0];
    alert(`Date changed to ${date}\n(Mock demo - real data requires API)`);
    
    // For demo: Move the mock layer slightly
    mockCOLayer.setBounds([
      [30 + Math.random()*5, 100 + Math.random()*5],
      [45 + Math.random()*5, 130 + Math.random()*5]
    ]);
  }
});

