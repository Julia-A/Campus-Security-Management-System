document.addEventListener("DOMContentLoaded", function () {
    const map = L.map("map", {
      center: [6.8924, 3.7183], // Modify to your campus location
      zoom: 15,
      scrollWheelZoom: false // Prevents scrolling issue
    });
  
    // Fix display issue when map is hidden at first
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
  
    const safeZones = [
      { name: "Security Office", coords: [6.891139, 3.722064] },
      { name: "Medical Center", coords: [6.891133, 3.717317] },
      { name: "Fire Station", coords: [6.891133, 3.717317] },
    ];
  
    safeZones.forEach((zone) => {
      L.marker(zone.coords)
        .addTo(map)
        .bindPopup(`<b>${zone.name}</b><br>Click "Find Safe Route" for directions.`);
    });
  
    // Find users location
    document.getElementById("find-route").addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const userLatLng = [position.coords.latitude, position.coords.longitude];
  
          // Add user marker
        const userMarker = L.marker(userLatLng, {
            icon: L.icon({
              iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-green.png",
              iconSize: [38, 95],
            }),
          }).addTo(map);
  
          map.setView(userLatLng, 15);
  
          // Draw a route to the nearest safe zone
          let nearestZone = safeZones[0];
          let minDistance = getDistance(userLatLng, nearestZone.location);
  
          safeZones.forEach((zone) => {
            let distance = getDistance(userLatLng, zone.location);
            if (distance < minDistance) {
              minDistance = distance;
              nearestZone = zone;
            }
          });
  
          L.Routing.control({
            waypoints: [L.latLng(userLatLng), L.latLng(nearestZone.location)],
            routeWhileDragging: true,
          }).addTo(map);
        });
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  });
  
  // Function to calculate distance between two points
  function getDistance(coord1, coord2) {
    return Math.sqrt(
      Math.pow(coord2[0] - coord1[0], 2) + Math.pow(coord2[1] - coord1[1], 2)
    );
  }