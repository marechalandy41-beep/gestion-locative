const fs = require('fs');
const sharp = require('sharp');

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect width="192" height="192" rx="40" fill="#2563eb"/><text x="96" y="130" font-family="Arial" font-size="80" font-weight="bold" fill="white" text-anchor="middle">GL</text></svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="100" fill="#2563eb"/><text x="256" y="340" font-family="Arial" font-size="220" font-weight="bold" fill="white" text-anchor="middle">GL</text></svg>`;

fs.writeFileSync('public/icon-192.svg', svg192);
fs.writeFileSync('public/icon-512.svg', svg512);

sharp('public/icon-192.svg').resize(192, 192).png().toFile('public/icon-192.png', () => console.log('192 OK'));
sharp('public/icon-512.svg').resize(512, 512).png().toFile('public/icon-512.png', () => console.log('512 OK'));