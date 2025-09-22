import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
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

// API Routes

// POST /api/visitors - Create a new visitor
app.post('/api/visitors', upload.single('photo'), async (req, res) => {
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

    const photo_path = `/uploads/${req.file.filename}`;
    
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
