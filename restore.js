const fs = require('fs');
const path = require('path');

const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const mp4Base64 = "data:video/mp4;base64,";

const files = {
  "images_ctaBtn.png.js": `export const ctaBtnPNG = '${pngBase64}';`,
  "images_endcard_Flavors.png.js": `export const FlavorsPNG = '${pngBase64}';`,
  "images_endcard_top-text-endcard.png.js": `export const topTextEndcardPNG = '${pngBase64}';`,
  "images_grid2.png.js": `export const grid2PNG = '${pngBase64}';`,
  "images_hand.png.js": `export const handPNG = '${pngBase64}';`,
  "images_LandscapeContainer.png.js": `export const LandscapeContainerPNG = '${pngBase64}';`,
  "images_tuffyBase.png.js": `export const tuffyBasePNG = '${pngBase64}';`,
  "images_videoBase.png.js": `export const videoBasePNG = '${pngBase64}';`,
  "images_video.mp4.js": `export const videoMP4 = '${mp4Base64}';`
};

for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(__dirname, 'media', file), content);
}
console.log('Restored missing files with empty assets');
