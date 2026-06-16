import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function convertFolder(folder) {
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      await convertFolder(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        console.log(`Converting ${fullPath} to WebP...`);
        try {
          const buffer = await sharp(fullPath)
            .webp({ quality: 80 })
            .toBuffer();
          fs.writeFileSync(fullPath, buffer);
          console.log(`Saved ${fullPath} as WebP`);
        } catch (err) {
          console.error(`Error converting ${fullPath}:`, err);
        }
      }
    }
  }
}

convertFolder('./public/assets').then(() => {
  console.log('All images converted to WebP successfully!');
}).catch(console.error);
