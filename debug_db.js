import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'visitor_board.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);
const visitors = db.prepare('SELECT * FROM visitors ORDER BY created_at DESC').all();

console.log('=== Direct Database Query ===');
console.log('Visitors in database:', visitors.length);
visitors.forEach(visitor => {
  console.log(`ID: ${visitor.id}, Name: ${visitor.name}, Created: ${visitor.created_at}`);
});

db.close();