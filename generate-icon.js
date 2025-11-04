// generate-icon.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = 'logo.webp'; // Your WebP file name

const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateAndroidIcons() {
  console.log('🎨 Starting icon generation from WebP...\n');
  
  // Check if input file exists
  if (!fs.existsSync(INPUT_IMAGE)) {
    console.error(`❌ Error: ${INPUT_IMAGE} not found in project root!`);
    console.log('📝 Please place your WebP logo in the project root folder.');
    process.exit(1);
  }

  try {
    // First, convert to high-res PNG for verification
    console.log('📸 Converting WebP to PNG (1024x1024)...');
    await sharp(INPUT_IMAGE)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile('app-icon-preview.png');
    
    console.log('✅ Created app-icon-preview.png (check this to verify your icon)\n');

    // Generate Android icons
    console.log('📱 Generating Android icons...\n');
    
    for (const [folder, size] of Object.entries(androidSizes)) {
      const outputDir = path.join('android', 'app', 'src', 'main', 'res', folder);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate ic_launcher.png (square icon)
      await sharp(INPUT_IMAGE)
        .resize(size, size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, 'ic_launcher.png'));

      // Generate ic_launcher_round.png (circular icon)
      await sharp(INPUT_IMAGE)
        .resize(size, size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, 'ic_launcher_round.png'));

      console.log(`✅ Generated ${folder} icons (${size}x${size})`);
    }

    console.log('\n🎉 All icons generated successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Check app-icon-preview.png to verify your icon looks good');
    console.log('2. Run: npm run clean');
    console.log('3. Run: npm run android\n');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateAndroidIcons();