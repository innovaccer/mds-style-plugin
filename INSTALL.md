# Quick Installation Guide

## Install the MDS Style Inspector Extension

### Step 1: Open Chrome Extensions
1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner

### Step 2: Load the Extension
1. Click "Load unpacked"
2. Select the `mds-style-inspector` folder
3. The extension should appear in your extensions list

### Step 3: Test the Extension
1. Open the test page: `test.html` in this folder
2. Click the extension icon in your Chrome toolbar
3. Click "Start Inspection"
4. Elements with hardcoded CSS values should be highlighted with red borders

## What the Extension Does

- **Scans all DOM elements** for hardcoded CSS values
- **Highlights problematic elements** with red borders and warning labels
- **Recognizes design tokens** (CSS custom properties like `var(--token-name)`)
- **Monitors DOM changes** and inspects new elements automatically
- **Shows statistics** of hardcoded values found

## Supported Hardcoded Value Types

- Spacing (margin, padding, width, height, etc.)
- Colors (hex, rgb, rgba, hsl, hsla)
- Font sizes and line heights
- Border radius and widths
- Position values (top, right, bottom, left)
- Z-index values
- Opacity values

## Troubleshooting

If the extension doesn't work:
1. Make sure it's enabled in `chrome://extensions/`
2. Refresh the page you're inspecting
3. Check the browser console for errors
4. Try restarting the inspection

## Note about Icons

The extension includes placeholder icon files. For production use, replace the placeholder files in the `icons/` folder with actual PNG images:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

You can use the provided `icon.svg` as a reference for creating the PNG icons. 