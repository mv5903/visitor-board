import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'visitor_board.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create visitors table
const createVisitorsTable = `
  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hometown TEXT NOT NULL,
    current_city TEXT NOT NULL,
    visit_date DATE NOT NULL,
    photo_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.exec(createVisitorsTable);

// Add visit_date column if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE visitors ADD COLUMN visit_date DATE');
} catch (error) {
  // Column already exists, ignore error
}

export const visitorQueries = {
  // Insert a new visitor
  insert: db.prepare(`
    INSERT INTO visitors (name, hometown, current_city, visit_date, photo_path)
    VALUES (?, ?, ?, ?, ?)
  `),

  // Get all visitors
  selectAll: db.prepare(`
    SELECT * FROM visitors ORDER BY created_at DESC
  `),

  // Get visitor by id
  selectById: db.prepare(`
    SELECT * FROM visitors WHERE id = ?
  `),

  // Delete visitor by id
  deleteById: db.prepare(`
    DELETE FROM visitors WHERE id = ?
  `)
};

export default db;
