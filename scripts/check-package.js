#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load publishing configuration
const config = require('./publish-config');

console.log('🔍 Checking what files will be included in the package...\n');

// Combine all files to include
const includeFiles = [
  ...config.requiredFiles,
  ...config.optionalFiles,
];

const excludeFiles = config.excludedFiles;

function checkPackageContents() {
  const rootDir = path.join(__dirname, '..');
  const files = fs.readdirSync(rootDir);
  const includedFiles = [];
  const excludedFiles = [];
  const additionalFiles = [];

  // Check explicitly included files
  includeFiles.forEach((file) => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        includedFiles.push(`${file}/ (directory)`);
      } else {
        includedFiles.push(file);
      }
    } else {
      console.warn(`⚠️  Warning: Required file not found: ${file}`);
    }
  });

  // Check excluded files
  excludeFiles.forEach((file) => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        excludedFiles.push(`${file}/ (directory)`);
      } else {
        excludedFiles.push(file);
      }
    }
  });

  // Check additional files in root directory
  files.forEach((file) => {
    if (!includeFiles.includes(file) && !excludeFiles.includes(file)) {
      // Check if file matches any excluded patterns
      const isExcludedByPattern = config.excludedPatterns.some(pattern => {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(file);
      });

      if (!isExcludedByPattern) {
        const filePath = path.join(rootDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          additionalFiles.push(file);
        }
      }
    }
  });

  console.log('📦 Files that WILL be included:');
  console.log('================================');
  includedFiles.forEach(file => console.log(`✅ ${file}`));
  
  if (additionalFiles.length > 0) {
    console.log('\n📄 Additional files that will be included:');
    console.log('==========================================');
    additionalFiles.forEach(file => console.log(`➕ ${file}`));
  }

  console.log('\n❌ Files that will be EXCLUDED:');
  console.log('===============================');
  excludedFiles.forEach(file => console.log(`🚫 ${file}`));

  console.log('\n📊 Summary:');
  console.log('===========');
  console.log(`Total files to include: ${includedFiles.length + additionalFiles.length}`);
  console.log(`Total files excluded: ${excludedFiles.length}`);
  console.log(`Max package size: ${config.maxPackageSize} MB`);

  // Check for potential issues
  console.log('\n🔍 Potential Issues:');
  console.log('===================');
  
  const missingRequired = includeFiles.filter(file => {
    const filePath = path.join(rootDir, file);
    return !fs.existsSync(filePath);
  });

  if (missingRequired.length > 0) {
    console.log('❌ Missing required files:');
    missingRequired.forEach(file => console.log(`   - ${file}`));
  } else {
    console.log('✅ All required files found');
  }

  // Check for large files
  const largeFiles = [];
  [...includedFiles, ...additionalFiles].forEach(file => {
    if (!file.includes('(directory)')) {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        if (parseFloat(sizeMB) > 1) {
          largeFiles.push({ file, size: sizeMB });
        }
      }
    }
  });

  if (largeFiles.length > 0) {
    console.log('\n⚠️  Large files (>1MB):');
    largeFiles.forEach(({ file, size }) => {
      console.log(`   - ${file} (${size} MB)`);
    });
  }
}

checkPackageContents(); 