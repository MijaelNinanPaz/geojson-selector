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

map.on('load', () => {

    // Add Mapbox geocoder control
    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: 'Search for a location',
        countries: 'us'
    });

    map.addControl(geocoder, 'top-left');
    
    // Add the vector source for counties
    map.addSource('counties', {
        'type': 'vector',
        'url': 'mapbox://mijael6.1iw2voup',
        'buffer': 512
    });

    // Base county layer (unhighlighted)
    map.addLayer(
        {
            'id': 'counties',
            'type': 'fill',
            'source': 'counties',
            'source-layer': 'cb_2024_us_county_500k-2opat1',
            'paint': {
                'fill-outline-color': 'rgba(0,0,0,0.1)',
                'fill-color': 'rgba(0,0,0,0.1)'
            }
        },
        'building'
    );

    // Highlighted counties layer (same source)
    map.addLayer({
        'id': 'counties-highlighted',
        'type': 'fill',
        'source': 'counties',
        'source-layer': 'cb_2024_us_county_500k-2opat1',
        'paint': {
            'fill-outline-color': '#484896',
            'fill-color': '#6e599f',
            'fill-opacity': 0.75
        },
        'filter': ['in', 'GEOID', ''] 
    });

    // Load stored counties AFTER the layers are ready
    if (myData.serviceZones) {
        try {
            // Parse GeoJSON if stored as a string
            const serviceZonesData = typeof myData.serviceZones === 'string' ? JSON.parse(myData.serviceZones) : myData.serviceZones;
            
            // Extract county GEOIDs from the GeoJSON
            if (serviceZonesData && serviceZonesData.features) {
                serviceZonesData.features.forEach(feature => {
                    if (feature.properties && feature.properties.GEOID) {
                        selectedCounties.add(feature.properties.GEOID);
                    }
                });
            }

            // Update output area with selected counties
            document.getElementById('service-zones-output').textContent =  JSON.stringify(serviceZonesData, null, 2);
            
            // Apply filter with loaded counties
            const selectedIds = Array.from(selectedCounties);
            if (selectedIds.length > 0) {
                map.setFilter('counties-highlighted', ['in', 'GEOID', ...selectedIds]);
            }

        } catch (error) {
            console.error("Error loading saved data:", error);
        }
    }

    // Click event handler
    map.on('click', (e) => {

        // Query the county feature at the click point
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['counties']
        });
        
        if (features.length > 0) {
            const countyId = features[0].properties.GEOID;
            const countyName = features[0].properties.NAME || 'County';
            
            // Toggle selection
            if (selectedCounties.has(countyId)) {
                selectedCounties.delete(countyId);
            } else {
                selectedCounties.add(countyId);
            }
            
            // Convert Set to array for filter
            const selectedIds = Array.from(selectedCounties);
            
            // Apply filter to display selected counties
            if (selectedIds.length > 0) {
                map.setFilter('counties-highlighted', ['in', 'GEOID', ...selectedIds]);
            } else {
                map.setFilter('counties-highlighted', ['in', 'GEOID', '']);
            }
            
            // Collect full feature info of selected counties
            const selectedFeatures = [];

            for (const id of selectedIds) {
                // Query all features matching this county ID
                const countyFeatures = map.querySourceFeatures('counties', {
                    sourceLayer: 'cb_2024_us_county_500k-2opat1',
                    filter: ['==', 'GEOID', id]
                });
                
                if (countyFeatures.length > 0) {
                    // Use the first feature with valid geometry
                    const completeFeature = countyFeatures.find(f => f.geometry && f.geometry.coordinates) || countyFeatures[0];
                    selectedFeatures.push(completeFeature);
                } else {
                    // Fallback to a basic feature if nothing found
                    selectedFeatures.push({
                        type: 'Feature',
                        properties: { GEOID: id }
                    });
                }
            }

            // Update myData with selected counties
            const selectedGeoJSON = {
                type: 'FeatureCollection',
                features: selectedFeatures
            };

            myData.serviceZones = JSON.stringify(selectedGeoJSON, null, 2);
            // Update output area with selected counties
            document.getElementById('service-zones-output').textContent = myData.serviceZones;
        }
    });
});
