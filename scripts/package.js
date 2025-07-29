#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('📦 Packaging Chrome Extension...');

// Files to include in the package
const includeFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'popup/',
  'icons/',
];

// Files to exclude from the package
const excludeFiles = [
  '.git',
  'node_modules',
  'scripts',
  'tests',
  'README.md',
  'INSTALL.md',
  'package.json',
  'package-lock.json',
  '.eslintrc',
  '.prettierrc',
  '.github',
];

function createPackage() {
  return new Promise((resolve, reject) => {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const outputPath = `dist/style-inspector-v${version}.zip`;

    // Create dist directory if it doesn't exist
    const distDir = path.dirname(outputPath);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level
    });

    output.on('close', () => {
      const size = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`✅ Package created: ${outputPath} (${size} MB)`);
      resolve(outputPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add files to the archive
    includeFiles.forEach((file) => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          archive.directory(filePath, file);
        } else {
          archive.file(filePath, { name: file });
        }
      }
    });

    // Add all files in root directory (excluding excluded files)
    const rootDir = path.join(__dirname, '..');
    const files = fs.readdirSync(rootDir);

    files.forEach((file) => {
      if (!includeFiles.includes(file) && !excludeFiles.includes(file)) {
        const filePath = path.join(rootDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          archive.file(filePath, { name: file });
        }
      }
    });

    archive.finalize();
  });
}

async function packageFn() {
  try {
    const packagePath = await createPackage();
    console.log('🎉 Packaging completed successfully!');
    console.log(`📁 Package location: ${packagePath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Go to Chrome Web Store Developer Dashboard');
    console.log('2. Upload the generated zip file');
    console.log('3. Fill in the required information');
    console.log('4. Submit for review');
  } catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
  }
}

packageFn();
