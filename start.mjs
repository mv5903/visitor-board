#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Visitor Board Application...\n');

// Start the backend server
console.log('📦 Starting backend server...');
const serverProcess = spawn('node', ['--loader', 'ts-node/esm', 'server/server.ts'], {
  cwd: __dirname,
  stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

// Wait a moment for server to start, then start Vite
setTimeout(() => {
  console.log('🎨 Starting frontend development server...');
  const viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  viteProcess.stdout.on('data', (data) => {
    console.log(`[VITE] ${data.toString().trim()}`);
  });

  viteProcess.stderr.on('data', (data) => {
    console.error(`[VITE ERROR] ${data.toString().trim()}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    serverProcess.kill('SIGINT');
    viteProcess.kill('SIGINT');
    process.exit(0);
  });

  viteProcess.on('close', (code) => {
    console.log(`Vite process exited with code ${code}`);
    serverProcess.kill('SIGINT');
    process.exit(code);
  });

}, 2000);

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});
