<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { feature } from 'topojson-client';

  export let visitors: any[] = [];

  let mapContainer: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  
  const width = 1200;
  const height = 600;

  // Simple city coordinates for demonstration - in a real app you'd use a geocoding service
  const cityCoordinates: Record<string, [number, number]> = {
    'New York, USA': [-74.006, 40.7128],
    'San Francisco, USA': [-122.4194, 37.7749],
    'London, UK': [-0.1276, 51.5074],
    'Paris, France': [2.3522, 48.8566],
    'Tokyo, Japan': [139.6917, 35.6895],
    'Sydney, Australia': [151.2093, -33.8688],
    'Berlin, Germany': [13.4050, 52.5200],
    'Toronto, Canada': [-79.3832, 43.6532],
    'Mumbai, India': [72.8777, 19.0760],
    'São Paulo, Brazil': [-46.6333, -23.5505],
  };

  function getCityCoordinates(cityName: string): [number, number] | null {
    // First try exact match
    if (cityCoordinates[cityName]) {
      return cityCoordinates[cityName];
    }
    
    // Try to find a match by city name only
    const cityOnly = cityName.split(',')[0].trim();
    const match = Object.keys(cityCoordinates).find(key => 
      key.toLowerCase().includes(cityOnly.toLowerCase())
    );
    
    if (match) {
      return cityCoordinates[match];
    }
    
    // Return null if no match found
    return null;
  }

  onMount(async () => {
    // Create SVG
    svg = d3.select(mapContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('background', '#0f172a'); // Dark background

    // Set up projection
    const projection = d3.geoNaturalEarth1()
      .scale(190)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    try {
      // Load world map data
      const world: any = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      
      if (world && world.objects && world.objects.countries) {
        const countries: any = feature(world, world.objects.countries);

        // Draw countries
        svg.append('g')
          .selectAll('path')
          .data(countries.features)
          .enter().append('path')
          .attr('d', (d: any) => path(d))
          .attr('fill', '#1e293b')
          .attr('stroke', '#334155')
          .attr('stroke-width', 0.5);

        // Draw visitor journeys
        drawVisitorJourneys(projection);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      // Fallback: draw a simple background
      svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#1e293b')
        .attr('stroke', '#334155')
        .attr('stroke-width', 2);
      
      drawVisitorJourneys(projection);
    }
  });

  function drawVisitorJourneys(projection: d3.GeoProjection) {
    visitors.forEach((visitor, index) => {
      const fromCoords = getCityCoordinates(visitor.hometown);
      const toCoords = getCityCoordinates(visitor.current_city);

      if (fromCoords && toCoords) {
        const fromProjected = projection(fromCoords);
        const toProjected = projection(toCoords);

        if (fromProjected && toProjected) {
          // Draw the journey line
          const lineGenerator = d3.line()
            .curve(d3.curveCardinal);

          // Create a curved path
          const midPoint: [number, number] = [
            (fromProjected[0] + toProjected[0]) / 2,
            (fromProjected[1] + toProjected[1]) / 2 - 50 // Curve upward
          ];

          const pathData = lineGenerator([fromProjected as [number, number], midPoint, toProjected as [number, number]]);

          if (pathData) {
            svg.append('path')
              .attr('d', pathData)
              .attr('stroke', '#6b7280')
              .attr('stroke-width', 2)
              .attr('fill', 'none')
              .attr('opacity', 0.7)
              .style('stroke-dasharray', '5,5');
          }

          // Add departure point
          svg.append('circle')
            .attr('cx', fromProjected[0])
            .attr('cy', fromProjected[1])
            .attr('r', 4)
            .attr('fill', '#ef4444')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

          // Add arrival point
          svg.append('circle')
            .attr('cx', toProjected[0])
            .attr('cy', toProjected[1])
            .attr('r', 4)
            .attr('fill', '#10b981')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

          // Add visitor info at the midpoint
          const visitorGroup = svg.append('g')
            .attr('class', 'visitor-info')
            .attr('transform', `translate(${midPoint[0]}, ${midPoint[1]})`);

          // Photo circle background
          visitorGroup.append('circle')
            .attr('r', 25)
            .attr('fill', '#1f2937')
            .attr('stroke', '#6b7280')
            .attr('stroke-width', 2);

          // Visitor photo (using a foreign object for HTML img)
          visitorGroup.append('foreignObject')
            .attr('x', -20)
            .attr('y', -20)
            .attr('width', 40)
            .attr('height', 40)
            .html(`
              <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #374151;">
                <img src="${visitor.photo_path}" 
                     style="width: 100%; height: 100%; object-fit: cover;" 
                     alt="${visitor.name}"
                     onerror="this.style.display='none'"
                />
              </div>
            `);

          // Visitor name and date
          const infoBox = visitorGroup.append('g')
            .attr('class', 'info-box')
            .style('opacity', 0);

          const rect = infoBox.append('rect')
            .attr('x', -60)
            .attr('y', 35)
            .attr('width', 120)
            .attr('height', 60)
            .attr('fill', '#1f2937')
            .attr('stroke', '#6b7280')
            .attr('stroke-width', 1)
            .attr('rx', 8);

          infoBox.append('text')
            .attr('x', 0)
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .attr('fill', '#f8fafc')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .text(visitor.name);

          infoBox.append('text')
            .attr('x', 0)
            .attr('y', 65)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '10px')
            .text(`${visitor.hometown} → ${visitor.current_city}`);

          infoBox.append('text')
            .attr('x', 0)
            .attr('y', 80)
            .attr('text-anchor', 'middle')
            .attr('fill', '#64748b')
            .attr('font-size', '9px')
            .text(new Date(visitor.created_at).toLocaleDateString());

          // Add hover interactions
          visitorGroup
            .style('cursor', 'pointer')
            .on('mouseenter', function() {
              infoBox.transition().duration(200).style('opacity', 1);
            })
            .on('mouseleave', function() {
              infoBox.transition().duration(200).style('opacity', 0);
            });
        }
      }
    });
  }

  // Reactive statement to redraw when visitors change
  $: if (svg && visitors) {
    // Clear existing visitor elements
    svg.selectAll('.visitor-info').remove();
    svg.selectAll('path[stroke="#6b7280"]').remove();
    svg.selectAll('circle[fill="#ef4444"], circle[fill="#10b981"]').remove();
    
    // Redraw with new data
    const projection = d3.geoNaturalEarth1()
      .scale(190)
      .translate([width / 2, height / 2]);
    drawVisitorJourneys(projection);
  }
</script>

<div class="w-full bg-base-100 rounded-xl overflow-hidden shadow-2xl border border-base-300">
  <div class="p-6 bg-gradient-to-r from-primary to-secondary">
    <h2 class="text-2xl font-bold text-primary-content">Visitor Journey Map</h2>
    <p class="text-primary-content/80 mt-2">Tracking journeys from hometown to current city</p>
  </div>
  
  <div class="relative">
    <div bind:this={mapContainer} class="w-full overflow-hidden"></div>
    
    {#if visitors.length === 0}
      <div class="absolute inset-0 flex items-center justify-center bg-base-200/50">
        <div class="text-center p-8">
          <div class="text-6xl mb-4">🗺️</div>
          <h3 class="text-xl font-semibold text-base-content mb-2">No journeys yet</h3>
          <p class="text-base-content/60">Add your journey to see it on the map!</p>
        </div>
      </div>
    {/if}
  </div>
  
  <div class="p-4 bg-base-200 flex justify-center gap-6 text-sm">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-error"></div>
      <span>Hometown</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-success"></div>
      <span>Current City</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-8 h-0.5 bg-primary"></div>
      <span>Journey Path</span>
    </div>
  </div>
</div>

<style>
  :global(.visitor-info) {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }
</style>
