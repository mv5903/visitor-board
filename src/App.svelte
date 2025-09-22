<script lang="ts">
  import { onMount } from 'svelte';
  import VisitorForm from './lib/VisitorForm.svelte';
  import MapboxMap from './lib/MapboxMap.svelte';

  let visitors: any[] = [];
  let isLoading = true;
  let isMobile = false;
  // Removed activeTab - using isMobile detection only
  let currentVisitorPage = 0;
  let slideInterval: NodeJS.Timeout;

  // Mobile detection function
  function checkIfMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  async function loadVisitors() {
    try {
      const response = await fetch('http://10.0.2.36:3001/api/visitors');
      if (response.ok) {
        visitors = await response.json();
      }
    } catch (error) {
      console.error('Error loading visitors:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleVisitorSubmitted() {
    // Reload visitors when a new one is submitted
    loadVisitors();
    // Reset to first page and restart slideshow on desktop
    if (!isMobile) {
      currentVisitorPage = 0;
      startSlideshow();
    }
  }

  // Removed setActiveTab function - no longer needed

  const VISITORS_PER_PAGE = 5;

  function getVisitorPages() {
    const pages = [];
    for (let i = 0; i < visitors.length; i += VISITORS_PER_PAGE) {
      pages.push(visitors.slice(i, i + VISITORS_PER_PAGE));
    }
    return pages.length > 0 ? pages : [[]];
  }

  function startSlideshow() {
    stopSlideshow(); // Clear any existing interval
    if (visitors.length > VISITORS_PER_PAGE) {
      slideInterval = setInterval(() => {
        const totalPages = Math.ceil(visitors.length / VISITORS_PER_PAGE);
        currentVisitorPage = (currentVisitorPage + 1) % totalPages;
      }, 10000); // 10 seconds
    }
  }

  function stopSlideshow() {
    if (slideInterval) {
      clearInterval(slideInterval);
    }
  }

  onMount(() => {
    // Check if mobile
    isMobile = checkIfMobile();

    // Add resize listener to update mobile detection
    const handleResize = () => {
      const wasMobile = isMobile;
      isMobile = checkIfMobile();

      // Restart slideshow if switching to desktop
      if (wasMobile && !isMobile) {
        startSlideshow();
      }
      // Stop slideshow if switching to mobile
      else if (!wasMobile && isMobile) {
        stopSlideshow();
      }
    };

    window.addEventListener('resize', handleResize);

    loadVisitors();

    // Start slideshow on desktop
    if (!isMobile) {
      startSlideshow();
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      stopSlideshow();
    };
  });

  // Reactive statement to restart slideshow when visitors change on desktop
  $: if (visitors && !isMobile) {
    currentVisitorPage = 0;
    startSlideshow();
  }

  // US state abbreviations
  const stateAbbreviations = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC'
  };

  function abbreviateStates(location: string): string {
    if (!location) return location;

    let abbreviated = location;
    for (const [fullName, abbrev] of Object.entries(stateAbbreviations)) {
      // Replace full state names with abbreviations
      const regex = new RegExp(`\\b${fullName}\\b`, 'gi');
      abbreviated = abbreviated.replace(regex, abbrev);
    }

    return abbreviated;
  }
</script>

<main class="min-h-screen bg-black">
  <!-- Header -->

  <div class="container mx-auto px-4 py-8">
    {#if isLoading}
      <div class="flex justify-center items-center py-20">
        <div class="loading loading-spinner loading-lg text-white"></div>
      </div>
    {:else}
      <!-- Content based on device type -->
      <div class="content">
        {#if !isMobile}
          <!-- Map Tab - Split Layout -->
          <div class="mb-12 -mx-4 flex gap-6">
            <!-- Map Section -->
            <div class="flex-1">
              <MapboxMap {visitors} />
            </div>

            <!-- Recent Visitors Section -->
            <div class="w-80 flex-shrink-0">
              <div class="bg-gray-900 shadow-xl border border-gray-700 rounded-lg h-full">
                <div class="p-6">
                  <h2 class="text-2xl font-bold text-white mb-6">Recent Visitors</h2>

                  {#if visitors.length === 0}
                    <div class="text-center py-8">
                      <div class="text-4xl mb-4">👋</div>
                      <h3 class="text-lg font-semibold text-white mb-2">No visitors yet</h3>
                    </div>
                  {:else}
                    {@const visitorPages = getVisitorPages()}
                    {@const totalPages = visitorPages.length}
                    {@const currentPage = visitorPages[currentVisitorPage] || []}

                    <div class="h-[60vh] flex flex-col">
                      <!-- Page content -->
                      <div class="flex-1 space-y-4 overflow-hidden">
                        {#each currentPage as visitor}
                          <div class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 transition-all duration-500">
                            <div class="avatar flex-shrink-0">
                              <div class="w-10 h-10 rounded-full border border-gray-600">
                                <img src={visitor.photo_path} alt={visitor.name} class="w-full h-full object-cover rounded-full" />
                              </div>
                            </div>

                            <div class="flex-1">
                              <h3 class="font-semibold text-white text-sm">{visitor.name}</h3>
                              <p class="text-xs text-gray-300">
                                {#if visitor.hometown_display === visitor.current_display}
                                  {abbreviateStates(visitor.hometown_display)}
                                {:else}
                                  {abbreviateStates(visitor.hometown_display)} → {abbreviateStates(visitor.current_display)}
                                {/if}
                              </p>
                              <p class="text-xs text-gray-500 mt-1">
                                {new Date(visitor.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        {/each}
                      </div>

                      <!-- Page indicator -->
                      {#if totalPages > 1}
                        <div class="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-700">
                          <span class="text-xs text-gray-500">
                            Page {currentVisitorPage + 1} of {totalPages}
                          </span>
                          <div class="flex gap-1 ml-2">
                            {#each Array(totalPages) as _, i}
                              <div class="w-2 h-2 rounded-full {i === currentVisitorPage ? 'bg-white' : 'bg-gray-600'} transition-colors duration-300"></div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <!-- Mobile Form -->
          <div class="max-w-2xl mx-auto">
            <VisitorForm on:submitted={handleVisitorSubmitted} />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</main>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
  
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .content {
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    :global(.container) {
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }
</style>
