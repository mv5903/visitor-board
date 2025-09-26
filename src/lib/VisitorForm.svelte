<script lang="ts">
    import { get } from 'http';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let name = '';
  let hometown = '';
  let currentCity = '';
  // Get today's date in local timezone
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  let visitDate = `${year}-${month}-${day}`;
  let photoFile: File | null = null;
  let photoPreview = '';
  let isSubmitting = false;
  let errorMessage = '';
  let hometownSuggestions: any[] = [];
  let currentSuggestions: any[] = [];
  let showHometownSuggestions = false;
  let showCurrentSuggestions = false;
  let hometownSelected = false;
  let currentCitySelected = false;
  let showPreviewModal = false;
  let previewImage = '';
  let tempPhotoPath = '';
  let isGeneratingPreview = false;

  function handlePhotoSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      photoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit() {
    if (!name || !hometown || !currentCity || !visitDate || !photoFile) {
      errorMessage = 'Please fill in all fields and select a photo';
      return;
    }

    if (!hometownSelected) {
      errorMessage = 'Please search for and select your hometown from the suggestions list';
      return;
    }

    if (!currentCitySelected) {
      errorMessage = 'Please search for and select your current location from the suggestions list';
      return;
    }

    // Generate preview first
    await generatePreview();
  }

  async function generatePreview() {
    isGeneratingPreview = true;
    errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('hometown', hometown);
      formData.append('current_city', currentCity);
      formData.append('visit_date', visitDate);
      formData.append('photo', photoFile);

      const response = await fetch('/api/preview', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate preview');
      }

      const result = await response.json();
      previewImage = result.preview;
      tempPhotoPath = result.tempPhotoPath;
      showPreviewModal = true;

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'An error occurred generating preview';
    } finally {
      isGeneratingPreview = false;
    }
  }

  async function submitFinal() {
    isSubmitting = true;
    errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('hometown', hometown);
      formData.append('current_city', currentCity);
      formData.append('visit_date', visitDate);
      formData.append('temp_photo_path', tempPhotoPath);

      const response = await fetch('/api/visitors', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit');
      }

      // Reset form
      name = '';
      hometown = '';
      currentCity = '';
      visitDate = '';
      photoFile = null;
      photoPreview = '';
      hometownSelected = false;
      currentCitySelected = false;
      showPreviewModal = false;
      previewImage = '';
      tempPhotoPath = '';

      // Dispatch success event
      dispatch('submitted');

      alert("Thank you, your journey has been added!");

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'An error occurred';
    } finally {
      isSubmitting = false;
    }
  }

  function closePreview() {
    showPreviewModal = false;
    previewImage = '';
    tempPhotoPath = '';
  }

  // Search for location suggestions
  async function searchLocations(query: string) {
    if (query.length < 3) return [];
    
    try {
      const response = await fetch(`/api/search/${encodeURIComponent(query)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    }
    return [];
  }

  // Manual search for hometown
  async function searchHometownLocations() {
    if (hometown.length >= 3) {
      hometownSuggestions = await searchLocations(hometown);
      showHometownSuggestions = hometownSuggestions.length > 0;
      showCurrentSuggestions = false; // Hide other dropdown
    }
  }

  // Manual search for current city
  async function searchCurrentLocations() {
    if (currentCity.length >= 3) {
      currentSuggestions = await searchLocations(currentCity);
      showCurrentSuggestions = currentSuggestions.length > 0;
      showHometownSuggestions = false; // Hide other dropdown
    }
  }

  function selectHometownSuggestion(suggestion: any) {
    hometown = suggestion.display;
    hometownSelected = true;
    showHometownSuggestions = false;
  }

  function selectCurrentSuggestion(suggestion: any) {
    currentCity = suggestion.display;
    currentCitySelected = true;
    showCurrentSuggestions = false;
  }

  // Reset selection flags when user manually edits
  function handleHometownChange() {
    hometownSelected = false;
  }

  function handleCurrentChange() {
    currentCitySelected = false;
  }

  // Handle blur events to close dropdowns
  function handleBlur() {
    setTimeout(() => {
      showHometownSuggestions = false;
      showCurrentSuggestions = false;
    }, 150);
  }

  // Handle mousedown on suggestions to prevent blur
  function handleSuggestionMouseDown(event: Event) {
    event.preventDefault();
  }

</script>

<div class="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
  <div class="p-6 space-y-6">
    <div class="space-y-2 text-center">
      <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Share Your Journey</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">Add your location to my scratch-off world map!</p>
    </div>

    {#if errorMessage}
      <div class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
          </div>
        </div>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Photo Upload -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-900 dark:text-gray-50" for="photo">
          Your Photo
        </label>
        <div class="flex flex-col items-center space-y-4">
          <div class="relative">
            {#if photoPreview}
              <img src={photoPreview} alt="Preview" class="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
            {:else}
              <div class="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            {/if}
          </div>
          <div class="relative">
            <input
              id="photo"
              type="file"
              accept="image/*"
              on:change={handlePhotoSelect}
              class="sr-only"
              required
            />
            <label for="photo" class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 cursor-pointer">
              <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose photo
            </label>
          </div>
        </div>
      </div>

      <!-- Name Input -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-900 dark:text-gray-50" for="name">
          Your Name
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400">How do you want to be remembered?</p>
        <input
          id="name"
          type="text"
          bind:value={name}
          placeholder="Enter your name"
          class="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          required
          autocomplete="off"
        />
      </div>

      <!-- Hometown Input -->
      <div class="space-y-2 relative">
        <label class="text-sm font-medium text-gray-900 dark:text-gray-50" for="hometown">
          Hometown
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400">Where do you call home?</p>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              id="hometown"
              type="text"
              bind:value={hometown}
              on:input={handleHometownChange}
              on:blur={handleBlur}
              placeholder="Enter your hometown"
              class="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 {hometownSelected ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400"
              required
              autocomplete="off"
            />
            {#if hometownSelected}
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="h-4 w-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            {/if}
          </div>
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 h-10 px-3"
            on:click={searchHometownLocations}
            disabled={hometown.length < 3}
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {#if showHometownSuggestions}
          <div class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-auto">
            {#each hometownSuggestions as suggestion}
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none first:rounded-t-md last:rounded-b-md"
                on:mousedown={handleSuggestionMouseDown}
                on:click={() => selectHometownSuggestion(suggestion)}
              >
                {suggestion.display}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Current City Input -->
      <div class="space-y-2 relative">
        <label class="text-sm font-medium text-gray-900 dark:text-gray-50" for="current-city">
          Current Location
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400">Where do you live now?</p>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              id="current-city"
              type="text"
              bind:value={currentCity}
              on:input={handleCurrentChange}
              on:blur={handleBlur}
              placeholder="Enter your current location"
              class="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 {currentCitySelected ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400"
              required
              autocomplete="off"
            />
            {#if currentCitySelected}
              <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg class="h-4 w-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            {/if}
          </div>
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 h-10 px-3"
            on:click={searchCurrentLocations}
            disabled={currentCity.length < 3}
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {#if showCurrentSuggestions}
          <div class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-auto">
            {#each currentSuggestions as suggestion}
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none first:rounded-t-md last:rounded-b-md"
                on:mousedown={handleSuggestionMouseDown}
                on:click={() => selectCurrentSuggestion(suggestion)}
              >
                {suggestion.display}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Visit Date Input -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-900 dark:text-gray-50" for="visit-date">
          Date of First Visit
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400">When did you first visit this place?</p>
        <input
          id="visit-date"
          type="date"
          bind:value={visitDate}
          class="flex h-10 w-1/2 mx-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          required
        />
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="inline-flex w-full items-center justify-center rounded-md bg-gray-900 dark:bg-gray-50 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 shadow transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
        disabled={isSubmitting || isGeneratingPreview}
      >
        {#if isGeneratingPreview}
          <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generating Preview...
        {:else if isSubmitting}
          <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Submitting...
        {:else}
          <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview Your Journey
        {/if}
      </button>
    </form>
  </div>
</div>

<!-- Preview Modal -->
{#if showPreviewModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-w-sm w-full max-h-[85vh] overflow-y-auto">
      <div class="p-4 space-y-3">
        <!-- Modal Header -->
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-50">Preview Your Card</h3>
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            on:click={closePreview}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Preview Image -->
        <div class="flex justify-center">
          <img src={previewImage} alt="Journey Card Preview" class="border border-gray-200 dark:border-gray-700 rounded max-w-full h-auto" style="max-height: 300px;" />
        </div>

        <!-- Description and Disclaimer -->
        <div class="space-y-2">
          <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
            This is how your card will appear on my scratch-off world map!
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <button
            on:click={closePreview}
            class="flex-1 inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
          >
            <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Make Changes
          </button>
          <button
            on:click={submitFinal}
            disabled={isSubmitting}
            class="flex-1 inline-flex items-center justify-center rounded-md bg-gray-900 dark:bg-gray-50 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 shadow transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {#if isSubmitting}
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white dark:text-gray-900" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            {:else}
              <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Looks Perfect!
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

