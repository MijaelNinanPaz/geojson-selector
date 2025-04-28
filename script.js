const myData = {
    serviceZones: null
};

// Hydrate the Mapbox access token.
mapboxgl.accessToken = 'pk.eyJ1IjoibWlqYWVsNiIsImEiOiJjbWExa2pvMXUwOGYwMmpxNDQxcDZtZ2t4In0.qlq0FGs9YaCrlecsKRNe4Q';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-98, 38.88],
    minZoom: 2,
    zoom: 5
});

let selectedCounties = new Set();
let allFeatures = new Map();

map.on('load', () => {
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: 'Search for a location',
        countries: 'us'
    });

    map.addControl(geocoder, 'top-left');
    map.addSource('counties', {
        'type': 'vector',
        'url': 'mapbox://mapbox.82pkq93d'
    });

    map.addLayer(
        {
            'id': 'counties',
            'type': 'fill',
            'source': 'counties',
            'source-layer': 'original',
            'paint': {
                'fill-outline-color': 'rgba(0,0,0,0.1)',
                'fill-color': 'rgba(0,0,0,0.1)'
            }
        },
        'building'
    );
    
    if (myData.serviceZones) {
        map.addSource('selected-counties', {
            'type': 'geojson',
            'data': myData.serviceZones
        });
    }

    if (myData.serviceZones) {
        map.addSource('selected-counties', {
            'type': 'geojson',
            'data': myData.serviceZones
        });
    } else {
        map.addSource('selected-counties', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': []
            }
        });
    }

    map.addLayer({
        'id': 'counties-highlighted',
        'type': 'fill',
        'source': 'selected-counties',
        'paint': {
            'fill-outline-color': '#484896',
            'fill-color': '#6e599f',
            'fill-opacity': 0.75
        }
    });

    map.on('click', (e) => {
        const bbox = [
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ];
        const selectedFeatures = map.queryRenderedFeatures(bbox, {
            layers: ['counties']
        });

        selectedFeatures.forEach(feature => {
            const fips = feature.properties.FIPS;
            if (selectedCounties.has(fips)) {
                selectedCounties.delete(fips);
                allFeatures.delete(fips);
            } else {
                selectedCounties.add(fips);
                allFeatures.set(fips, feature);
            }
        });

        const selectedGeoJSON = {
            type: 'FeatureCollection',
            features: Array.from(allFeatures.values())
        };

        map.getSource('selected-counties').setData(selectedGeoJSON);

        // Update the myData object with the selected counties
        myData.serviceZones = JSON.stringify(selectedGeoJSON, null, 2);
        
        // Update the output area with the selected counties
        document.getElementById('service-zones-output').textContent = myData.serviceZones;

    });
});