<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import 'mapbox-gl/dist/mapbox-gl.css';
  import QRCode from 'qrcode';

  export let visitors: any[] = [];

  // Mapbox access token
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  
  let mapContainer: HTMLDivElement;
  let map: mapboxgl.Map;
  let markersAndLines: (mapboxgl.Marker | string)[] = [];
  let drawnVisitorIds = new Set<string>();

  onMount(async () => {
    // Generate website QR code
    try {
      const url = 'http://10.0.2.36';
      const qrContainer = document.getElementById('qr-code');
      if (qrContainer) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, url, {
          width: 80,
          margin: 1,
          color: {
            dark: '#6b7280',
            light: '#000000'
          }
        });
        // Clear container and add canvas
        qrContainer.innerHTML = '';
        qrContainer.appendChild(canvas);
      }
    } catch (error) {
      console.error('Error generating website QR code:', error);
    }

    // Generate WiFi QR code
    try {
      const wifiConfig = "WIFI:T:WPA;S:Matt's Room 5G;P:Spongebob5903!;H:false;;";
      const wifiQrContainer = document.getElementById('wifi-qr-code');
      if (wifiQrContainer) {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, wifiConfig, {
          width: 80,
          margin: 1,
          color: {
            dark: '#6b7280',
            light: '#000000'
          }
        });
        // Clear container and add canvas
        wifiQrContainer.innerHTML = '';
        wifiQrContainer.appendChild(canvas);
      }
    } catch (error) {
      console.error('Error generating WiFi QR code:', error);
    }

    // Initialize the map
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
      container: mapContainer,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme style
      center: [0, 20], // Center on world
      zoom: 1.5,
      projection: 'naturalEarth', // Use flat natural earth projection
      dragRotate: false, // Disable rotation for flat map
      touchPitch: false, // Disable pitch gestures
      pitchWithRotate: false // Disable pitch with rotate
    });

    map.on('load', () => {
      // Remove fog since we're using flat projection
      // Add visitors to map
      updateVisitors();
    });

    map.on('style.load', () => {
      updateVisitors();
    });
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function clearMapData() {
    // Remove existing markers and lines
    markersAndLines.forEach(item => {
      if (typeof item === 'string') {
        // It's a layer ID
        if (map.getLayer(item)) {
          map.removeLayer(item);
        }
        if (map.getSource(item)) {
          map.removeSource(item);
        }
      } else {
        // It's a marker
        item.remove();
      }
    });
    markersAndLines = [];
    drawnVisitorIds.clear();
  }

  function updateVisitors() {
    if (!map || !visitors || !map.isStyleLoaded()) return;

    // Only add new visitors that haven't been drawn yet
    const newVisitors = visitors.filter(visitor => !drawnVisitorIds.has(visitor.id));

    newVisitors.forEach((visitor) => {
      if (!visitor.hometown_coords || !visitor.current_coords) return;

      const hometownCoords: [number, number] = [
        visitor.hometown_coords.longitude,
        visitor.hometown_coords.latitude
      ];
      const currentCoords: [number, number] = [
        visitor.current_coords.longitude,
        visitor.current_coords.latitude
      ];

      // Create curved line between points
      const lineId = `journey-${visitor.id}`;
      const lineCoords = createCurvedLine(hometownCoords, currentCoords);

      // Add line source and layer
      map.addSource(lineId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: lineCoords
          }
        }
      });

      map.addLayer({
        id: lineId,
        type: 'line',
        source: lineId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#6b7280',
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [2, 4]
        }
      });

      markersAndLines.push(lineId);

      // Add directional arrows along the line
      const arrowsId = `arrows-${visitor.id}`;
      const arrowPoints: any[] = [];

      // Create arrow points at intervals along the line
      for (let i = 0.3; i < 1; i += 0.3) {
        const pointIndex = Math.floor(i * (lineCoords.length - 1));
        if (pointIndex < lineCoords.length - 1) {
          const currentPoint = lineCoords[pointIndex];
          const nextPoint = lineCoords[pointIndex + 1];

          // Calculate arrow rotation
          const deltaLng = nextPoint[0] - currentPoint[0];
          const deltaLat = nextPoint[1] - currentPoint[1];
          const rotation = Math.atan2(deltaLat, deltaLng) * (180 / Math.PI);

          arrowPoints.push({
            type: 'Feature' as const,
            properties: {
              rotation: rotation
            },
            geometry: {
              type: 'Point' as const,
              coordinates: currentPoint
            }
          });
        }
      }

      map.addSource(arrowsId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: arrowPoints
        }
      });

      map.addLayer({
        id: arrowsId,
        type: 'symbol',
        source: arrowsId,
        layout: {
          'text-field': '→',
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-rotate': ['get', 'rotation'],
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'map'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });

      markersAndLines.push(arrowsId);

      // Create custom hometown marker (small dot)
      const hometownElement = document.createElement('div');
      hometownElement.className = 'hometown-marker';
      hometownElement.innerHTML = `<div class="hometown-dot"></div>`;

      const hometownMarker = new mapboxgl.Marker(hometownElement)
        .setLngLat(hometownCoords)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${visitor.name}'s Hometown</h3>
            <p>${visitor.hometown_display}</p>
          </div>
        `))
        .addTo(map);

      markersAndLines.push(hometownMarker);

      // Create custom current location marker (small dot)
      const currentElement = document.createElement('div');
      currentElement.className = 'current-marker';
      currentElement.innerHTML = `<div class="current-dot"></div>`;

      const currentMarker = new mapboxgl.Marker(currentElement)
        .setLngLat(currentCoords)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${visitor.name}'s Current Location</h3>
            <p>${visitor.current_display}</p>
          </div>
        `))
        .addTo(map);

      markersAndLines.push(currentMarker);

      // Create visitor info marker at a point along the curved line
      const linePointIndex = Math.floor(lineCoords.length * 0.6); // 60% along the line
      const photoPosition = lineCoords[linePointIndex] || getMidpoint(hometownCoords, currentCoords);

      // Create custom HTML element for visitor photo
      const visitorElement = document.createElement('div');
      visitorElement.className = 'visitor-marker';
      visitorElement.innerHTML = `
        <div class="visitor-photo">
          <img src="${visitor.photo_path}" alt="${visitor.name}" />
          <div class="visitor-info">
            <div class="visitor-name">${visitor.name}</div>
            <div class="visitor-date">${new Date(visitor.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      `;

      const visitorMarker = new mapboxgl.Marker(visitorElement)
        .setLngLat(photoPosition)
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-3 text-center">
            <img src="${visitor.photo_path}" alt="${visitor.name}" class="w-16 h-16 rounded-full mx-auto mb-2 object-cover">
            <h3 class="font-bold text-lg">${visitor.name}</h3>
            <p class="text-sm text-gray-600 mb-1">${visitor.hometown_display} → ${visitor.current_display}</p>
            <p class="text-xs text-gray-500">${new Date(visitor.created_at).toLocaleDateString()}</p>
          </div>
        `))
        .addTo(map);

      markersAndLines.push(visitorMarker);

      // Mark this visitor as drawn
      drawnVisitorIds.add(visitor.id);
    });

    // Fit map to show all points if there are visitors and this is the first time
    if (visitors.length > 0 && drawnVisitorIds.size === visitors.length) {
      const bounds = new mapboxgl.LngLatBounds();
      visitors.forEach(visitor => {
        if (visitor.hometown_coords) {
          bounds.extend([visitor.hometown_coords.longitude, visitor.hometown_coords.latitude]);
        }
        if (visitor.current_coords) {
          bounds.extend([visitor.current_coords.longitude, visitor.current_coords.latitude]);
        }
      });

      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 8
      });
    }
  }

  function createCurvedLine(start: [number, number], end: [number, number]): [number, number][] {
    const numPoints = 20;
    const coords: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      
      // Simple quadratic curve
      const midLng = (start[0] + end[0]) / 2;
      const midLat = (start[1] + end[1]) / 2 + Math.abs(end[0] - start[0]) * 0.1; // Curve upward
      
      const lng = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * midLng + t * t * end[0];
      const lat = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLat + t * t * end[1];
      
      coords.push([lng, lat]);
    }

    return coords;
  }

  function getMidpoint(start: [number, number], end: [number, number]): [number, number] {
    return [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2
    ];
  }

  // Reactive statement to update when visitors change
  $: if (map && visitors) {
    updateVisitors();
  }
</script>


<div class="w-full bg-gray-900 overflow-hidden shadow-2xl border border-gray-700 rounded-lg">
  <div class="flex justify-between items-center p-4 bg-gray-950">
    <div>
      <h2 class="text-2xl font-bold text-white">Visitor Journey Map</h2>
      <p class="text-gray-400 mt-1">Discover where everyone's journey began and where they are now.</p>
    </div>
    <div class="text-center flex gap-4">
      <div>
        <div id="wifi-qr-code" class="bg-black p-2 rounded-lg border border-gray-600"></div>
        <p class="text-xs text-gray-500 mt-1">Scan for WiFi</p>
      </div>
      <div>
        <div id="qr-code" class="bg-black p-2 rounded-lg border border-gray-600"></div>
        <p class="text-xs text-gray-500 mt-1">Scan to visit</p>
      </div>
    </div>
  </div>
  
  <div class="relative h-[72vh]">
    <div bind:this={mapContainer} class="w-full h-full"></div>
    
    {#if visitors.length === 0}
      <div class="absolute inset-0 flex items-center justify-center bg-gray-800/80">
        <div class="text-center p-8">
          <div class="text-6xl mb-4">🗺️</div>
          <h3 class="text-xl font-semibold text-white mb-2">No journeys yet</h3>
          <p class="text-gray-400">Add your journey to see it on the map!</p>
        </div>
      </div>
    {/if}
  </div>
  
  <div class="p-4 bg-gray-950 flex justify-center gap-6 text-sm border-t border-gray-700">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gray-400"></div>
      <span class="text-gray-400">Hometown</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-white"></div>
      <span class="text-gray-400">Current Location</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-8 h-0.5 bg-gray-500 opacity-80" style="border-top: 2px dashed;"></div>
      <span class="text-white text-xs">→</span>
      <span class="text-gray-400">Journey Path</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-4 h-4 rounded-full bg-gray-800 border border-gray-500"></div>
      <span class="text-gray-400">Visitor Photo</span>
    </div>
  </div>
</div>

<style>
  :global(.hometown-marker),
  :global(.current-marker),
  :global(.visitor-marker) {
    cursor: pointer;
  }

  :global(.hometown-dot) {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #6b7280;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  :global(.current-dot) {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #6b7280;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  :global(.visitor-photo) {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid #6b7280;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  :global(.visitor-photo img) {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  :global(.visitor-info) {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: #f9fafb;
    padding: 8px 12px;
    border-radius: 8px;
    white-space: nowrap;
    margin-top: 8px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    border: 1px solid #6b7280;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  :global(.visitor-marker:hover .visitor-info) {
    opacity: 1;
  }

  :global(.visitor-name) {
    font-weight: bold;
    font-size: 12px;
  }

  :global(.visitor-date) {
    font-size: 10px;
    opacity: 0.8;
  }

  :global(.mapboxgl-popup-content) {
    background: #1f2937 !important;
    color: #f9fafb !important;
    border: 1px solid #374151 !important;
    border-radius: 8px !important;
  }

  :global(.mapboxgl-popup-close-button) {
    color: #f9fafb !important;
    font-size: 18px !important;
  }
</style>
