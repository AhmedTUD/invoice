// Script to create simple SVG icons for PWA
// Run this in browser console or Node.js

function createSVGIcon(size) {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1565C0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="35%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.12}">FSMI</text>
  <text x="50%" y="65%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.1}">TV&HA</text>
</svg>`;
  
  return svg;
}

// Create icons for different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svg = createSVGIcon(size);
  console.log(`Icon ${size}x${size}:`);
  console.log(svg);
  console.log('---');
});

// For browser usage:
function downloadSVGAsIcon(size) {
  const svg = createSVGIcon(size);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  canvas.width = size;
  canvas.height = size;
  
  img.onload = function() {
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob(function(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `icon-${size}x${size}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
}

// Usage in browser console:
// downloadSVGAsIcon(192);

console.log('Icons created! Use downloadSVGAsIcon(size) in browser to download.');