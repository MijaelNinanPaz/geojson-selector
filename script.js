const myData = {
  serviceZones: null
};

// Hydrate the Mapbox access token.
mapboxgl.accessToken = 'pk.eyJ1IjoibWlqYWVsNiIsImEiOiJjbWExa2pvMXUwOGYwMmpxNDQxcDZtZ2t4In0.qlq0FGs9YaCrlecsKRNe4Q';

//Define configuration for each boundary type with custom tilesets
const boundaryTypes = {
'us-counties': {
  url: 'mapbox://mijael6.1iw2voup',
  sourceLayer: 'cb_2024_us_county_500k-2opat1',
  idProperty: 'GEOID',
  nameProperty: 'NAME',
  center: [-98, 38.88],
  zoom: 5
},
'us-states': {
  url: 'mapbox://mijael6.5463yvl6',
  sourceLayer: 'cb_2024_us_state_500k-chyd5l',
  idProperty: 'GEOID',
  nameProperty: 'NAME',
  center: [-98, 38.88],
  zoom: 4
},
'ca-provinces': {
  url: 'mapbox://mijael6.ak3cephj',
  sourceLayer: 'lpr_000a21a_e-0c1g1e',
  idProperty: 'PRUID',
  nameProperty: 'PRNAME',
  center: [-98, 54],
  zoom: 3
},
};

const map = new mapboxgl.Map({
  container: 'map',
  // style: 'mapbox://styles/mapbox/streets-v12',
  style: "mapbox://styles/mapbox/light-v11",
  center: [-98, 38.88],
  minZoom: 2,
  zoom: 5
});

let selectedFeatures = new Set();
let currentBoundaryType = 'us-counties';
let currentIdProperty = 'GEOID';


// Function to change the boundary type
function changeBoundaryType(type) {
  // Change the current boundary type
  currentBoundaryType = type;
  const config = boundaryTypes[type];
  currentIdProperty = config.idProperty;

  // Cambiar el centro y zoom del mapa
  map.flyTo({
    center: config.center,
    zoom: config.zoom
  });

  // Eliminar capas existentes
  if (map.getLayer('boundaries-highlighted')) map.removeLayer('boundaries-highlighted');
  if (map.getLayer('boundaries-labels')) map.removeLayer('boundaries-labels');
  if (map.getLayer('boundaries')) map.removeLayer('boundaries');
  if (map.getSource('boundaries')) map.removeSource('boundaries');

  // Limpiar selecciones
  selectedFeatures.clear();

  // Añadir nueva fuente
  map.addSource('boundaries', {
    'type': 'vector',
    'url': config.url,
    'buffer': 512
  });

  // Base layer
  map.addLayer(
    {
      'id': 'boundaries',
      'type': 'fill',
      'source': 'boundaries',
      'source-layer': config.sourceLayer,
      'paint': {
        'fill-outline-color': 'rgba(0,0,0,0.1)',
        'fill-color': 'rgba(0,0,0,0.1)'
      }
    },
    'building'
  );

  // Highlighted layer
  map.addLayer({
    'id': 'boundaries-highlighted',
    'type': 'fill',
    'source': 'boundaries',
    'source-layer': config.sourceLayer,
    'paint': {
      'fill-outline-color': '#484896',
      'fill-color': '#6e599f',
      'fill-opacity': 0.75
    },
    'filter': ['in', config.idProperty, '']
  });

  // Labels layer
  map.addLayer({
    'id': 'boundaries-labels',
    'type': 'symbol',
    'source': 'boundaries',
    'source-layer': config.sourceLayer,
    'layout': {
      'text-field': ['get', config.nameProperty],
      'text-font': ['Open Sans Regular'],
      'text-size': 12,
      'text-allow-overlap': false
    },
    'paint': {
      'text-color': '#000000',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 1
    }
  });


  // Update the output area with selected features
  if (myData.serviceZones) {
    document.getElementById('service-zones-output').textContent = myData.serviceZones;
  }

}

map.on('load', () => {
  // Add Mapbox geocoder control
  const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Search for a location',
      countries: 'us,ca'
  });

  map.addControl(geocoder, 'top-left');
  
  // Añadir event listener al selector
  document.getElementById('boundary-type').addEventListener('change', (e) => {
    changeBoundaryType(e.target.value);
  });
  
  // Inicializar con el primer tipo de límite
  changeBoundaryType(currentBoundaryType);
  
  // Load stored data if available
  if (myData.serviceZones) {
      try {
          // Parse GeoJSON if stored as a string
          const serviceZonesData = typeof myData.serviceZones === 'string' ? JSON.parse(myData.serviceZones) : myData.serviceZones;
          
          // Extract feature IDs from the GeoJSON
          if (serviceZonesData && serviceZonesData.features) {
              serviceZonesData.features.forEach(feature => {
                  if (feature.properties && feature.properties[currentIdProperty]) {
                      selectedFeatures.add(feature.properties[currentIdProperty]);
                  }
              });
          }

          // Update output area with selected features
          document.getElementById('service-zones-output').textContent = JSON.stringify(serviceZonesData, null, 2);
          
          // Apply filter with loaded features
          const selectedIds = Array.from(selectedFeatures);
          if (selectedIds.length > 0) {
              map.setFilter('boundaries-highlighted', ['in', currentIdProperty, ...selectedIds]);
          }

      } catch (error) {
          console.error("Error loading saved data:", error);
      }
  }

  // Click event handler
  map.on('click', (e) => {
      // Query the feature at the click point
      const features = map.queryRenderedFeatures(e.point, {
          layers: ['boundaries']
      });

      console.log(features)
      
      if (features.length > 0) {
          const featureId = features[0].properties[currentIdProperty];
          
          // Toggle selection
          if (selectedFeatures.has(featureId)) {
              selectedFeatures.delete(featureId);
          } else {
              selectedFeatures.add(featureId);
          }
          
          // Convert Set to array for filter
          const selectedIds = Array.from(selectedFeatures);
          
          // Apply filter to display selected features
          if (selectedIds.length > 0) {
              map.setFilter('boundaries-highlighted', ['in', currentIdProperty, ...selectedIds]);
          } else {
              map.setFilter('boundaries-highlighted', ['in', currentIdProperty, '']);
          }
          
          // Collect full feature info of selected features
          const selectedFeaturesArray = [];

          for (const id of selectedIds) {
              // Query all features matching this ID
              const queriedFeatures = map.querySourceFeatures('boundaries', {
                  sourceLayer: boundaryTypes[currentBoundaryType].sourceLayer,
                  filter: ['==', currentIdProperty, id]
              });
              
              if (queriedFeatures.length > 0) {
                  // Use the first feature with valid geometry
                  const completeFeature = queriedFeatures.find(f => f.geometry && f.geometry.coordinates) || queriedFeatures[0];
                  selectedFeaturesArray.push(completeFeature);
              } else {
                  // Fallback to a basic feature if nothing found
                  const fallbackFeature = {
                      type: 'Feature',
                      properties: {}
                  };
                  fallbackFeature.properties[currentIdProperty] = id;
                  selectedFeaturesArray.push(fallbackFeature);
              }
          }

          // Update myData with selected features
          const selectedGeoJSON = {
              type: 'FeatureCollection',
              features: selectedFeaturesArray
          };

          myData.serviceZones = JSON.stringify(selectedGeoJSON, null, 2);
          // Update output area with selected features
          document.getElementById('service-zones-output').textContent = myData.serviceZones;
      }
  });
});