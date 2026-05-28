#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LIMIT_BYTES = 358400; // 350 KB in bytes

const distAssets = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(distAssets)) {
  console.error('ERROR: dist/assets directory not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssets);
const mainChunks = files.filter(f => /^index-[^.]+\.js$/.test(f));

if (mainChunks.length === 0) {
  console.error('ERROR: No main bundle (index-*.js) found in dist/assets/.');
  console.error('Available files:', files.join(', '));
  process.exit(1);
}

let largest = 0;
let largestFile = '';

for (const chunk of mainChunks) {
  const full = path.join(distAssets, chunk);
  const raw = fs.readFileSync(full);
  const gzipped = zlib.gzipSync(raw, { level: 9 });
  const sizeKb = (gzipped.length / 1024).toFixed(1);
  console.log(`  ${chunk}: ${gzipped.length} bytes gzipped (${sizeKb} KB)`);
  if (gzipped.length > largest) {
    largest = gzipped.length;
    largestFile = chunk;
  }
}

const limitKb = (LIMIT_BYTES / 1024).toFixed(0);
if (largest > LIMIT_BYTES) {
  console.error(
    `\nFAIL: ${largestFile} is ${largest} bytes gzipped (${(largest / 1024).toFixed(1)} KB), ` +
    `exceeds the ${limitKb} KB limit (${LIMIT_BYTES} bytes).`
  );
  process.exit(1);
}

console.log(
  `\nPASS: largest main bundle is ${largest} bytes gzipped (${(largest / 1024).toFixed(1)} KB), ` +
  `within the ${limitKb} KB limit.`
);
process.exit(0);
