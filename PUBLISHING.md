# Chrome Web Store Publishing Automation

This document explains how to use the automated pipeline to publish the Style Inspector extension to the Chrome Web Store.

## 🚀 Quick Start

### Prerequisites

1. **Chrome Web Store Developer Account**
   - Sign up at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay the one-time $5 registration fee

2. **Chrome Web Store API Credentials**
   - Get your extension ID from the developer dashboard
   - Set up OAuth 2.0 credentials for the Chrome Web Store API

3. **GitHub Repository Setup**
   - Push your code to a GitHub repository
   - Set up the required secrets (see Configuration section)

## 📋 Configuration

### GitHub Secrets Setup

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `EXTENSION_ID` | Your Chrome extension ID | From Chrome Web Store Developer Dashboard |
| `CLIENT_ID` | OAuth 2.0 Client ID | From Google Cloud Console |
| `CLIENT_SECRET` | OAuth 2.0 Client Secret | From Google Cloud Console |
| `REFRESH_TOKEN` | OAuth 2.0 Refresh Token | Generated using the credentials above |

### Setting up Chrome Web Store API

1. **Create a Google Cloud Project**
   ```bash
   # Go to https://console.cloud.google.com/
   # Create a new project or select existing one
   ```

2. **Enable Chrome Web Store API**
   ```bash
   # In Google Cloud Console:
   # APIs & Services > Library > Search for "Chrome Web Store API"
   # Click "Enable"
   ```

3. **Create OAuth 2.0 Credentials**
   ```bash
   # APIs & Services > Credentials
   # Create Credentials > OAuth 2.0 Client IDs
   # Application type: Web application
   # Add authorized redirect URIs
   ```

4. **Generate Refresh Token**
   ```bash
   # Use this script to generate refresh token:
   # https://github.com/trmcnvn/chrome-addon/blob/master/scripts/refresh_token.js
   ```

## 🔄 Publishing Methods

### Method 1: Automated via GitHub Actions (Recommended)

#### Using Tags (Automatic)
```bash
# Create and push a new tag
git tag v1.0.1
git push origin v1.0.1
```

#### Using Manual Trigger
1. Go to your GitHub repository
2. Navigate to `Actions` tab
3. Select `Publish to Chrome Web Store` workflow
4. Click `Run workflow`
5. Enter the version number (e.g., `1.0.1`)
6. Click `Run workflow`

### Method 2: Manual Local Build

```bash
# Install dependencies
npm install

# Build and package
npm run package

# The package will be created in dist/style-inspector-v1.0.0.zip
# Upload this file to Chrome Web Store Developer Dashboard
```

## 📦 Build Process

The automation pipeline includes:

1. **Validation**
   - Manifest.json validation
   - Required files check
   - Version consistency

2. **Building**
   - Extension compilation
   - File validation
   - Version updates

3. **Packaging**
   - Creates optimized zip file
   - Excludes development files
   - Includes all required assets

4. **Publishing**
   - Uploads to Chrome Web Store
   - Creates GitHub release
   - Updates version tags

## 🔧 Local Development

### Available Scripts

```bash
# Install dependencies
npm install

# Build extension (validation only)
npm run build

# Package extension (creates zip file)
npm run package

# Lint code
npm run lint

# Format code
npm run format
```

### Testing Locally

1. **Load in Chrome**
   ```bash
   # Open Chrome
   # Go to chrome://extensions/
   # Enable "Developer mode"
   # Click "Load unpacked"
   # Select your project directory
   ```

2. **Test the Extension**
   - Navigate to any website
   - Click the extension icon
   - Verify functionality

## 📝 Version Management

### Semantic Versioning

The project follows [semantic versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- Example: `1.0.1`

### Version Updates

1. **Update package.json version**
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```

2. **The build process will automatically:**
   - Update manifest.json version
   - Create appropriate tags
   - Generate release notes

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**
   ```bash
   # Check for missing files
   npm run build
   
   # Verify manifest.json syntax
   # Ensure all required files exist
   ```

2. **Package Too Large**
   ```bash
   # Check for unnecessary files
   # Review .gitignore and package.js exclusions
   # Optimize images and assets
   ```

3. **Chrome Web Store Rejection**
   - Review [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program_policies/)
   - Check extension permissions
   - Verify privacy policy and terms of service

4. **API Authentication Issues**
   ```bash
   # Verify GitHub secrets are set correctly
   # Check OAuth 2.0 credentials
   # Regenerate refresh token if needed
   ```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run package

# Check package contents
unzip -l dist/*.zip
```

## 📚 Resources

- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Store API Reference](https://developer.chrome.com/docs/webstore/api/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run lint && npm run build`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 