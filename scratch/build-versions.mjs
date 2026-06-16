import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const configPath = './src/config.js';
const originalConfig = fs.readFileSync(configPath, 'utf8');
const targetDir = './dist-versions';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

try {
  for (const version of ['v1', 'v2', 'v3', 'v4']) {
    console.log(`Setting gameplayVersion to ${version}...`);
    // Replace the gameplayVersion value in config.js
    const updatedConfig = originalConfig.replace(
      /gameplayVersion:\s*['"][vV]\d['"]/g,
      `gameplayVersion: '${version}'`
    );
    fs.writeFileSync(configPath, updatedConfig, 'utf8');

    console.log(`Building inline version for ${version}...`);
    execSync('npx vite build --config vite/config-inline.prod.mjs', { stdio: 'inherit' });

    const sourcePath = './dist-inline-applovin/index.html';
    const targetPath = path.join(targetDir, `index_${version}.html`);
    
    if (fs.existsSync(sourcePath)) {
      // Copy to the separate versions directory so Vite does not delete it on the next run
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Successfully built and saved to: ${targetPath}`);
    } else {
      console.error(`Build output not found at ${sourcePath}`);
    }
  }
} catch (error) {
  console.error('Error during build process:', error);
} finally {
  console.log('Restoring original config.js...');
  fs.writeFileSync(configPath, originalConfig, 'utf8');
}
