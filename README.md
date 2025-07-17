# MDS Style Inspector

A Chrome browser extension that inspects DOM elements for hardcoded CSS values and highlights them with a red border. This tool helps developers identify elements that are not using design tokens for consistent styling.

## Features

- **Real-time Inspection**: Scans all DOM elements for hardcoded CSS values
- **Visual Highlighting**: Elements with hardcoded values are highlighted with a red border and warning label
- **Comprehensive Detection**: Detects hardcoded values for:
  - Spacing (margin, padding, width, height, etc.)
  - Colors (hex, rgb, rgba, hsl, hsla)
  - Font sizes
  - Border radius
  - Z-index values
  - Opacity values
- **Design Token Recognition**: Automatically recognizes CSS custom properties (`var(--token-name)`)
- **Live Updates**: Monitors DOM changes and inspects new elements automatically
- **Statistics**: Shows count of hardcoded values found and elements inspected

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your extensions list

### Method 2: Build and Install

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory
4. The extension will be installed and ready to use

## Usage

1. **Activate the Extension**: Click the extension icon in your Chrome toolbar
2. **Start Inspection**: Click "Start Inspection" in the popup
3. **View Results**: Elements with hardcoded CSS values will be highlighted with:
   - Red border outline
   - Warning label ("⚠️ Hardcoded CSS")
   - Pulsing animation
   - Tooltip on hover
4. **Stop Inspection**: Click "Stop Inspection" to clear highlights and stop monitoring

## What Gets Detected

### Hardcoded Values (Will be highlighted):
- `margin: 16px`
- `padding: 8px`
- `font-size: 14px`
- `color: #333333`
- `background-color: rgb(255, 255, 255)`
- `border-radius: 4px`
- `width: 200px`
- `height: 100px`
- `z-index: 1000`
- `opacity: 0.8`

### Design Tokens (Will NOT be highlighted):
- `margin: var(--spacing-md)`
- `color: var(--color-primary)`
- `font-size: var(--font-size-body)`
- `background-color: var(--color-background)`

## Configuration

The extension can be customized by modifying the following files:

- `content.js`: Main inspection logic and detection patterns
- `content.css`: Visual styling for highlighted elements
- `popup.html` & `popup.js`: Extension popup interface

## Detection Patterns

The extension uses regex patterns to detect:

1. **Spacing Values**: Any numeric value with units (px, rem, em, etc.)
2. **Color Values**: Hex colors, rgb/rgba, hsl/hsla, named colors
3. **Font Sizes**: Numeric values with units for font properties
4. **Border Radius**: Numeric values with units for border-radius
5. **Z-index**: Numeric values for z-index property
6. **Opacity**: Numeric values for opacity property

## Excluded Values

The following values are considered acceptable and won't trigger highlighting:
- `0`, `0px` (zero values)
- `auto` (automatic values)
- `none` (no value)
- CSS custom properties using `var(--token-name)`

## Browser Compatibility

- Chrome (recommended)
- Chromium-based browsers (Edge, Brave, etc.)
- Firefox (with modifications to manifest.json)

## Development

### Project Structure
```
mds-style-inspector/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup interface
├── popup.js              # Popup logic
├── content.js            # Main inspection script
├── content.css           # Highlight styles
├── icons/                # Extension icons
└── README.md            # This file
```

### Key Components

1. **StyleInspector Class** (`content.js`):
   - Main inspection logic
   - Pattern matching for hardcoded values
   - DOM monitoring and highlighting

2. **Popup Interface** (`popup.html/js`):
   - Start/stop controls
   - Statistics display
   - Status indicators

3. **Visual Feedback** (`content.css`):
   - Red border highlighting
   - Warning labels
   - Pulsing animation
   - Tooltips

## Troubleshooting

### Extension Not Working
1. Check that the extension is enabled in `chrome://extensions/`
2. Refresh the page you're inspecting
3. Check the browser console for any error messages

### No Elements Highlighted
1. Ensure the page has elements with hardcoded CSS values
2. Check that the inspection is active (green status in popup)
3. Try refreshing the page and restarting inspection

### Performance Issues
- The extension inspects all DOM elements, which can be resource-intensive on large pages
- Consider stopping inspection when not needed
- The extension automatically monitors DOM changes, so it will inspect new elements as they're added

## Contributing

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feature requests, please open an issue on the GitHub repository. 