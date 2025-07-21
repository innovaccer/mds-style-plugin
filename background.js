// Background script for MDS Style Inspector
// Automatically starts inspection when user navigates to new pages

// Track global auto-inspection state - ENABLED BY DEFAULT
let globalAutoInspectionEnabled = true;

// Function to start inspection on a tab
function startInspectionOnTab(tabId) {
  console.log('MDS Style Inspector: Starting inspection for tab:', tabId);
  
  // Wait a moment for the content script to be ready
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, { action: 'startInspection' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('MDS Style Inspector: Content script not ready, retrying in 2 seconds...');
        // Retry after a longer delay
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: 'startInspection' }, (retryResponse) => {
            if (chrome.runtime.lastError) {
              console.error('MDS Style Inspector: Failed to start inspection after retry for tab:', tabId);
            } else if (retryResponse && retryResponse.success) {
              console.log('MDS Style Inspector: Auto-inspection started successfully on retry for tab:', tabId);
            }
          });
        }, 2000);
      } else if (response && response.success) {
        console.log('MDS Style Inspector: Auto-inspection started successfully for tab:', tabId);
      }
    });
  }, 1500); // Increased delay to ensure content script is ready
}

// Listen for tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only proceed if the page has finished loading and is a web page
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    console.log('MDS Style Inspector: Page loaded for tab:', tabId, 'Global auto-inspection:', globalAutoInspectionEnabled);
    
    // Always start auto-inspection since it's enabled by default
    console.log('MDS Style Inspector: Starting auto-inspection for tab:', tabId);
    startInspectionOnTab(tabId);
  }
});

// Listen for extension installation - start auto-inspection on all existing tabs
chrome.runtime.onInstalled.addListener((details) => {
  console.log('MDS Style Inspector: Extension installed, starting auto-inspection on all tabs');
  
  // Start auto-inspection on all existing tabs
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach(tab => {
      if (tab.url && tab.url.startsWith('http')) {
        console.log('MDS Style Inspector: Starting auto-inspection on existing tab:', tab.id);
        startInspectionOnTab(tab.id);
      }
    });
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('MDS Style Inspector: Received message:', request.action);
  
  if (request.action === 'getAutoInspectionStatus') {
    // Return global auto-inspection status
    console.log('MDS Style Inspector: Returning auto-inspection status:', globalAutoInspectionEnabled);
    sendResponse({ isEnabled: globalAutoInspectionEnabled });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'toggleAutoInspection') {
    console.log('MDS Style Inspector: Toggling auto-inspection from:', globalAutoInspectionEnabled);
    
    // Toggle global auto-inspection state
    globalAutoInspectionEnabled = !globalAutoInspectionEnabled;
    
    if (globalAutoInspectionEnabled) {
      // Enable auto-inspection - start on current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        console.log('MDS Style Inspector: Enabling auto-inspection for current tab:', tabId);
        
        // Start inspection on current tab
        startInspectionOnTab(tabId);
      });
    } else {
      // Disable auto-inspection - stop on all tabs
      console.log('MDS Style Inspector: Disabling auto-inspection on all tabs');
      chrome.tabs.query({}, (allTabs) => {
        allTabs.forEach(tab => {
          if (tab.url && tab.url.startsWith('http')) {
            chrome.tabs.sendMessage(tab.id, { action: 'stopInspection' }, (response) => {
              if (chrome.runtime.lastError) {
                // Ignore errors for tabs without content script
              }
            });
          }
        });
      });
    }
    
    console.log('MDS Style Inspector: Auto-inspection toggled to:', globalAutoInspectionEnabled);
    sendResponse({ isEnabled: globalAutoInspectionEnabled });
    return true; // Keep message channel open for async response
  }
}); 