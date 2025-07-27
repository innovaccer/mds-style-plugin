document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  // const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');
  const hardcodedCount = document.getElementById('hardcodedCount');
  const inspectedCount = document.getElementById('inspectedCount');
  const autoToggle = document.getElementById('autoToggle');
  const autoStatus = document.getElementById('autoStatus');

  // Check auto-inspection status when popup opens
  chrome.runtime.sendMessage({ action: 'getAutoInspectionStatus' }, function(response) {
    console.log('Popup: Auto-inspection status response:', response);
    if (response && response.isEnabled) {
      console.log('Popup: Enabling auto-inspection UI');
      updateAutoInspectionUI(true);
    } else {
      console.log('Popup: Disabling auto-inspection UI');
      updateAutoInspectionUI(false);
    }
  });

  // Check current state when popup opens
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log('Popup: Checking current tab status for tab:', tabs[0].id);
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
      console.log('Popup: Tab status response:', response);
      if (response && response.isActive) {
        currentInspectionState = true;
        updateUI(true, response.stats);
      } else {
        currentInspectionState = false;
        updateUI(false, { hardcodedCount: 0, inspectedCount: 0 });
      }
    });
  });

  // Auto-inspection toggle
  autoToggle.addEventListener('click', function() {
    console.log('Popup: Toggling auto-inspection...');
    chrome.runtime.sendMessage({ action: 'toggleAutoInspection' }, function(response) {
      console.log('Popup: Toggle response:', response);
      if (response) {
        updateAutoInspectionUI(response.isEnabled);
      }
    });
  });

  startBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startInspection'}, function(response) {
        if (response && response.success) {
          currentInspectionState = true;
          updateUI(true, response.stats);
        }
      });
    });
  });

  stopBtn.addEventListener('click', function() {
    // Immediately update UI to inactive state
    currentInspectionState = false;
    updateUI(false, { hardcodedCount: 0, inspectedCount: 0 });
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopInspection'}, function(response) {
        if (response && response.success) {
          // Update stats with the final values from the content script
          updateUI(false, response.stats);
        } else {
          console.log('Stop inspection response:', response);
        }
      });
    });
  });

  // testBtn.addEventListener('click', function() {
  //   chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  //     chrome.tabs.sendMessage(tabs[0].id, {action: 'testHighlight'}, function(response) {
  //       if (response && response.success) {
  //         console.log('Test highlight completed');
  //         // Update stats after test with a longer delay to ensure processing is complete
  //         setTimeout(() => {
  //           chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
  //             if (response) {
  //               // Show test results but keep UI in inactive state
  //               updateUI(false, response.stats);
  //               // Provide user feedback
  //               status.textContent = `Test completed: Found ${response.stats.hardcodedCount} hardcoded values`;
  //               status.className = 'status test-complete';
  //             }
  //           });
  //         }, 200);
  //       } else {
  //         console.error('Test highlight failed');
  //         status.textContent = 'Test failed - check console for errors';
  //         status.className = 'status error';
  //       }
  //     });
  //   });
  // });

  function updateAutoInspectionUI(isEnabled) {
    if (isEnabled) {
      autoToggle.classList.add('active');
      autoStatus.textContent = 'Auto-inspection is enabled';
    } else {
      autoToggle.classList.remove('active');
      autoStatus.textContent = 'Auto-inspection is disabled';
    }
  }

  function updateUI(isActive, stats = {}) {
    // Track current inspection state
    currentInspectionState = isActive;
    
    if (isActive) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      status.textContent = 'Inspection is active';
      status.className = 'status active';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      status.textContent = 'Inspection is inactive';
      status.className = 'status inactive';
    }

    if (stats) {
      hardcodedCount.textContent = stats.hardcodedCount || 0;
      inspectedCount.textContent = stats.inspectedCount || 0;
    }
  }

  // Track current inspection state
  let currentInspectionState = false;

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStats') {
      // Only update UI to active state if inspection is actually active
      // Otherwise just update the stats without changing the UI state
      if (currentInspectionState) {
        updateUI(true, request.stats);
      } else {
        // Update stats without changing UI state
        if (request.stats) {
          hardcodedCount.textContent = request.stats.hardcodedCount || 0;
          inspectedCount.textContent = request.stats.inspectedCount || 0;
        }
      }
    }
  });
}); 