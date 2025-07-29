# File Control for Chrome Extension Publishing

This guide explains how to control which files are included or excluded when publishing your Chrome extension to the Chrome Web Store.

## 🎯 Overview

When you publish a Chrome extension to the Chrome Web Store, you want to include only the necessary files for the extension to function, while excluding development files, documentation, and other unnecessary content.

## 📁 File Control Methods

### 1. **Configuration-Based Control (Recommended)**

The project uses a centralized configuration file: `scripts/publish-config.js`

#### How to Modify File Inclusion/Exclusion:

1. **Edit `scripts/publish-config.js`**
   ```javascript
   module.exports = {
     // Files that MUST be included
     requiredFiles: [
       'manifest.json',
       'background.js',
       'content.js',
       'content.css',
       'popup/',
       'icons/',
     ],

     // Optional files to include
     optionalFiles: [
       // 'assets/',
       // 'locales/',
     ],

     // Files to exclude
     excludedFiles: [
       '.git',
       'node_modules',
       'scripts',
       'tests',
       'README.md',
       // Add your custom exclusions here
     ],
   };
   ```

2. **Add files to include:**
   - Add to `requiredFiles` if the file is essential
   - Add to `optionalFiles` if the file is optional

3. **Add files to exclude:**
   - Add to `excludedFiles` array

### 2. **Check What Will Be Included**

Before packaging, you can preview what files will be included:

```bash
npm run check-package
```

This will show you:
- ✅ Files that WILL be included
- ❌ Files that will be EXCLUDED
- ⚠️ Potential issues (missing files, large files)

### 3. **Package Your Extension**

```bash
npm run package
```

This creates a zip file in the `dist/` directory with only the necessary files.

## 📋 Common File Categories

### ✅ **Files to INCLUDE:**

**Essential Files (Required):**
- `manifest.json` - Extension configuration
- `background.js` - Background script
- `content.js` - Content script
- `content.css` - Content styles
- `popup/` - Popup interface
- `icons/` - Extension icons

**Optional Files:**
- `assets/` - Images, fonts, etc.
- `locales/` - Internationalization files
- `options/` - Options page
- `devtools/` - Developer tools integration

### ❌ **Files to EXCLUDE:**

**Development Files:**
- `.git/` - Version control
- `node_modules/` - Dependencies
- `scripts/` - Build scripts
- `tests/` - Test files
- `dist/` - Build output

**Documentation:**
- `README.md`
- `INSTALL.md`
- `PUBLISHING.md`
- `FILE_CONTROL.md`

**Configuration:**
- `package.json`
- `package-lock.json`
- `.eslintrc.json`
- `.prettierrc`

**IDE/OS Files:**
- `.vscode/`
- `.idea/`
- `.DS_Store`
- `Thumbs.db`

## 🔧 Advanced Configuration

### File Pattern Exclusions

You can exclude files by pattern:

```javascript
excludedPatterns: [
  '*.log',
  '*.tmp',
  '*.temp',
  '*.swp',
  '*.swo',
  '*~',
],
```

### Package Size Limits

```javascript
// Maximum package size in MB (Chrome Web Store limit is 10MB)
maxPackageSize: 10,
```

### Build Options

```javascript
// Whether to include source maps
includeSourceMaps: false,

// Whether to minify JavaScript files
minifyJavaScript: true,

// Whether to compress images
compressImages: true,
```

## 🚀 Publishing Workflow

### 1. **Check Package Contents**
```bash
npm run check-package
```

### 2. **Build and Package**
```bash
npm run package
```

### 3. **Upload to Chrome Web Store**
- Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- Upload the generated zip file from `dist/`
- Fill in required information
- Submit for review

## 🛠️ Troubleshooting

### Package Too Large
- Check for large files: `npm run check-package`
- Remove unnecessary files from `optionalFiles`
- Optimize images and assets
- Consider minifying JavaScript

### Missing Required Files
- Ensure all files in `requiredFiles` exist
- Check file paths are correct
- Run `npm run build` to validate

### Unexpected Files Included
- Add files to `excludedFiles` array
- Use pattern exclusions for file types
- Check the package contents: `npm run check-package`

## 📝 Best Practices

1. **Keep it Minimal**: Only include files necessary for the extension to function
2. **Use Configuration**: Modify `publish-config.js` instead of hardcoding in scripts
3. **Check Before Publishing**: Always run `npm run check-package` before packaging
4. **Version Control**: Keep development files in git but exclude from package
5. **Documentation**: Keep documentation in the repository but exclude from package

## 🔍 File Control Commands

```bash
# Check what files will be included
npm run check-package

# Build and package the extension
npm run package

# Build only (validation)
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## 📚 Related Files

- `scripts/publish-config.js` - Main configuration file
- `scripts/package.js` - Packaging script
- `scripts/check-package.js` - Package content checker
- `scripts/build.js` - Build validation script
- `PUBLISHING.md` - Complete publishing guide 