// MDS Style Inspector Content Script
class StyleInspector {
  constructor() {
    this.isActive = false;
    this.highlightedElements = new Set();
    this.stats = {
      hardcodedCount: 0,
      inspectedCount: 0
    };
    this.mutationObserver = null;
    this.inspectedElements = new Set(); // Track which elements we've already inspected
    
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
        } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // Re-inspect element when its style changes (e.g., display: none -> display: inline-block)
          const element = mutation.target;
          if (element.nodeType === Node.ELEMENT_NODE) {
            // Remove from inspected set so it gets re-inspected
            this.inspectedElements.delete(element);
            // Remove any existing highlight
            element.classList.remove('mds-style-inspector-highlight');
            element.removeAttribute('data-mds-hardcoded');
            this.highlightedElements.delete(element);
            // Re-inspect the element
            this.inspectElement(element);
          }
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
    
    console.log('Mutation observer set up with style change detection');
  }

  inspectPage() {
    const allElements = document.querySelectorAll('*');
    console.log(`Inspecting ${allElements.length} elements`);
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

    // Skip if we've already inspected this element
    if (this.inspectedElements.has(element)) {
      return;
    }

    // Mark as inspected
    this.inspectedElements.add(element);
    this.stats.inspectedCount++;
    
    const computedStyle = window.getComputedStyle(element);
    
    // Debug: Log all computed styles for hidden button
    // if (element.id === 'hiddenButton' || element.className.includes('hidden-button')) {
    //   console.log('=== HIDDEN BUTTON DEBUG ===');
    //   console.log('Element:', element);
    //   console.log('Element classes:', element.className);
    //   console.log('Element tag:', element.tagName);
    //   console.log('Display:', computedStyle.display);
    //   console.log('All computed styles for hidden button:');
    //   const relevantProps = ['margin', 'padding', 'font-size', 'line-height', 'color', 'background-color', 'border-radius', 'border-width', 'width', 'height', 'z-index', 'opacity'];
    //   relevantProps.forEach(prop => {
    //     console.log(`${prop}: ${computedStyle.getPropertyValue(prop)}`);
    //   });
    //   console.log('=== END HIDDEN BUTTON DEBUG ===');
    // }
    
    const hasHardcodedValues = this.checkForHardcodedValues(computedStyle, element);
    
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

    // Use the direct CSS rule analysis approach
    const matchedRules = this.analyzeHardcodedRules(element, relevantProperties);
    
    if (matchedRules.length > 0) {
      console.log(`Found ${matchedRules.length} hardcoded rules for element:`, element.tagName, element.className || 'no-class');
      matchedRules.forEach(rule => {
        console.log(`${rule.selector} → ${rule.property}: ${rule.value}`);
      });
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
    
    // Debug: Check if the element is visible and has the class
    console.log('Highlighting element:', element);
    console.log('Element classes:', element.className);
    console.log('Element data attribute:', element.getAttribute('data-mds-hardcoded'));
    console.log('Element computed style display:', window.getComputedStyle(element).display);
    console.log('Element computed style border:', window.getComputedStyle(element).border);
    
    console.log('Element highlighted:', element);
  }

  // addTooltip(element) {
  //   const tooltip = document.createElement('div');
  //   tooltip.className = 'mds-style-inspector-tooltip';
  //   tooltip.textContent = 'Hardcoded CSS value detected';
  //   tooltip.style.cssText = `
  //     position: absolute;
  //     background: #ff4444;
  //     color: white;
  //     padding: 4px 8px;
  //     border-radius: 4px;
  //     font-size: 12px;
  //     z-index: 10000;
  //     pointer-events: none;
  //     white-space: nowrap;
  //     opacity: 0;
  //     transition: opacity 0.2s;
  //   `;
    
  //   document.body.appendChild(tooltip);
    
  //   element.addEventListener('mouseenter', () => {
  //     const rect = element.getBoundingClientRect();
  //     tooltip.style.left = rect.left + 'px';
  //     tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
  //     tooltip.style.opacity = '1';
  //   });
    
  //   element.addEventListener('mouseleave', () => {
  //     tooltip.style.opacity = '0';
  //   });
  // }

  clearHighlights() {
    this.highlightedElements.forEach(element => {
      element.classList.remove('mds-style-inspector-highlight');
      element.removeAttribute('data-mds-hardcoded');
    });
    
    this.highlightedElements.clear();
    
    // Remove tooltips
    const tooltips = document.querySelectorAll('.mds-style-inspector-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
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