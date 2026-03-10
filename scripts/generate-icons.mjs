import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ICON_DIR = path.join(__dirname, '..', 'src-tauri', 'icons')

// Voyager compass icon: blue circle + white compass rose + center image symbol
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="256" cy="256" r="248" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="230" fill="none" stroke="white" stroke-width="3" opacity="0.3"/>
  <!-- Compass rose -->
  <g transform="translate(256,256)">
    <!-- N arrow (bright) -->
    <polygon points="0,-190 -24,-55 0,-75 24,-55" fill="white" opacity="0.95"/>
    <!-- S arrow -->
    <polygon points="0,190 -24,55 0,75 24,55" fill="white" opacity="0.5"/>
    <!-- E arrow -->
    <polygon points="190,0 55,-24 75,0 55,24" fill="white" opacity="0.5"/>
    <!-- W arrow -->
    <polygon points="-190,0 -55,-24 -75,0 -55,24" fill="white" opacity="0.5"/>
    <!-- Diagonal ticks -->
    <line x1="120" y1="-120" x2="140" y2="-140" stroke="white" stroke-width="3" opacity="0.3"/>
    <line x1="120" y1="120" x2="140" y2="140" stroke="white" stroke-width="3" opacity="0.3"/>
    <line x1="-120" y1="-120" x2="-140" y2="-140" stroke="white" stroke-width="3" opacity="0.3"/>
    <line x1="-120" y1="120" x2="-140" y2="140" stroke="white" stroke-width="3" opacity="0.3"/>
    <!-- Center disc -->
    <circle cx="0" cy="0" r="32" fill="white" opacity="0.9"/>
    <!-- Image icon in center -->
    <rect x="-16" y="-13" width="32" height="26" rx="3" fill="#1d4ed8" opacity="0.85"/>
    <circle cx="-6" cy="-4" r="4" fill="white" opacity="0.8"/>
    <polygon points="-12,8 -2,-4 4,5 9,-2 16,8" fill="white" opacity="0.8"/>
  </g>
</svg>`

const SIZES = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
]

async function main() {
  const svgBuffer = Buffer.from(SVG)

  // Generate all PNG sizes
  for (const { name, size } of SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(ICON_DIR, name))
    console.log(`  ✓ ${name} (${size}x${size})`)
  }

  // Generate icon.ico from multiple sizes
  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const icoBuffers = await Promise.all(
    icoSizes.map((size) =>
      sharp(svgBuffer).resize(size, size).png().toBuffer()
    )
  )
  const icoBuffer = await pngToIco(icoBuffers)
  fs.writeFileSync(path.join(ICON_DIR, 'icon.ico'), icoBuffer)
  console.log('  ✓ icon.ico (multi-size)')

  // Save SVG source for reference
  fs.writeFileSync(path.join(ICON_DIR, 'icon.svg'), SVG)
  console.log('  ✓ icon.svg (source)')

  console.log('\nTo generate icon.icns (macOS), run on macOS:')
  console.log('  mkdir icon.iconset')
  console.log('  cp 32x32.png icon.iconset/icon_32x32.png')
  console.log('  cp 128x128.png icon.iconset/icon_128x128.png')
  console.log('  cp 128x128@2x.png icon.iconset/icon_128x128@2x.png')
  console.log('  cp icon.png icon.iconset/icon_256x256@2x.png')
  console.log('  iconutil -c icns icon.iconset')
}

main().catch(console.error)
