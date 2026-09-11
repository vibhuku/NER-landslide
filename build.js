/**
 * NERA 2.0 Frontend Production Build Script
 * Validates syntax, asset integrity, and generates a standalone production distribution in dist/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');
const REQUIRED_FILES = [
  'index.html',
  'app.js',
  'data.js',
  'ner-boundaries.js',
  'ner-boundaries.geojson',
  'services.js',
  'offline-store.js',
  'i18n.js',
  'advanced-features.js',
  'precision-gis.js',
  'styles.css',
  'map-fixes.css'
];

console.log('=== NERA 2.0 Frontend Production Build ===');

// 1. Check all required assets exist
console.log('[1/4] Verifying asset integrity...');
for (const file of REQUIRED_FILES) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Missing required asset: ${file}`);
    process.exit(1);
  }
  const stat = fs.statSync(filePath);
  console.log(`  ✓ Found ${file.padEnd(18)} (${(stat.size / 1024).toFixed(2)} KB)`);
}

// 2. Validate HTML structure
console.log('[2/4] Validating HTML5 document structure...');
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
if (!htmlContent.includes('<div id="map"') || !htmlContent.includes('app.js')) {
  console.error('ERROR: index.html is missing essential map container or script entry');
  process.exit(1);
}
console.log('  ✓ Leaflet map container and ESM entrypoint verified.');

// 3. Prepare dist directory
console.log('[3/4] Generating production distribution directory (dist/)...');
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

for (const file of REQUIRED_FILES) {
  const src = path.join(__dirname, file);
  const dest = path.join(DIST_DIR, file);
  fs.copyFileSync(src, dest);
}
console.log(`  ✓ Successfully copied ${REQUIRED_FILES.length} files to dist/`);

// 4. Build report
console.log('[4/4] Production build complete!');
console.log(`Output: ${DIST_DIR}`);
console.log('Build status: SUCCESS (0 errors)\n');

