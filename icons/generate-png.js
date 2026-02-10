/**
 * Générateur d'icônes PNG pour la PWA
 * Exécutez ce script avec Node.js pour générer toutes les tailles d'icônes
 */

const fs = require('fs');
const path = require('path');

// Tailles d'icônes requises pour la PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG source (icône simple avec fond dégradé)
const svgTemplate = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad${size})"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="white" stroke-width="3"/>
  <path d="M50 25 L55 45 L75 50 L55 55 L50 75 L45 55 L25 50 L45 45 Z" fill="white"/>
  <circle cx="50" cy="50" r="8" fill="#333"/>
</svg>`;

console.log('🎨 Génération des icônes PWA...\n');

sizes.forEach(size => {
    const svg = svgTemplate(size);
    const filename = `icon-${size}x${size}.svg`;
    fs.writeFileSync(path.join(__dirname, filename), svg);
    console.log(`✅ ${filename} créé (${size}x${size})`);
});

console.log('\n📦 Instructions pour convertir en PNG :');
console.log('1. Ouvrez les fichiers SVG dans un navigateur');
console.log('2. Faites une capture d\'écran ou utilisez un convertisseur en ligne');
console.log('3. Ou utilisez Inkscape/Illustrator pour exporter en PNG');
console.log('\n🌐 Alternative : Utilisez https://cloudconvert.com/svg-to-png');
