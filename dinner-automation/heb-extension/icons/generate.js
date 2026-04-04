/**
 * Icon Generator Script
 * Creates PNG icons for the Chrome extension
 */

const fs = require('fs');
const path = require('path');

// Simple PNG encoder (creates valid PNG files with solid colors)
function createSimplePNG(width, height, color) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(17);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrCrc = crc32(ihdr.slice(0, 13));
  ihdr.writeUInt32BE(ihdrCrc, 13);
  
  // IDAT chunk (compressed image data)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      rawData.push(color.r, color.g, color.b);
    }
  }
  
  const compressed = require('zlib').deflateSync(Buffer.from(rawData));
  const idat = Buffer.concat([
    Buffer.alloc(4), // length
    Buffer.from('IDAT'),
    compressed
  ]);
  idat.writeUInt32BE(compressed.length, 0);
  const idatCrc = crc32(idat.slice(4, 4 + 4 + compressed.length));
  const idatWithCrc = Buffer.concat([idat, Buffer.alloc(4)]);
  idatWithCrc.writeUInt32BE(idatCrc, idatWithCrc.length - 4);
  
  // IEND chunk
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([signature, createChunk('IHDR', ihdr.slice(0, 13)), idatWithCrc, iend]);
}

function createChunk(type, data) {
  const chunk = Buffer.concat([
    Buffer.alloc(4),
    Buffer.from(type),
    data
  ]);
  chunk.writeUInt32BE(data.length, 0);
  const crc = crc32(chunk.slice(4));
  return Buffer.concat([chunk, Buffer.alloc(4)]).map((b, i) => i < chunk.length ? chunk[i] : (i === chunk.length ? (crc >> 24) : i === chunk.length + 1 ? (crc >> 16) : i === chunk.length + 2 ? (crc >> 8) : crc) & 0xFF);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create icons with HEB red color
const hebRed = { r: 220, g: 38, b: 38 };

const sizes = [16, 48, 128];
const iconsDir = __dirname;

sizes.forEach(size => {
  const png = createSimplePNG(size, size, hebRed);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png`);
});

console.log('All icons created successfully!');
