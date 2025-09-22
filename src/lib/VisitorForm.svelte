<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let name = '';
  let hometown = '';
  let currentCity = '';
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
    if (!name || !hometown || !currentCity || !photoFile) {
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

    isSubmitting = true;
    errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('hometown', hometown);
      formData.append('current_city', currentCity);
      formData.append('photo', photoFile);

      const response = await fetch('http://10.0.0.20:5173/api/visitors', {
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
      photoFile = null;
      photoPreview = '';
      
      // Dispatch success event
      dispatch('submitted');

      alert("Thank you, your journey has been added!");
      // Close tab
      //window.close();

    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'An error occurred';
    } finally {
      isSubmitting = false;
    }
  }

  // Search for location suggestions
  async function searchLocations(query: string) {
    if (query.length < 3) return [];
    
    try {
      const response = await fetch(`http://10.0.0.20:5173/api/search/${encodeURIComponent(query)}`);
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

<div class="card card-bordered bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title text-2xl mb-6">Add Your Journey</h2>

    {#if errorMessage}
      <div class="alert alert-error mb-4">
        <span>{errorMessage}</span>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Photo Upload -->
      <div class="form-group">
        <label class="label" for="photo">
          <span class="label-text text-lg font-medium">Your Photo</span>
        </label>
        <div class="flex flex-col items-center gap-4">
          {#if photoPreview}
            <div class="avatar avatar-xl">
              <div class="">
                <img src={photoPreview} alt="Preview" class="w-full h-full object-cover rounded-full" />
              </div>
            </div>
          {:else}
            <div class="avatar avatar-xl bg-black text-base-content rounded-full">
              <div class="">
                <span class="text-xl"></span>
              </div>
            </div>
          {/if}

          <input
            id="photo"
            type="file"
            accept="image/*"
            on:change={handlePhotoSelect}
            class="input-file w-full max-w-xs"
            required
            autocomplete="off"
          />
        </div>
      </div>

      <!-- Name Input -->
      <div class="form-group">
        <label class="label" for="name">
          <span class="label-text text-lg font-medium">Your Name</span>
        </label>
        <p class="text-gray-400 mb-4"><i>How do you want to be remembered?</i></p>
        <input
          id="name"
          type="text"
          bind:value={name}
          placeholder="Example: Matthew"
          class="input input-bordered w-full text-lg"
          required
          autocomplete="off"
        />
      </div>

      <!-- Hometown Input -->
      <div class="form-group relative">
        <label class="label" for="hometown">
          <span class="label-text text-lg font-medium">Hometown</span>
        </label>
        <p class="text-gray-400 mb-4"><i>Where do you call home?</i></p>
        <div class="flex gap-2">
          <input
            id="hometown"
            type="text"
            bind:value={hometown}
            on:input={handleHometownChange}
            on:blur={handleBlur}
            placeholder="Example: Piscataway, NJ"
            class="input input-bordered w-full text-lg {hometownSelected ? 'input-success' : ''}"
            required
            autocomplete="off"
          />
          <button
            type="button"
            class="btn bg-white"
            on:click={searchHometownLocations}
            disabled={hometown.length < 3}
          >
            🔍
          </button>
        </div>

        {#if showHometownSuggestions}
          <div class="dropdown dropdown-open">
            <div class="dropdown-content menu bg-base-100 rounded-box z-10 max-h-40 w-full overflow-y-auto border border-base-300 shadow-lg">
              {#each hometownSuggestions as suggestion}
                <li>
                  <button
                    type="button"
                    class="w-full text-left"
                    on:mousedown={handleSuggestionMouseDown}
                    on:click={() => selectHometownSuggestion(suggestion)}
                  >
                    {suggestion.display}
                  </button>
                </li>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Current City Input -->
      <div class="form-group relative">
        <label class="label" for="current-city">
          <span class="label-text text-lg font-medium">Current Location</span>
        </label>
        <p class="text-gray-400 mb-4"><i>Where do you live now?</i></p>
        <div class="flex gap-2">
          <input
            id="current-city"
            type="text"
            bind:value={currentCity}
            on:input={handleCurrentChange}
            on:blur={handleBlur}
            placeholder="Example: Milpitas, CA"
            class="input input-bordered w-full text-lg {currentCitySelected ? 'input-success' : ''}"
            required
            autocomplete="off"
          />
          <button
            type="button"
            class="btn bg-white"
            on:click={searchCurrentLocations}
            disabled={currentCity.length < 3}
          >
            🔍
          </button>
        </div>

        {#if showCurrentSuggestions}
          <div class="dropdown dropdown-open">
            <div class="dropdown-content menu bg-base-100 rounded-box z-10 max-h-40 w-full overflow-y-auto border border-base-300 shadow-lg">
              {#each currentSuggestions as suggestion}
                <li>
                  <button
                    type="button"
                    class="w-full text-left"
                    on:mousedown={handleSuggestionMouseDown}
                    on:click={() => selectCurrentSuggestion(suggestion)}
                  >
                    {suggestion.display}
                  </button>
                </li>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Submit Button -->
      <div class="w-full flex justify-center">
          <button
              type="submit"
              class="btn btn-lg bg-black text-center mx-auto"
              disabled={isSubmitting}
          >
          Submit
          </button>
      </div>
    </form>
  </div>
</div>

<style>
  .form-group {
    width: 100%;
    position: relative;
  }

  .label-text {
    opacity: 0.8;
  }

  .input:focus {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }


</style>
