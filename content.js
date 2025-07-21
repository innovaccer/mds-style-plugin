// MDS Style Inspector Content Script

// Prevent multiple instances
if (window.mdsStyleInspector) {
  console.log('MDS Style Inspector: Already initialized, skipping...');
} else {
  window.mdsStyleInspector = true;

  // Global auto-inspection state - will be updated from background script
  let globalAutoInspectionEnabled = true;

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
        
        // Position tooltip at bottom-right of element
        let left = rect.right + 10; // 10px to the right of element
        let top = rect.bottom + 10; // 10px below element
        
        // Adjust if tooltip would go off screen
        const tooltipWidth = 250; // max-width from CSS
        const tooltipHeight = 200; // approximate height
        
        // If tooltip would go off right edge, position it to the left of element
        if (left + tooltipWidth > window.innerWidth) {
          left = rect.left - tooltipWidth - 10;
        }
        
        // If tooltip would go off bottom edge, position it above element
        if (top + tooltipHeight > window.innerHeight) {
          top = rect.top - tooltipHeight - 10;
        }
        
        // Ensure tooltip doesn't go off left edge
        if (left < 10) {
          left = 10;
        }
        
        // Ensure tooltip doesn't go off top edge
        if (top < 10) {
          top = 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
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
      
      // Add debouncing and throttling properties
      this.mutationDebounceTimer = null;
      this.inspectionThrottleTimer = null;
      this.pendingElements = new Set(); // Elements waiting to be inspected
      this.lastInspectionTime = 0;
      this.minInspectionInterval = 200; // Increased minimum interval to 200ms
      
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
      
      // React-specific element filtering
      this.reactElementPatterns = [
        /^__react/,
        /^react-/,
        /^data-react/,
        /^reactid$/,
        /^react-devtools/,
        /^react-/
      ];
      
      this.init();
    }

    init() {
      console.log('MDS Style Inspector: Initializing content script...');
      
      // Listen for messages from popup and background script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('MDS Style Inspector: Content script received message:', request.action);
        
        try {
          switch (request.action) {
            case 'startInspection':
              console.log('MDS Style Inspector: Starting inspection from message');
              this.startInspection();
              sendResponse({ success: true, stats: this.stats });
              break;
            case 'stopInspection':
              console.log('MDS Style Inspector: Stopping inspection from message');
              this.stopInspection();
              sendResponse({ success: true, stats: this.stats });
              break;
            case 'getStatus':
              console.log('MDS Style Inspector: Returning status:', { isActive: this.isActive, stats: this.stats });
              sendResponse({ isActive: this.isActive, stats: this.stats });
              break;
            case 'testHighlight':
              console.log('MDS Style Inspector: Running test highlight');
              this.testHighlight();
              sendResponse({ success: true });
              break;
            case 'updateAutoInspection':
              console.log('MDS Style Inspector: Updating auto-inspection setting:', request.isEnabled);
              globalAutoInspectionEnabled = request.isEnabled;
              sendResponse({ success: true });
              break;
            default:
              console.log('MDS Style Inspector: Unknown message action:', request.action);
              sendResponse({ success: false, error: 'Unknown action' });
              break;
          }
        } catch (error) {
          console.error('MDS Style Inspector: Error handling message:', error);
          sendResponse({ success: false, error: error.message });
        }
        
        return true; // Keep message channel open for async response
      });
      
      // Clean up when page is unloaded
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
      
      // Reset state when page loads to ensure fresh inspection
      window.addEventListener('load', () => {
        console.log('Step 2: Style Inspector: Page loaded, resetting state');
        this.isActive = false;
        this.stats.hardcodedCount = 0;
        this.stats.inspectedCount = 0;
        this.inspectedElements.clear();
        this.highlightedElements.clear();
        this.hardcodedProperties.clear();
        this.pendingElements.clear();
        
        // Get current auto-inspection setting from background script
        this.getAutoInspectionStatusAndStart();
      });
      
      console.log('Step 1: Style Inspector: Content script initialized and ready');
      
      // Send a ready signal to background script
      setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ action: 'contentScriptReady' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('MDS Style Inspector: Could not notify background script of readiness:', chrome.runtime.lastError.message);
            } else {
              console.log('MDS Style Inspector: Background script notified of content script readiness');
            }
          });
        } catch (error) {
          // Handle extension context invalidation
          if (error.message && error.message.includes('Extension context invalidated')) {
            console.log('MDS Style Inspector: Extension context invalidated, skipping ready notification');
          } else {
            console.error('MDS Style Inspector: Error sending ready notification:', error);
          }
        }
      }, 100);
    }

    getAutoInspectionStatusAndStart() {
      console.log('MDS Style Inspector: Getting auto-inspection status from background...');
      
      // Use callback-style instead of Promise to avoid potential issues
      try {
        chrome.runtime.sendMessage({ action: 'getAutoInspectionStatus' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('MDS Style Inspector: Could not get auto-inspection status, defaulting to enabled:', chrome.runtime.lastError.message);
            // Default to enabled if we can't get the status
            if (globalAutoInspectionEnabled !== false) {
              console.log('MDS Style Inspector: Auto-starting inspection on page load (default)');
              setTimeout(() => {
                this.startInspection();
              }, 1000);
            }
          } else if (response && response.isEnabled !== undefined) {
            globalAutoInspectionEnabled = response.isEnabled;
            console.log('MDS Style Inspector: Auto-inspection setting from background:', globalAutoInspectionEnabled);
            
            // Auto-start inspection if enabled
            if (globalAutoInspectionEnabled) {
              console.log('MDS Style Inspector: Auto-starting inspection on page load');
              setTimeout(() => {
                this.startInspection();
              }, 1000);
            } else {
              console.log('MDS Style Inspector: Auto-inspection disabled, not starting');
            }
          } else {
            console.log('MDS Style Inspector: Invalid response from background, defaulting to enabled');
            // Default to enabled if response is invalid
            if (globalAutoInspectionEnabled !== false) {
              console.log('MDS Style Inspector: Auto-starting inspection on page load (default)');
              setTimeout(() => {
                this.startInspection();
              }, 1000);
            }
          }
        });
      } catch (error) {
        // Handle extension context invalidation
        if (error.message && error.message.includes('Extension context invalidated')) {
          console.log('MDS Style Inspector: Extension context invalidated, defaulting to enabled');
          if (globalAutoInspectionEnabled !== false) {
            console.log('MDS Style Inspector: Auto-starting inspection on page load (default)');
            setTimeout(() => {
              this.startInspection();
            }, 1000);
          }
        } else {
          console.error('MDS Style Inspector: Error getting auto-inspection status:', error);
        }
      }
    }

    cleanup() {
      // Stop inspection if active
      if (this.isActive) {
        this.stopInspection();
      }
      
      // Clear all timers
      if (this.mutationDebounceTimer) {
        clearTimeout(this.mutationDebounceTimer);
      }
      
      if (this.inspectionThrottleTimer) {
        clearTimeout(this.inspectionThrottleTimer);
      }
      
      // Clear all tooltips
      this.tooltip.clearAllTooltips();
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
      console.log('Step 3: Style Inspector: Starting inspection...', { isActive: this.isActive, url: window.location.href });
      
      // Reset state for new page inspection
      if (this.isActive) {
        console.log('MDS Style Inspector: Resetting state for new page inspection');
        this.clearHighlights();
        this.stats.hardcodedCount = 0;
        this.stats.inspectedCount = 0;
        this.inspectedElements.clear();
        this.hardcodedProperties.clear();
        this.pendingElements.clear();
      }
      
      this.isActive = true;
      
      // Clear previous highlights
      this.clearHighlights();
      
      // Start inspection
      this.inspectPage();
      
      // Set up mutation observer to watch for DOM changes
      this.setupMutationObserver();
      
      console.log('MDS Style Inspector: Inspection started');
      
      // Debug: Check if CSS is loaded
      setTimeout(() => {
        const testElement = document.createElement('div');
        testElement.className = 'mds-style-inspector-highlight';
        testElement.style.position = 'absolute';
        testElement.style.top = '-9999px';
        testElement.style.left = '-9999px';
        document.body.appendChild(testElement);
        
        const computedStyle = window.getComputedStyle(testElement);
        console.log('CSS Debug - Outline:', computedStyle.outline);
        console.log('CSS Debug - Animation:', computedStyle.animation);
        
        testElement.remove();
      }, 1000);
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
      
      // Clear all timers
      if (this.mutationDebounceTimer) {
        clearTimeout(this.mutationDebounceTimer);
        this.mutationDebounceTimer = null;
      }
      
      if (this.inspectionThrottleTimer) {
        clearTimeout(this.inspectionThrottleTimer);
        this.inspectionThrottleTimer = null;
      }
      
      // Reset stats and tracking
      this.stats.hardcodedCount = 0;
      this.stats.inspectedCount = 0;
      this.inspectedElements.clear();
      this.hardcodedProperties.clear(); // Clear stored properties
      this.pendingElements.clear(); // Clear pending elements
      this.lastInspectionTime = 0;
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
        
        // Clear existing debounce timer
        if (this.mutationDebounceTimer) {
          clearTimeout(this.mutationDebounceTimer);
        }
        
        // Debounce mutations to prevent excessive processing
        this.mutationDebounceTimer = setTimeout(() => {
          this.processMutations(mutations);
        }, 200); // Increased debounce delay to 200ms
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('Mutation observer set up with debouncing');
    }

    processMutations(mutations) {
      const newElements = new Set();
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Filter out React internal elements and already inspected elements
              if (this.shouldInspectElement(node)) {
                newElements.add(node);
              }
            }
          });
        }
      });
      
      // Add new elements to pending queue
      newElements.forEach(element => {
        this.pendingElements.add(element);
      });
      
      // Throttle the inspection process
      this.scheduleInspection();
    }

    shouldInspectElement(element) {
      // Skip if already inspected
      if (this.inspectedElements.has(element)) {
        return false;
      }
      
      // Skip inspector's own elements to prevent infinite loops
      if (element.classList && (
        element.classList.contains('mds-style-inspector-highlight') ||
        element.classList.contains('mds-style-inspector-tooltip') ||
        element.classList.contains('mds-style-inspector-tooltip-content')
      )) {
        return false;
      }
      
      // Skip elements with inspector's data attributes
      if (element.hasAttribute('data-mds-hardcoded')) {
        return false;
      }
      
      // Skip React internal elements
      if (this.isReactInternalElement(element)) {
        return false;
      }
      
      // Skip non-stylable elements
      const nonStylableTags = ['SCRIPT', 'META', 'TITLE', 'STYLE', 'LINK', 'HEAD', 'NOSCRIPT'];
      if (nonStylableTags.includes(element.tagName)) {
        return false;
      }
      
      // Skip elements that are likely React internal
      if (element.id && this.reactElementPatterns.some(pattern => pattern.test(element.id))) {
        return false;
      }
      
      // Skip elements with React-specific attributes
      if (element.hasAttribute('data-reactroot') || 
          element.hasAttribute('data-reactid') ||
          element.hasAttribute('data-reactdevtools')) {
        return false;
      }
      
      return true;
    }

    isReactInternalElement(element) {
      // Check for React-specific class names using classList (more reliable)
      if (element.classList && element.classList.length > 0) {
        return Array.from(element.classList).some(className => 
          this.reactElementPatterns.some(pattern => pattern.test(className))
        );
      }
      
      // Fallback: check className if classList is not available
      if (element.className) {
        // Handle both string and DOMTokenList cases
        let classes;
        if (typeof element.className === 'string') {
          classes = element.className.split(' ');
        } else if (element.className instanceof DOMTokenList) {
          classes = Array.from(element.className);
        } else {
          // Fallback: try to convert to string
          classes = String(element.className).split(' ');
        }
        
        return classes.some(className => 
          this.reactElementPatterns.some(pattern => pattern.test(className))
        );
      }
      
      return false;
    }

    scheduleInspection() {
      // Clear existing throttle timer
      if (this.inspectionThrottleTimer) {
        clearTimeout(this.inspectionThrottleTimer);
      }
      
      // Throttle inspections to prevent excessive processing
      this.inspectionThrottleTimer = setTimeout(() => {
        this.processPendingElements();
      }, 300); // Increased throttle delay to 300ms
    }

    processPendingElements() {
      if (this.pendingElements.size === 0) {
        return;
      }
      
      const now = Date.now();
      if (now - this.lastInspectionTime < this.minInspectionInterval) {
        // Reschedule if we're still within the minimum interval
        this.scheduleInspection();
        return;
      }
      
      this.lastInspectionTime = now;
      
      // Process up to 5 elements at a time to prevent blocking (reduced from 10)
      const elementsToProcess = Array.from(this.pendingElements).slice(0, 5);
      
      elementsToProcess.forEach(element => {
        this.pendingElements.delete(element);
        this.inspectElement(element);
      });
      
      // If there are more elements to process, schedule another batch
      if (this.pendingElements.size > 0) {
        this.scheduleInspection();
      }
    }

    inspectPage() {
      const allElements = document.querySelectorAll('*');
      console.log(`Found ${allElements.length} total elements`);
      
      // Debug: Log all elements being inspected vs skipped
      console.log('Elements analysis:');
      let inspectedCount = 0;
      let skippedCount = 0;
      
      allElements.forEach((element, index) => {
        // Use the new filtering logic
        const shouldInspect = this.shouldInspectElement(element);
        
        if (shouldInspect) {
          inspectedCount++;
          console.log(`${inspectedCount}. INSPECTING: ${element.tagName}${element.className ? ' (class: ' + element.className + ')' : ''}${element.id ? ' (id: ' + element.id + ')' : ''}`);
        } else {
          skippedCount++;
          console.log(`SKIPPED: ${element.tagName}${element.className ? ' (class: ' + element.className + ')' : ''}${element.id ? ' (id: ' + element.id + ')' : ''}`);
        }
      });
      
      console.log(`Will inspect ${inspectedCount} stylable elements, skip ${skippedCount} non-stylable elements`);
      
      // Process elements in batches to prevent blocking
      const elementsToInspect = Array.from(allElements).filter(element => this.shouldInspectElement(element));
      
      // Process in batches of 20 to prevent blocking the UI
      const batchSize = 20;
      let currentBatch = 0;
      
      const processBatch = () => {
        const start = currentBatch * batchSize;
        const end = Math.min(start + batchSize, elementsToInspect.length);
        const batch = elementsToInspect.slice(start, end);
        
        batch.forEach(element => {
          this.inspectElement(element);
        });
        
        currentBatch++;
        
        // If there are more elements to process, schedule the next batch
        if (end < elementsToInspect.length) {
          setTimeout(processBatch, 10); // Small delay between batches
        }
      };
      
      // Start processing batches
      if (elementsToInspect.length > 0) {
        processBatch();
      }
    }

    inspectElement(element) {
      if (!this.isActive) {
        return;
      }
      
      if (!element || element === document.documentElement || element === document.body) {
        return;
      }

      // Use the new filtering logic instead of redundant checks
      if (!this.shouldInspectElement(element)) {
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
      // Skip inspector's own elements
      if (element.classList && (
        element.classList.contains('mds-style-inspector-highlight') ||
        element.classList.contains('mds-style-inspector-tooltip') ||
        element.classList.contains('mds-style-inspector-tooltip-content')
      )) {
        return false;
      }
      
      // Skip elements with inspector's data attributes
      if (element.hasAttribute('data-mds-hardcoded')) {
        return false;
      }
      
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
      // Skip inspector's own elements
      if (element.classList && (
        element.classList.contains('mds-style-inspector-highlight') ||
        element.classList.contains('mds-style-inspector-tooltip') ||
        element.classList.contains('mds-style-inspector-tooltip-content')
      )) {
        return [];
      }
      
      // Skip elements with inspector's data attributes
      if (element.hasAttribute('data-mds-hardcoded')) {
        return [];
      }
      
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

      // Debug: Log the element and property being checked (only in verbose mode)
      // console.log(`Checking ${property} = ${value} for element:`, element.tagName, element.className || 'no-class');

      // Check if value contains design tokens
      const hasTokens = this.tokenPatterns.some(pattern => pattern.test(value));
      if (hasTokens) {
        // console.log(`Skipping design token: ${property} = ${value}`);
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
        console.log('Element already highlighted, skipping:', element.tagName, element.className);
        return; // Already highlighted
      }
      
      // Additional safety check: don't highlight inspector's own elements
      if (element.classList && (
        element.classList.contains('mds-style-inspector-highlight') ||
        element.classList.contains('mds-style-inspector-tooltip') ||
        element.classList.contains('mds-style-inspector-tooltip-content')
      )) {
        console.log('Skipping inspector element:', element.tagName, element.className);
        return;
      }
      
      // Additional safety check: don't highlight elements with inspector's data attributes
      if (element.hasAttribute('data-mds-hardcoded')) {
        console.log('Element already has hardcoded attribute, skipping:', element.tagName, element.className);
        return;
      }

      console.log('Highlighting element:', element.tagName, element.className || 'no-class', element.id || 'no-id');
      
      this.highlightedElements.add(element);
      
      // Add highlight class
      element.classList.add('mds-style-inspector-highlight');
      
      // Add data attribute for identification
      element.setAttribute('data-mds-hardcoded', 'true');
      
      // Add tooltip functionality
      this.tooltip.attachTooltip(element, this.hardcodedProperties.get(element));
      
      // Force a repaint to ensure the highlight is visible
      element.offsetHeight; // Trigger reflow
      
      // Debug: Check if the element is visible and has the class
      console.log('Element classes after highlighting:', element.className);
      console.log('Element data attribute after highlighting:', element.getAttribute('data-mds-hardcoded'));
      console.log('Element computed style display:', window.getComputedStyle(element).display);
      console.log('Element computed style outline:', window.getComputedStyle(element).outline);
      
      // Verify the highlight is applied
      const hasHighlightClass = element.classList.contains('mds-style-inspector-highlight');
      const hasDataAttribute = element.hasAttribute('data-mds-hardcoded');
      const computedOutline = window.getComputedStyle(element).outline;
      
      console.log('Highlight verification:', {
        hasHighlightClass,
        hasDataAttribute,
        computedOutline,
        elementVisible: element.offsetWidth > 0 || element.offsetHeight > 0
      });
      
      console.log('Element highlighted successfully:', element);
    }

    clearHighlights() {
      console.log('Clearing highlights, count:', this.highlightedElements.size);
      
      this.highlightedElements.forEach(element => {
        element.classList.remove('mds-style-inspector-highlight');
        element.removeAttribute('data-mds-hardcoded');
        // Remove tooltip if it exists
        this.tooltip.removeTooltip(element);
      });
      
      this.highlightedElements.clear();
      this.hardcodedProperties.clear(); // Clear stored properties
      this.tooltip.clearAllTooltips(); // Clear all tooltips
      
      console.log('Highlights cleared');
    }

    updateStats() {
      // Send stats update to popup if it's open
      try {
        chrome.runtime.sendMessage({
          action: 'updateStats',
          stats: this.stats
        }).catch(() => {
          // Ignore errors if popup is not open or extension context is invalid
        });
      } catch (error) {
        // Handle extension context invalidation
        if (error.message && error.message.includes('Extension context invalidated')) {
          console.log('MDS Style Inspector: Extension context invalidated, skipping stats update');
        } else {
          console.error('MDS Style Inspector: Error updating stats:', error);
        }
      }
    }
  }

  // Initialize the inspector when the content script loads
  const inspector = new StyleInspector();
} 