const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '..', 'assets', 'icon.svg');
const pngPath = path.join(__dirname, '..', 'assets', 'icon.png');
const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');

async function generateIcons() {
    try {
        // First create PNG from SVG
        await sharp(svgPath)
            .resize(256, 256)
            .png()
            .toFile(pngPath);
        console.log('✅ icon.png created successfully');

        // Then convert PNG to ICO using dynamic import
        const pngToIco = (await import('png-to-ico')).default;
        const icoBuffer = await pngToIco([pngPath]);
        fs.writeFileSync(icoPath, icoBuffer);
        console.log('✅ icon.ico created successfully');

        console.log('\n📁 Icons saved to:', path.join(__dirname, '..', 'assets'));
    } catch (err) {
        console.error('❌ Error creating icons:', err);
    }
}

generateIcons();
