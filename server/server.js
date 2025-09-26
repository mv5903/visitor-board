import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createCanvas, loadImage } from 'canvas';
import { visitorQueries } from './database.js';
import geocodingService from './geocodingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '..')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Function to wrap text to fit within a given width
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Function to generate preview image
async function generatePreviewImage(photoPath, name, hometown, currentCity) {
  const canvas = createCanvas(400, 600);
  const ctx = canvas.getContext('2d');

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    // Load and draw photo (black and white)
    const image = await loadImage(photoPath);

    // Calculate dimensions to fit photo in a square
    const photoSize = 200;
    const photoX = (canvas.width - photoSize) / 2;
    const photoY = 50;

    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw image in grayscale
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage(image, photoX, photoY, photoSize, photoSize);
    ctx.restore();

    // Draw border around photo
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
    ctx.stroke();

    // Set text properties
    ctx.filter = 'none';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    let currentY = photoY + photoSize + 40;
    const maxTextWidth = canvas.width - 40; // 20px margin on each side

    // Draw name with wrapping
    ctx.font = 'bold 24px Arial';
    const nameLines = wrapText(ctx, name, maxTextWidth);
    for (let i = 0; i < nameLines.length; i++) {
      ctx.fillText(nameLines[i], canvas.width / 2, currentY);
      currentY += 30;
    }

    currentY += 10; // Extra spacing after name

    // Draw location info with wrapping
    ctx.font = '18px Arial';
    const locationText = `${hometown} → ${currentCity}`;
    const locationLines = wrapText(ctx, locationText, maxTextWidth);
    for (let i = 0; i < locationLines.length; i++) {
      ctx.fillText(locationLines[i], canvas.width / 2, currentY);
      currentY += 25;
    }

    currentY += 10; // Extra spacing before date

    // Draw date
    ctx.font = '16px Arial';
    const dateText = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    ctx.fillText(dateText, canvas.width / 2, currentY);

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Error generating preview image:', error);
    throw error;
  }
}

// API Routes

// POST /api/preview - Generate preview image
app.post('/api/preview', upload.single('photo'), async (req, res) => {
  try {
    const { name, hometown, current_city } = req.body;

    if (!name || !hometown || !current_city) {
      return res.status(400).json({
        error: 'Name, hometown, and current city are required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Photo is required'
      });
    }

    const photoPath = path.join(__dirname, '../public/uploads', req.file.filename);
    const previewBuffer = await generatePreviewImage(photoPath, name, hometown, current_city);

    // Convert buffer to base64 for frontend display
    const base64Image = previewBuffer.toString('base64');

    res.json({
      preview: `data:image/png;base64,${base64Image}`,
      tempPhotoPath: req.file.filename
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/visitors - Create a new visitor
app.post('/api/visitors', upload.single('photo'), async (req, res) => {
  try {
    const { name, hometown, current_city, temp_photo_path } = req.body;

    if (!name || !hometown || !current_city) {
      return res.status(400).json({
        error: 'Name, hometown, and current city are required'
      });
    }

    let photo_path;

    // If using temp_photo_path (from preview), use that
    if (temp_photo_path) {
      photo_path = `/uploads/${temp_photo_path}`;
    }
    // Otherwise, expect a new file upload
    else if (req.file) {
      photo_path = `/uploads/${req.file.filename}`;
    }
    else {
      return res.status(400).json({
        error: 'Photo is required'
      });
    }

    const result = visitorQueries.insert.run(name, hometown, current_city, photo_path);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Visitor created successfully'
    });
  } catch (error) {
    console.error('Error creating visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/visitors - Get all visitors with coordinates
app.get('/api/visitors', async (req, res) => {
  try {
    const visitors = visitorQueries.selectAll.all();
    
    // Add coordinate data for each visitor
    const visitorsWithCoords = await Promise.all(
      visitors.map(async (visitor) => {
        const hometownData = await geocodingService.getCoordinates(visitor.hometown);
        const currentData = await geocodingService.getCoordinates(visitor.current_city);
        
        return {
          ...visitor,
          hometown_coords: hometownData,
          current_coords: currentData,
          hometown_display: visitor.hometown,
          current_display: visitor.current_city
        };
      })
    );
    
    res.json(visitorsWithCoords);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/visitors/:id - Get visitor by ID
app.get('/api/visitors/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const visitor = visitorQueries.selectById.get(id);
    
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    
    res.json(visitor);
  } catch (error) {
    console.error('Error fetching visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/visitors/:id - Delete visitor by ID
app.delete('/api/visitors/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = visitorQueries.deleteById.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    
    res.json({ message: 'Visitor deleted successfully' });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/geocode/:location - Get coordinates for a location
app.get('/api/geocode/:location', async (req, res) => {
  try {
    const location = decodeURIComponent(req.params.location);
    const coordinates = await geocodingService.getCoordinates(location);
    
    if (!coordinates) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(coordinates);
  } catch (error) {
    console.error('Error geocoding location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search/:query - Search for location suggestions
app.get('/api/search/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const suggestions = await geocodingService.searchSuggestions(query);
    res.json(suggestions);
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/validate/:location - Validate a location
app.get('/api/validate/:location', async (req, res) => {
  try {
    const location = decodeURIComponent(req.params.location);
    const isValid = await geocodingService.validateLocation(location);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('Error validating location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  res.status(500).json({ error: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://10.0.2.36:${PORT}`);
});

export default app;
