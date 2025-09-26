import fetch from 'node-fetch';

class GeocodingService {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.cache = new Map(); // Simple in-memory cache
    this.lastRequestTime = 0;
    this.requestDelay = 1000; // 1 second delay between requests to respect rate limits
  }

  // Add delay to respect Nominatim rate limits
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  // Geocode a location (city, state, country)
  async geocode(location) {
    const cacheKey = location.toLowerCase().trim();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`📋 Cache hit for: ${location}`);
      return this.cache.get(cacheKey);
    }

    // Respect rate limits
    await this.waitForRateLimit();

    try {
      const encodedLocation = encodeURIComponent(location);
      const url = `${this.baseUrl}/search?q=${encodedLocation}&format=json&limit=1&addressdetails=1`;
      
      console.log(`🌍 Geocoding: ${location}`);
      console.log(`🔗 URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VisitorBoard/1.0 (https://visit.mattvandenberg.com:3000)' // Required by Nominatim
        }
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Results found: ${data.length}`);
      
      if (data && data.length > 0) {
        const result = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          display_name: data[0].display_name,
          city: this.extractCity(data[0]),
          state: this.extractState(data[0]),
          country: this.extractCountry(data[0])
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        
        console.log(`✅ Geocoded ${location} -> ${result.latitude}, ${result.longitude}`);
        return result;
      }
      
      console.log(`❌ No results for: ${location}`);
      return null;
    } catch (error) {
      console.error(`❌ Geocoding error for "${location}":`, error.message);
      return null;
    }
  }

  // Extract city from Nominatim result
  extractCity(data) {
    return data.address?.city || 
           data.address?.town || 
           data.address?.village || 
           data.address?.hamlet || 
           data.name || 
           'Unknown';
  }

  // Extract state from Nominatim result
  extractState(data) {
    return data.address?.state || 
           data.address?.province || 
           data.address?.region ||
           data.address?.county ||
           'Unknown';
  }

  // Extract country from Nominatim result
  extractCountry(data) {
    return data.address?.country || 'Unknown';
  }

  // Search for suggestions based on partial input
  async searchSuggestions(query, limit = 5) {
    if (query.length < 3) return [];

    // Respect rate limits
    await this.waitForRateLimit();

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encodedQuery}&format=json&limit=${limit}&addressdetails=1`;
      
      console.log(`🔍 Searching suggestions for: ${query}`);
      console.log(`🔗 URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VisitorBoard/1.0 (https://visit.mattvandenberg.com:3000)'
        }
      });

      console.log(`📡 Search response status: ${response.status}`);

      if (!response.ok) {
        console.error(`❌ Search API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      console.log(`📊 Search results found: ${data.length}`);
      
      return data.map(item => ({
        display: this.formatDisplayName(item),
        city: this.extractCity(item),
        state: this.extractState(item),
        country: this.extractCountry(item),
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon)
      }));
    } catch (error) {
      console.error('❌ Search suggestions error:', error);
      return [];
    }
  }

  // Format display name for suggestions
  formatDisplayName(item) {
    const city = this.extractCity(item);
    const state = this.extractState(item);
    const country = this.extractCountry(item);
    
    // For international locations
    if (country !== 'United States' && country !== 'Unknown') {
      if (city !== 'Unknown' && state !== 'Unknown') {
        return `${city}, ${state}, ${country}`;
      } else if (city !== 'Unknown') {
        return `${city}, ${country}`;
      } else {
        return item.display_name.split(',').slice(0, 3).join(',').trim();
      }
    }
    
    // For US locations (keep original format)
    if (city !== 'Unknown' && state !== 'Unknown') {
      return `${city}, ${state}`;
    } else if (city !== 'Unknown') {
      return `${city}, ${country}`;
    } else {
      return item.display_name.split(',').slice(0, 2).join(',').trim();
    }
  }

  // Validate a location by geocoding it
  async validateLocation(location) {
    const result = await this.geocode(location);
    return result !== null;
  }

  // Get coordinates for a location
  async getCoordinates(location) {
    const result = await this.geocode(location);
    return result ? {
      latitude: result.latitude,
      longitude: result.longitude,
      display: result.display_name
    } : null;
  }

  // Clear cache (useful for testing)
  clearCache() {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize() {
    return this.cache.size;
  }
}

// Create singleton instance
const geocodingService = new GeocodingService();

export default geocodingService;
