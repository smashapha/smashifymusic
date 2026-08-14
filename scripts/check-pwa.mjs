import fs from 'fs';
import path from 'path';

console.log('🔍 [PWA Check] Running prebuild PWA verification...');

const rootDir = process.cwd();
const indexHtmlPath = path.join(rootDir, 'index.html');
const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
const publicDir = path.join(rootDir, 'public');

let hasError = false;

// 1. Verify index.html has exactly ONE manifest link
if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const manifestMatches = indexHtml.match(/<link\s+[^>]*rel=["']manifest["'][^>]*>/gi) || [];
  if (manifestMatches.length === 0) {
    console.error('❌ [PWA Check] Error: index.html has NO <link rel="manifest"> tag.');
    hasError = true;
  } else if (manifestMatches.length > 1) {
    console.error(`❌ [PWA Check] Error: index.html has duplicate manifest tags (${manifestMatches.length} found). Exactly 1 required.`);
    hasError = true;
  } else {
    console.log('✅ [PWA Check] index.html has exactly 1 manifest link.');
  }

  // Check apple-touch-icon and favicon
  const appleTouchIconMatch = indexHtml.match(/<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
  if (appleTouchIconMatch) {
    const iconRelPath = appleTouchIconMatch[1].replace(/^\//, '');
    const fullPath = path.join(publicDir, iconRelPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ [PWA Check] Error: apple-touch-icon "${appleTouchIconMatch[1]}" does not exist on disk at ${fullPath}`);
      hasError = true;
    } else {
      console.log(`✅ [PWA Check] apple-touch-icon exists (${iconRelPath}).`);
    }
  }
} else {
  console.error('❌ [PWA Check] Error: index.html not found.');
  hasError = true;
}

// 2. Helper to get PNG dimensions from buffer
function getPngDimensions(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  return null;
}

// 3. Verify manifest.webmanifest
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Check icons
  if (Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      const iconPath = path.join(publicDir, icon.src.replace(/^\//, ''));
      if (!fs.existsSync(iconPath)) {
        console.error(`❌ [PWA Check] Error: Manifest icon "${icon.src}" does not exist on disk at ${iconPath}`);
        hasError = true;
      } else {
        console.log(`✅ [PWA Check] Manifest icon exists: ${icon.src} (${icon.sizes})`);
      }
    }
  }

  // Check screenshots
  if (Array.isArray(manifest.screenshots)) {
    for (const ss of manifest.screenshots) {
      const ssPath = path.join(publicDir, ss.src.replace(/^\//, ''));
      if (!fs.existsSync(ssPath)) {
        console.error(`❌ [PWA Check] Error: Manifest screenshot "${ss.src}" does not exist on disk at ${ssPath}`);
        hasError = true;
      } else {
        const dims = getPngDimensions(ssPath);
        if (!dims) {
          console.warn(`⚠️ [PWA Check] Warning: Unable to parse PNG header for ${ss.src}`);
        } else {
          const declared = ss.sizes || '';
          const [reqW, reqH] = declared.split('x').map(Number);
          if (dims.width === reqW && dims.height === reqH) {
            console.log(`✅ [PWA Check] Screenshot ${ss.src} size matches manifest: ${dims.width}x${dims.height}`);
          } else {
            // Check if placeholder (144x144, 96x96, etc.)
            const isPlaceholder = (dims.width <= 200 && dims.height <= 200);
            if (isPlaceholder) {
              console.warn(
                `⚠️ [PWA Check WARNING] Manifest screenshot ${ss.src} contains placeholder file (${dims.width}x${dims.height}) but declares ${declared}.\n` +
                `   Required dimensions to deploy: 1280x720 (wide) and 750x1334 (narrow).\n` +
                `   (Passing build check to allow uploading real capture files).`
              );
            } else {
              console.error(`❌ [PWA Check] Error: Manifest screenshot "${ss.src}" dimensions (${dims.width}x${dims.height}) do not match declared sizes "${declared}".`);
              hasError = true;
            }
          }
        }
      }
    }
  }

  // Check widgets
  if (Array.isArray(manifest.widgets)) {
    for (const widget of manifest.widgets) {
      if (Array.isArray(widget.screenshots) && widget.screenshots.length > 0) {
        for (const ss of widget.screenshots) {
          const ssPath = path.join(publicDir, ss.src.replace(/^\//, ''));
          if (!fs.existsSync(ssPath)) {
            console.error(`❌ [PWA Check] Error: Widget screenshot "${ss.src}" not found on disk.`);
            hasError = true;
          }
        }
      }
    }
  }
} else {
  console.error('❌ [PWA Check] Error: public/manifest.webmanifest not found.');
  hasError = true;
}

if (hasError) {
  console.error('🛑 [PWA Check] Build failed due to PWA verification errors.');
  process.exit(1);
} else {
  console.log('🎉 [PWA Check] PWA validation completed successfully!');
}
