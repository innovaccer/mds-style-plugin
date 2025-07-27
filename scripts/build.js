#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔨 Building Chrome Extension...');

// Validate manifest.json
function validateManifest() {
  try {
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Basic validation
    if (!manifest.name || !manifest.version || !manifest.manifest_version) {
      throw new Error('Missing required fields in manifest.json');
    }
    
    // Check if manifest version is 3
    if (manifest.manifest_version !== 3) {
      throw new Error('Manifest version must be 3');
    }
    
    console.log('✅ Manifest validation passed');
    return manifest;
  } catch (error) {
    console.error('❌ Manifest validation failed:', error.message);
    process.exit(1);
  }
}

// Check required files exist
function checkRequiredFiles(manifest) {
  const requiredFiles = [
    'background.js',
    'content.js',
    'content.css',
    'popup/popup.html'
  ];
  
  // Add icon files if specified
  if (manifest.icons) {
    Object.values(manifest.icons).forEach(iconPath => {
      requiredFiles.push(iconPath);
    });
  }
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:', missingFiles.join(', '));
    process.exit(1);
  }
  
  console.log('✅ All required files found');
}

// Update version in manifest if needed
function updateVersion(manifest) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.version !== manifest.version) {
    console.log(`📝 Updating version from ${manifest.version} to ${packageJson.version}`);
    manifest.version = packageJson.version;
    
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
  
  console.log(`✅ Version: ${manifest.version}`);
}

// Main build process
function build() {
  try {
    const manifest = validateManifest();
    checkRequiredFiles(manifest);
    updateVersion(manifest);
    
    console.log('🎉 Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build(); 