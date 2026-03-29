import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const files = [
  'Mobile 1.png',
  'Mobile 2.png',
  'Mobile 3.jpeg'
];

async function convert() {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const basename = file.split('.')[0];
    const inputPath = path.join('public', file);
    const outputPath = path.join('public', basename + '.webp');
    console.log(`Converting ${file}...`);
    await sharp(inputPath).webp({ quality: 85 }).toFile(outputPath);
    console.log(`Saved ${basename}.webp`);
    
    // Cleanup old file
    fs.unlinkSync(inputPath);
  }
  console.log('Mobile WebP conversion complete.');
}

convert().catch(console.error);
