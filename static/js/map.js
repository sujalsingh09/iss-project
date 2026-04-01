let map = null;
let issMarker = null;
let issTrail = [];
let trailPolyline = null;

export function initMap() {
    if (map) return map;

    map = L.map('map', {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true
    }).setView([0, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 10,
        subdomains: 'abcd'
    }).addTo(map);

    return map;
}

export function updateMap(lat, lon) {
    if (!map) return;

    const issIcon = L.divIcon({
        html: '<div class="iss-marker">🛸</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    if (!issMarker) {
        issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(map);
    } else {
        issMarker.setLatLng([lat, lon]);
    }

    issTrail.push([lat, lon]);
    if (issTrail.length > 40) issTrail.shift();

    if (trailPolyline) map.removeLayer(trailPolyline);
    trailPolyline = L.polyline(issTrail, {
        color: '#63b3ed',
        weight: 2,
        opacity: 0.5,
        dashArray: '5 8'
    }).addTo(map);
}