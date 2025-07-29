/**
 * Chrome Extension Publishing Configuration
 * 
 * This file controls which files are included/excluded when packaging
 * the extension for Chrome Web Store submission.
 */

module.exports = {
  // Files and directories that MUST be included in the package
  // These are essential for the extension to function
  requiredFiles: [
    'manifest.json',
    'background.js',
    'content.js',
    'content.css',
    'popup/',
    'icons/',
  ],

  // Files and directories that should be included (optional)
  // Add any additional files your extension needs
  optionalFiles: [
    // 'assets/',
    // 'locales/',
    // 'additional-scripts/',
  ],

  // Files and directories that should NEVER be included
  // These are development files, documentation, build tools, etc.
  excludedFiles: [
    // Development files
    '.git',
    '.gitignore',
    'node_modules',
    'scripts',
    'tests',
    'dist',
    
    // Documentation
    'README.md',
    'INSTALL.md',
    'PUBLISHING.md',
    'AUTOMATION_SUMMARY.md',
    'FILE_CONTROL.md',
    
    // Build configuration
    'package.json',
    'package-lock.json',
    '.eslintrc.json',
    '.prettierrc',
    
    // CI/CD
    '.github',
    
    // IDE files
    '.vscode',
    '.idea',
    
    // OS files
    '.DS_Store',
    'Thumbs.db',
    
    // Logs and temporary files
    '*.log',
    '*.tmp',
    '*.temp',
    
    // Add your custom exclusions here:
    // 'dev-config.json',
    // 'debug.js',
    // 'test-data/',
  ],

  // File patterns to exclude (glob patterns)
  excludedPatterns: [
    '*.log',
    '*.tmp',
    '*.temp',
    '*.swp',
    '*.swo',
    '*~',
  ],

  // Maximum package size in MB (Chrome Web Store limit is 10MB)
  maxPackageSize: 10,

  // Whether to include source maps (usually not needed for production)
  includeSourceMaps: false,

  // Whether to minify JavaScript files
  minifyJavaScript: true,

  // Whether to compress images
  compressImages: true,
}; 