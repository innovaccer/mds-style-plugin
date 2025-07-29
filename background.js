// Background script for MDS Style Inspector
// Automatically starts inspection when user navigates to new pages

// Track global auto-inspection state - ENABLED BY DEFAULT
let globalAutoInspectionEnabled = true;

// Function to start inspection on a tab with better error handling
function startInspectionOnTab(tabId) {
  console.log('MDS Style Inspector: Starting inspection for tab:', tabId);

  // First, check if the tab exists and is accessible
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error(
        'MDS Style Inspector: Tab not found or inaccessible:',
        tabId,
        chrome.runtime.lastError.message
      );
      return;
    }

    if (!tab.url || !tab.url.startsWith('http')) {
      console.log(
        'MDS Style Inspector: Tab is not a web page, skipping:',
        tabId,
        tab.url
      );
      return;
    }

    console.log(
      'MDS Style Inspector: Tab is valid, attempting to start inspection:',
      tabId,
      tab.url
    );

    // Wait longer for content script to be ready (especially after browser reload)
    setTimeout(() => {
      chrome.tabs.sendMessage(
        tabId,
        { action: 'startInspection' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(
              'MDS Style Inspector: Content script not ready, retrying in 3 seconds...',
              chrome.runtime.lastError.message
            );
            // Retry after a longer delay
            setTimeout(() => {
              chrome.tabs.sendMessage(
                tabId,
                { action: 'startInspection' },
                (retryResponse) => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      'MDS Style Inspector: Failed to start inspection after retry for tab:',
                      tabId,
                      chrome.runtime.lastError.message
                    );
                  } else if (retryResponse && retryResponse.success) {
                    console.log(
                      'MDS Style Inspector: Auto-inspection started successfully on retry for tab:',
                      tabId
                    );
                  } else {
                    console.error(
                      'MDS Style Inspector: Content script responded but failed to start inspection on retry for tab:',
                      tabId
                    );
                  }
                }
              );
            }, 3000);
          } else if (response && response.success) {
            console.log(
              'MDS Style Inspector: Auto-inspection started successfully for tab:',
              tabId
            );
          } else {
            console.error(
              'MDS Style Inspector: Content script responded but failed to start inspection for tab:',
              tabId,
              response
            );
          }
        }
      );
    }, 3000); // Increased delay to 3 seconds for browser reload scenarios
  });
}

// Function to safely stop inspection on a tab
function stopInspectionOnTab(tabId) {
  console.log('MDS Style Inspector: Stopping inspection for tab:', tabId);

  chrome.tabs.sendMessage(tabId, { action: 'stopInspection' }, (response) => {
    if (chrome.runtime.lastError) {
      // This is expected when content script is not available
      console.log(
        'MDS Style Inspector: Content script not available for tab:',
        tabId,
        chrome.runtime.lastError.message
      );
    } else if (response && response.success) {
      console.log(
        'MDS Style Inspector: Inspection stopped successfully for tab:',
        tabId
      );
    } else {
      console.log(
        'MDS Style Inspector: Content script responded but stop failed for tab:',
        tabId
      );
    }
  });
}

// Function to notify all content scripts of auto-inspection setting change
function notifyContentScriptsOfSettingChange() {
  chrome.tabs.query({}, (allTabs) => {
    allTabs.forEach((tab) => {
      if (tab.url && tab.url.startsWith('http')) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: 'updateAutoInspection',
            isEnabled: globalAutoInspectionEnabled,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              // This is expected when content script is not available
              console.log(
                'MDS Style Inspector: Content script not available for tab:',
                tab.id,
                chrome.runtime.lastError.message
              );
            }
          }
        );
      }
    });
  });
}

// Listen for tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only proceed if the page has finished loading and is a web page
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.startsWith('http')
  ) {
    console.log(
      'MDS Style Inspector: Page loaded for tab:',
      tabId,
      'Global auto-inspection:',
      globalAutoInspectionEnabled
    );

    // Only start auto-inspection if it's enabled
    if (globalAutoInspectionEnabled) {
      console.log(
        'MDS Style Inspector: Starting auto-inspection for tab:',
        tabId
      );
      startInspectionOnTab(tabId);
    } else {
      console.log(
        'MDS Style Inspector: Auto-inspection disabled, not starting for tab:',
        tabId
      );
    }
  }
});

// Listen for extension installation - start auto-inspection on all existing tabs
chrome.runtime.onInstalled.addListener((details) => {
  console.log(
    'MDS Style Inspector: Extension installed, starting auto-inspection on all tabs'
  );

  // Start auto-inspection on all existing tabs only if enabled
  if (globalAutoInspectionEnabled) {
    chrome.tabs.query({}, (allTabs) => {
      allTabs.forEach((tab) => {
        if (tab.url && tab.url.startsWith('http')) {
          console.log(
            'MDS Style Inspector: Starting auto-inspection on existing tab:',
            tab.id
          );
          startInspectionOnTab(tab.id);
        }
      });
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('MDS Style Inspector: Received message:', request.action);

  if (request.action === 'getAutoInspectionStatus') {
    // Return global auto-inspection status
    console.log(
      'MDS Style Inspector: Returning auto-inspection status:',
      globalAutoInspectionEnabled
    );
    sendResponse({ isEnabled: globalAutoInspectionEnabled });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'contentScriptReady') {
    // Content script is ready
    console.log(
      'MDS Style Inspector: Content script ready notification received from tab:',
      sender.tab?.id
    );
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'toggleAutoInspection') {
    console.log(
      'MDS Style Inspector: Toggling auto-inspection from:',
      globalAutoInspectionEnabled
    );

    // Toggle global auto-inspection state
    globalAutoInspectionEnabled = !globalAutoInspectionEnabled;

    // Notify all content scripts of the setting change
    notifyContentScriptsOfSettingChange();

    if (globalAutoInspectionEnabled) {
      // Enable auto-inspection - start on current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const tabId = tabs[0].id;
          console.log(
            'MDS Style Inspector: Enabling auto-inspection for current tab:',
            tabId
          );

          // Start inspection on current tab
          startInspectionOnTab(tabId);
        } else {
          console.error('MDS Style Inspector: No active tab found');
        }
      });
    } else {
      // Disable auto-inspection - stop on all tabs
      console.log('MDS Style Inspector: Disabling auto-inspection on all tabs');
      chrome.tabs.query({}, (allTabs) => {
        allTabs.forEach((tab) => {
          if (tab.url && tab.url.startsWith('http')) {
            stopInspectionOnTab(tab.id);
          }
        });
      });
    }

    console.log(
      'MDS Style Inspector: Auto-inspection toggled to:',
      globalAutoInspectionEnabled
    );
    sendResponse({ isEnabled: globalAutoInspectionEnabled });
    return true; // Keep message channel open for async response
  }
});
