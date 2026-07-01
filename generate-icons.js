const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = 'C:/Users/faiza/Documents/BusTicketingMobile-main/mbl/src/logo_app_bus.png';
const androidPath = path.join(__dirname, 'android/app/src/main/res');

const androidSizes = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
  try {
    for (const item of androidSizes) {
      const dirPath = path.join(androidPath, item.name);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Android square icon
      await sharp(sourceImage)
        .resize(item.size, item.size)
        .toFile(path.join(dirPath, 'ic_launcher.png'));
        
      // Android round icon (masking with circle)
      const circleSvg = `<svg><circle cx="${item.size/2}" cy="${item.size/2}" r="${item.size/2}" /></svg>`;
      const circleBuffer = Buffer.from(circleSvg);
      
      await sharp(sourceImage)
        .resize(item.size, item.size)
        .composite([{ input: circleBuffer, blend: 'dest-in' }])
        .toFile(path.join(dirPath, 'ic_launcher_round.png'));
    }
    
    console.log('Android icons generated successfully.');
    
    // iOS icons
    // Often it's enough to just put a few and let Xcode do it, but we'll try to do the main ones.
    const iosAppIconPath = path.join(__dirname, 'ios/BusTicketingMobile/Images.xcassets/AppIcon.appiconset');
    if (fs.existsSync(iosAppIconPath)) {
        const iosSizes = [
            { size: 40, filename: 'icon-20@2x.png' },
            { size: 60, filename: 'icon-20@3x.png' },
            { size: 58, filename: 'icon-29@2x.png' },
            { size: 87, filename: 'icon-29@3x.png' },
            { size: 80, filename: 'icon-40@2x.png' },
            { size: 120, filename: 'icon-40@3x.png' },
            { size: 120, filename: 'icon-60@2x.png' },
            { size: 180, filename: 'icon-60@3x.png' },
            { size: 1024, filename: 'icon-1024.png' }
        ];

        let contentsJson = {
            "images": [],
            "info": {
                "author": "xcode",
                "version": 1
            }
        };

        for (const item of iosSizes) {
            await sharp(sourceImage)
                .resize(item.size, item.size)
                .toFile(path.join(iosAppIconPath, item.filename));
            
            // Add to Contents.json roughly
            let scale = item.filename.includes('@3x') ? '3x' : (item.filename.includes('@2x') ? '2x' : '1x');
            let baseSize = item.size / parseInt(scale);
            
            contentsJson.images.push({
                "size": `${baseSize}x${baseSize}`,
                "idiom": "universal",
                "filename": item.filename,
                "scale": scale
            });
        }
        
        fs.writeFileSync(path.join(iosAppIconPath, 'Contents.json'), JSON.stringify(contentsJson, null, 2));
        console.log('iOS icons generated successfully.');
    }
    
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
