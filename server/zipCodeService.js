import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ZipCodeService {
  constructor() {
    this.zipData = new Map();
    this.isLoaded = false;
  }

  async loadZipData() {
    if (this.isLoaded) return;

    console.log('🔄 Loading zip code data...');
    const csvPath = path.join(__dirname, 'zip-db.csv');
    console.log('📂 CSV path:', csvPath);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found at:', csvPath);
      return;
    }

    return new Promise((resolve, reject) => {
      let rowCount = 0;
      let validRows = 0;
      
      fs.createReadStream(csvPath)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          rowCount++;
          const zipCode = row['Zip Code'];
          const city = row['Official USPS city name'];
          const state = row['Official USPS State Code'];
          const geoPoint = row['Geo Point'];
          
          if (zipCode && geoPoint && geoPoint.includes(',')) {
            // Parse coordinates from "latitude, longitude" format
            const coords = geoPoint.split(',');
            if (coords.length === 2) {
              const lat = parseFloat(coords[0].trim());
              const lng = parseFloat(coords[1].trim());
              
              if (!isNaN(lat) && !isNaN(lng)) {
                this.zipData.set(zipCode, {
                  zipCode,
                  city: city || 'Unknown',
                  state: state || 'Unknown',
                  latitude: lat,
                  longitude: lng
                });
                validRows++;
              }
            }
          }
          
          if (rowCount <= 5) {
            console.log(`Row ${rowCount}:`, { zipCode, city, state, geoPoint });
          }
        })
        .on('end', () => {
          this.isLoaded = true;
          console.log(`🗺️  Loaded ${this.zipData.size} zip codes from ${rowCount} total rows (${validRows} valid)`);
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ Error loading zip data:', error);
          reject(error);
        });
    });
  }

  getCoordinates(zipCode) {
    if (!this.isLoaded) {
      throw new Error('Zip data not loaded. Call loadZipData() first.');
    }
    
    return this.zipData.get(zipCode) || null;
  }

  getCityState(zipCode) {
    const data = this.getCoordinates(zipCode);
    return data ? `${data.city}, ${data.state}` : null;
  }

  // Search for zip codes by city/state (for suggestions)
  searchByCityState(query) {
    if (!this.isLoaded) return [];
    
    const searchQuery = query.toLowerCase();
    const results = [];
    
    for (const [zipCode, data] of this.zipData) {
      const cityState = `${data.city}, ${data.state}`.toLowerCase();
      if (cityState.includes(searchQuery)) {
        results.push({
          zipCode,
          city: data.city,
          state: data.state,
          display: `${data.city}, ${data.state} (${zipCode})`
        });
      }
      
      // Limit results to prevent overwhelming response
      if (results.length >= 10) break;
    }
    
    return results;
  }

  // Validate if a zip code exists
  isValidZipCode(zipCode) {
    return this.zipData.has(zipCode);
  }
}

// Create singleton instance
const zipCodeService = new ZipCodeService();

export default zipCodeService;
