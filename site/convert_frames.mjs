import sharp from 'sharp';
import { readdir, mkdir, stat } from 'fs/promises';
import { join } from 'path';

const INPUT_DIR = '../ScrollAnimationIMG';
const OUTPUT_DIR = '../ScrollAnimationIMG_webp';

async function convert() {
    await mkdir(OUTPUT_DIR, { recursive: true });

    const files = (await readdir(INPUT_DIR))
        .filter(f => f.endsWith('.png'))
        .sort();

    console.log(`Found ${files.length} PNG frames to convert`);

    let totalPngSize = 0;
    let totalWebpSize = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = join(INPUT_DIR, file);
        const outputName = file.replace('.png', '.webp');
        const outputPath = join(OUTPUT_DIR, outputName);

        const pngStat = await stat(inputPath);
        totalPngSize += pngStat.size;

        // Near-lossless WebP: quality 100 with near_lossless for zero visible quality loss
        await sharp(inputPath)
            .webp({ quality: 95, effort: 6 })
            .toFile(outputPath);

        const webpStat = await stat(outputPath);
        totalWebpSize += webpStat.size;

        if ((i + 1) % 20 === 0 || i === files.length - 1) {
            const ratio = ((1 - totalWebpSize / totalPngSize) * 100).toFixed(1);
            console.log(`  [${i + 1}/${files.length}] Converted. Cumulative savings: ${ratio}%`);
        }
    }

    console.log(`\nDone!`);
    console.log(`  Total PNG size:  ${(totalPngSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Total WebP size: ${(totalWebpSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Savings: ${((1 - totalWebpSize / totalPngSize) * 100).toFixed(1)}%`);
}

convert().catch(console.error);
