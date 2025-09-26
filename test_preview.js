// Using built-in fetch and FormData in Node.js LTS
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data combinations
const names = [
  // Short names
  'Matt', 'John', 'Sue', 'Bo', 'Li', 'Max',
  // Medium names
  'Matthew', 'Jennifer', 'Christopher', 'Elizabeth', 'Michael',
  // Long names
  'Christopher Alexander', 'Mary Elizabeth Johnson', 'Jean-Baptiste',
  // Very long names
  'Maria Isabel Gonzalez Rodriguez', 'Alexander Christopher Montgomery',
  // Special characters
  'José María', 'François-Xavier', 'O\'Connor', 'D\'Angelo',
  // International names
  'Björn', 'Müller', 'Søren', 'Chloé', 'Mikhail Alexandrovich'
];

const cities = [
  // Short city names
  'NYC', 'LA', 'DC', 'SF',
  // Medium cities
  'Boston', 'Chicago', 'Denver', 'Miami', 'Seattle',
  // Long city names
  'San Francisco', 'New Orleans', 'Philadelphia', 'Minneapolis',
  // Very long city names
  'San Francisco, California', 'New York City, New York', 'Los Angeles, California',
  // International cities
  'São Paulo, Brazil', 'Buenos Aires, Argentina', 'Saint-Tropez, France',
  // Really long combinations
  'Saint-Jean-de-Luz, Pyrénées-Atlantiques, France',
  'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch, Wales',
  'San Bernardino County, California, United States',
  // Edge cases
  'A', 'Supercalifragilisticexpialidocious City, State, Country'
];

// Function to get a random test image from existing uploads
function getRandomTestImage() {
  const uploadsDir = path.join(__dirname, 'public/uploads');

  // Try to use existing uploaded images first
  if (fs.existsSync(uploadsDir)) {
    const existingImages = fs.readdirSync(uploadsDir).filter(file =>
      file.toLowerCase().endsWith('.jpg') ||
      file.toLowerCase().endsWith('.jpeg') ||
      file.toLowerCase().endsWith('.png')
    );

    if (existingImages.length > 0) {
      return {
        filename: existingImages[Math.floor(Math.random() * existingImages.length)],
        useUploads: true
      };
    }
  }

  // Fallback to test images
  const testImages = [
    'test-photo-1.jpg',
    'test-photo-2.jpg',
    'test-photo-3.jpg'
  ];
  return {
    filename: testImages[Math.floor(Math.random() * testImages.length)],
    useUploads: false
  };
}

// Function to create a simple test image if none exist
function createTestImage(filename) {
  // Create a minimal valid JPEG file (1x1 pixel)
  const minimalJpeg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
    0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
    0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
    0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
    0x00, 0x00, 0xFF, 0xD9
  ]);

  fs.writeFileSync(path.join(__dirname, 'public/test-images', filename), minimalJpeg);
}

// Ensure test images directory exists
const testImagesDir = path.join(__dirname, 'public/test-images');
if (!fs.existsSync(testImagesDir)) {
  fs.mkdirSync(testImagesDir, { recursive: true });
}

// Create test images if they don't exist
function setupTestImages() {
  for (let i = 1; i <= 3; i++) {
    const filename = `test-photo-${i}.jpg`;
    const filepath = path.join(testImagesDir, filename);
    if (!fs.existsSync(filepath)) {
      createTestImage(filename);
    }
  }
}

async function testPreviewAPI() {
  console.log('🚀 Starting comprehensive preview API test...\n');

  // Setup test images first
  setupTestImages();
  console.log('📸 Test images ready\n');

  const results = [];
  const errors = [];

  for (let i = 1; i <= 100; i++) {
    try {
      // Get random combinations
      const name = names[Math.floor(Math.random() * names.length)];
      const hometown = cities[Math.floor(Math.random() * cities.length)];
      const currentCity = cities[Math.floor(Math.random() * cities.length)];
      const imageInfo = getRandomTestImage();

      let testImagePath;
      if (imageInfo.useUploads) {
        testImagePath = path.join(__dirname, 'public/uploads', imageInfo.filename);
      } else {
        testImagePath = path.join(testImagesDir, imageInfo.filename);
      }

      console.log(`Test ${i}/100: ${name} | ${hometown} → ${currentCity}`);

      // Create form data
      const formData = new FormData();
      formData.append('name', name);
      formData.append('hometown', hometown);
      formData.append('current_city', currentCity);

      // Read the image file as a Blob for the built-in FormData
      const imageBuffer = fs.readFileSync(testImagePath);
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('photo', imageBlob, imageInfo.filename);

      // Make API call
      const response = await fetch('http://10.0.2.36:3001/api/preview', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Save the generated image
      const base64Data = result.preview.replace(/^data:image\/png;base64,/, '');
      const outputPath = path.join(__dirname, 'test-output', `test-${String(i).padStart(3, '0')}.png`);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, base64Data, 'base64');

      results.push({
        testNumber: i,
        name,
        hometown,
        currentCity,
        outputFile: outputPath,
        success: true
      });

      console.log(`   ✅ Generated: ${outputPath}`);

    } catch (error) {
      console.error(`   ❌ Test ${i} failed:`, error.message);
      errors.push({
        testNumber: i,
        error: error.message
      });
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Successful tests: ${results.length}`);
  console.log(`❌ Failed tests: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(error => {
      console.log(`   Test ${error.testNumber}: ${error.error}`);
    });
  }

  // Write results to JSON file
  const summaryPath = path.join(__dirname, 'test-output', 'test-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    totalTests: 100,
    successful: results.length,
    failed: errors.length,
    results,
    errors
  }, null, 2));

  console.log(`\n📝 Full results saved to: ${summaryPath}`);
  console.log(`🖼️  Generated images saved to: ${path.join(__dirname, 'test-output')}`);

  // Print some interesting test cases
  console.log('\n🔍 Notable test cases:');
  const longNameTests = results.filter(r => r.name.length > 20);
  const longLocationTests = results.filter(r => (r.hometown + r.currentCity).length > 60);

  if (longNameTests.length > 0) {
    console.log(`   📏 Long names tested: ${longNameTests.length}`);
    longNameTests.slice(0, 3).forEach(test => {
      console.log(`      "${test.name}" (${test.name.length} chars)`);
    });
  }

  if (longLocationTests.length > 0) {
    console.log(`   🌍 Long locations tested: ${longLocationTests.length}`);
    longLocationTests.slice(0, 3).forEach(test => {
      console.log(`      "${test.hometown} → ${test.currentCity}"`);
    });
  }
}

// Run the test
testPreviewAPI().catch(console.error);