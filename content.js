// MDS Style Inspector Content Script

// Separate Tooltip Module
class StyleInspectorTooltip {
  constructor() {
    this.activeTooltip = null;
  }

  createTooltip(element, hardcodedRules) {
    if (!hardcodedRules || hardcodedRules.length === 0) {
      return null;
    }

    // Create simple tooltip content
    const tooltipContent = document.createElement('div');
    tooltipContent.className = 'mds-style-inspector-tooltip-content';
    
    const title = document.createElement('div');
    title.textContent = 'Hardcoded CSS Properties:';
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      color: #fff;
      font-size: 12px;
    `;
    tooltipContent.appendChild(title);
    
    // Show all hardcoded properties
    hardcodedRules.forEach(rule => {
      const propertyDiv = document.createElement('div');
      propertyDiv.textContent = `${rule.selector} → ${rule.property}: ${rule.value}`;
      propertyDiv.style.cssText = `
        color: #fff;
        font-family: monospace;
        font-size: 10px;
        margin-bottom: 2px;
      `;
      tooltipContent.appendChild(propertyDiv);
    });
    
    // Create simple tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'mds-style-inspector-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 11px;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      max-width: 250px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 1px solid #555;
    `;
    
    tooltip.appendChild(tooltipContent);
    document.body.appendChild(tooltip);
    
    return tooltip;
  }

  attachTooltip(element, hardcodedRules) {
    const tooltip = this.createTooltip(element, hardcodedRules);
    if (!tooltip) return;
    
    // Simple mouse events with proper scroll positioning and propagation control
    element.addEventListener('mouseenter', (event) => {
      // Stop propagation to prevent parent elements from triggering their tooltips
      event.stopPropagation();
      
      // Hide all other tooltips first
      this.hideAllTooltips();
      
      const rect = element.getBoundingClientRect();
      tooltip.style.position = 'fixed';
      tooltip.style.left = rect.left + 'px';
      tooltip.style.top = (rect.top - 30) + 'px';
      tooltip.style.opacity = '1';
    });
    
    element.addEventListener('mouseleave', (event) => {
      // Stop propagation
      event.stopPropagation();
      tooltip.style.opacity = '0';
    });
    
    // Store tooltip reference
    element._mdsTooltip = tooltip;
  }

  removeTooltip(element) {
    if (element._mdsTooltip) {
      element._mdsTooltip.remove();
      element._mdsTooltip = null;
    }
  }

  clearAllTooltips() {
    const tooltips = document.querySelectorAll('.mds-style-inspector-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
  }

  hideAllTooltips() {
    const tooltips = document.querySelectorAll('.mds-style-inspector-tooltip');
    tooltips.forEach(tooltip => {
      tooltip.style.opacity = '0';
    });
  }
}

class StyleInspector {
  constructor() {
    this.isActive = false;
    this.highlightedElements = new Set();
    this.hardcodedProperties = new Map(); // Store hardcoded properties for each element
    this.stats = {
      hardcodedCount: 0,
      inspectedCount: 0
    };
    this.mutationObserver = null;
    this.inspectedElements = new Set(); // Track which elements we've already inspected
    this.tooltip = new StyleInspectorTooltip();
    
    // Define patterns for hardcoded values - using non-global regex for test()
    this.hardcodedPatterns = {
      // Spacing values (px, rem, em, etc.)
      spacing: /(\d+(?:\.\d+)?)\s*(px|rem|em|pt|pc|in|cm|mm|vh|vw|vmin|vmax)/,
      
      // Color values (hex, rgb, rgba, named colors)
      colors: /(#[0-9a-fA-F]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|#[0-9a-fA-F]{8}|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\))/,
      
      // Font sizes
      fontSize: /(\d+(?:\.\d+)?)\s*(px|rem|em|pt|pc|in|cm|mm|vh|vw|vmin|vmax)/,
      
      // Border radius
      borderRadius: /(\d+(?:\.\d+)?)\s*(px|rem|em|pt|pc|in|cm|mm|vh|vw|vmin|vmax)/,
      
      // Z-index
      zIndex: /z-index:\s*(\d+)/,
      
      // Opacity
      opacity: /opacity:\s*([\d.]+)/
    };
    
    // Common design token patterns (CSS custom properties)
    this.tokenPatterns = [
      /var\(--[^)]+\)/,
      /var\(--[^)]+,\s*[^)]+\)/
    ];
    
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'startInspection':
          this.startInspection();
          sendResponse({ success: true, stats: this.stats });
          break;
        case 'stopInspection':
          this.stopInspection();
          sendResponse({ success: true, stats: this.stats });
          break;
        case 'getStatus':
          sendResponse({ isActive: this.isActive, stats: this.stats });
          break;
        case 'testHighlight':
          this.testHighlight();
          sendResponse({ success: true });
          break;
      }
    });
  }

  testHighlight() {
    // Test function to verify highlighting works by running actual inspection
    console.log('Running test inspection...');
    
    // Clear any existing highlights
    this.clearHighlights();
    
    // Reset stats and tracking
    this.stats.hardcodedCount = 0;
    this.stats.inspectedCount = 0;
    this.inspectedElements.clear();
    
    // Temporarily set isActive to true for the test
    const wasActive = this.isActive;
    this.isActive = true;
    
    // Run inspection on all elements
    const allElements = document.querySelectorAll('*');
    console.log(`Test: Inspecting ${allElements.length} elements`);
    
    allElements.forEach(element => {
      if (element === document.documentElement || element === document.body) {
        return; // Skip html and body elements
      }
      
      this.inspectElement(element);
    });
    
    console.log(`Test: Found ${this.stats.hardcodedCount} elements with hardcoded values`);
    
    // Reset isActive to its previous state
    this.isActive = wasActive;
    
    // Update stats
    this.updateStats();
  }

  startInspection() {
    if (this.isActive) return;
    
    console.log('MDS Style Inspector: Starting inspection...');
    this.isActive = true;
    this.stats.hardcodedCount = 0;
    this.stats.inspectedCount = 0;
    this.inspectedElements.clear();
    
    // Clear previous highlights
    this.clearHighlights();
    
    // Start inspection
    this.inspectPage();
    
    // Set up mutation observer to watch for DOM changes
    this.setupMutationObserver();
    
    console.log('MDS Style Inspector: Inspection started');
  }

  stopInspection() {
    if (!this.isActive) {
      console.log('MDS Style Inspector: Already stopped');
      return;
    }
    
    console.log('MDS Style Inspector: Stopping inspection...');
    this.isActive = false;
    
    // Clear highlights
    this.clearHighlights();
    
    // Disconnect mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
      console.log('Mutation observer disconnected');
    }
    
    // Reset stats and tracking
    this.stats.hardcodedCount = 0;
    this.stats.inspectedCount = 0;
    this.inspectedElements.clear();
    this.hardcodedProperties.clear(); // Clear stored properties
    this.updateStats();
    
    console.log('MDS Style Inspector: Inspection stopped');
  }

  setupMutationObserver() {
    // Disconnect any existing observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    this.mutationObserver = new MutationObserver((mutations) => {
      if (!this.isActive) {
        return;
      }
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Only inspect new elements that haven't been inspected before
              if (!this.inspectedElements.has(node)) {
                this.inspectElement(node);
              }
            }
          });
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('Mutation observer set up for new elements only');
  }

  inspectPage() {
    const allElements = document.querySelectorAll('*');
    console.log(`Found ${allElements.length} total elements`);
    
    // Debug: Log all elements being inspected vs skipped
    console.log('Elements analysis:');
    let inspectedCount = 0;
    let skippedCount = 0;
    
    allElements.forEach((element, index) => {
      const isStylable = !['HTML', 'BODY', 'SCRIPT', 'META', 'TITLE', 'STYLE', 'LINK', 'HEAD'].includes(element.tagName);
      
      if (isStylable) {
        inspectedCount++;
        console.log(`${inspectedCount}. INSPECTING: ${element.tagName}${element.className ? ' (class: ' + element.className + ')' : ''}${element.id ? ' (id: ' + element.id + ')' : ''}`);
      } else {
        skippedCount++;
        console.log(`SKIPPED: ${element.tagName}${element.className ? ' (class: ' + element.className + ')' : ''}${element.id ? ' (id: ' + element.id + ')' : ''}`);
      }
    });
    
    console.log(`Will inspect ${inspectedCount} stylable elements, skip ${skippedCount} non-stylable elements`);
    
    allElements.forEach(element => {
      this.inspectElement(element);
    });
  }

  inspectElement(element) {
    if (!this.isActive) {
      return;
    }
    
    if (!element || element === document.documentElement || element === document.body) {
      return;
    }

    // Skip non-stylable elements
    const nonStylableTags = ['SCRIPT', 'META', 'TITLE', 'STYLE', 'LINK', 'HEAD'];
    if (nonStylableTags.includes(element.tagName)) {
      return;
    }

    // Skip if we've already inspected this element
    if (this.inspectedElements.has(element)) {
      return;
    }

    // Mark as inspected
    this.inspectedElements.add(element);
    this.stats.inspectedCount++;
    
    // Check for hardcoded values once and store the result
    const hasHardcodedValues = this.checkForHardcodedValues(window.getComputedStyle(element), element);
    
    if (hasHardcodedValues) {
      this.highlightElement(element);
      this.stats.hardcodedCount++;
      console.log('Highlighted element:', element.tagName, element.className);
    }
    
    // Update stats in popup
    this.updateStats();
  }

  checkForHardcodedValues(computedStyle, element) {
    const relevantProperties = [
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'font-size', 'line-height',
      'color', 'background-color', 'border-color',
      'border-radius', 'border-width',
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'top', 'right', 'bottom', 'left',
      'z-index', 'opacity'
    ];

    // Use the direct CSS rule analysis approach - check once and store
    const matchedRules = this.analyzeHardcodedRules(element, relevantProperties);
    
    if (matchedRules.length > 0) {
      console.log(`Found ${matchedRules.length} hardcoded rules for element:`, element.tagName, element.className || 'no-class');
      matchedRules.forEach(rule => {
        console.log(`${rule.selector} → ${rule.property}: ${rule.value}`);
      });
      
      // Store the hardcoded properties for this element (only once during inspection)
      this.hardcodedProperties.set(element, matchedRules);
      
      return true;
    }

    return false;
  }

  analyzeHardcodedRules(element, relevantProperties) {
    const matchedRules = [];

    // Check inline styles
    for (const prop of element.style) {
      const value = element.style.getPropertyValue(prop).trim();
      if (this.isHardcodedValue(value, prop, element)) {
        matchedRules.push({ selector: 'inline', property: prop, value });
      }
    }

    // Check all document stylesheets (external or <style> tags)
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules || sheet.rules;
      } catch (e) {
        // CORS-restricted stylesheet
        continue;
      }

      for (const rule of rules) {
        if (
          rule.type === CSSRule.STYLE_RULE &&
          rule.selectorText &&
          element.matches(rule.selectorText)
        ) {
          for (const property of rule.style) {
            const value = rule.style.getPropertyValue(property).trim();

            if (this.isHardcodedValue(value, property, element)) {
              matchedRules.push({
                selector: rule.selectorText,
                property,
                value
              });
            }
          }
        }
      }
    }

    return matchedRules;
  }

  isHardcodedValue(value, property, element) {
    // Skip if value is empty, 0, auto, or none
    if (!value || value === '0' || value === '0px' || value === 'auto' || value === 'none') {
      return false;
    }

    // Debug: Log the element and property being checked
    console.log(`Checking ${property} = ${value} for element:`, element.tagName, element.className || 'no-class');

    // Check if value contains design tokens
    const hasTokens = this.tokenPatterns.some(pattern => pattern.test(value));
    if (hasTokens) {
      console.log(`Skipping design token: ${property} = ${value}`);
      return false;
    }

    // Check for hardcoded patterns based on property type
    if (property.includes('color') || property === 'color' || property === 'background-color') {
      const isHardcoded = this.hardcodedPatterns.colors.test(value);
      if (isHardcoded) {
        console.log(`Color hardcoded: ${property} = ${value}`);
      }
      return isHardcoded;
    }
    
    if (property.includes('font') || property === 'line-height') {
      const isHardcoded = this.hardcodedPatterns.fontSize.test(value);
      if (isHardcoded) {
        console.log(`Font hardcoded: ${property} = ${value}`);
      }
      return isHardcoded;
    }
    
    if (property.includes('border-radius')) {
      const isHardcoded = this.hardcodedPatterns.borderRadius.test(value);
      if (isHardcoded) {
        console.log(`Border radius hardcoded: ${property} = ${value}`);
      }
      return isHardcoded;
    }
    
    if (property === 'z-index') {
      const isHardcoded = this.hardcodedPatterns.zIndex.test(value);
      if (isHardcoded) {
        console.log(`Z-index hardcoded: ${property} = ${value}`);
      }
      return isHardcoded;
    }
    
    if (property === 'opacity') {
      const isHardcoded = this.hardcodedPatterns.opacity.test(value);
      if (isHardcoded) {
        console.log(`Opacity hardcoded: ${property} = ${value}`);
      }
      return isHardcoded;
    }
    
    // For spacing properties (margin, padding, width, height, etc.)
    if (property.includes('margin') || property.includes('padding') || 
        property.includes('width') || property.includes('height') ||
        property.includes('top') || property.includes('right') || 
        property.includes('bottom') || property.includes('left')) {
      const isHardcoded = this.hardcodedPatterns.spacing.test(value);
      if (isHardcoded) {
        console.log(`Spacing hardcoded: ${property} = ${value}`);
      }
      return isHardcoded;
    }

    return false;
  }

  highlightElement(element) {
    if (this.highlightedElements.has(element)) {
      return; // Already highlighted
    }

    this.highlightedElements.add(element);
    
    // Add highlight class
    element.classList.add('mds-style-inspector-highlight');
    
    // Add data attribute for identification
    element.setAttribute('data-mds-hardcoded', 'true');
    
    // Add tooltip functionality
    this.tooltip.attachTooltip(element, this.hardcodedProperties.get(element));
    
    // Debug: Check if the element is visible and has the class
    console.log('Highlighting element:', element);
    console.log('Element classes:', element.className);
    console.log('Element data attribute:', element.getAttribute('data-mds-hardcoded'));
    console.log('Element computed style display:', window.getComputedStyle(element).display);
    console.log('Element computed style border:', window.getComputedStyle(element).border);
    
    console.log('Element highlighted:', element);
  }

  clearHighlights() {
    this.highlightedElements.forEach(element => {
      element.classList.remove('mds-style-inspector-highlight');
      element.removeAttribute('data-mds-hardcoded');
      // Remove tooltip if it exists
      this.tooltip.removeTooltip(element);
    });
    
    this.highlightedElements.clear();
    this.hardcodedProperties.clear(); // Clear stored properties
    this.tooltip.clearAllTooltips(); // Clear all tooltips
  }

  updateStats() {
    // Send stats update to popup if it's open
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stats: this.stats
    }).catch(() => {
      // Ignore errors if popup is not open
    });
  }
}

// Initialize the inspector when the content script loads
const inspector = new StyleInspector(); 