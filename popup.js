document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');
  const hardcodedCount = document.getElementById('hardcodedCount');
  const inspectedCount = document.getElementById('inspectedCount');

  // Check current state when popup opens
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
      if (response && response.isActive) {
        updateUI(true, response.stats);
      } else {
        updateUI(false, { hardcodedCount: 0, inspectedCount: 0 });
      }
    });
  });

  startBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startInspection'}, function(response) {
        if (response && response.success) {
          updateUI(true, response.stats);
        }
      });
    });
  });

  stopBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopInspection'}, function(response) {
        if (response && response.success) {
          updateUI(false, response.stats);
        }
      });
    });
  });

  testBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'testHighlight'}, function(response) {
        if (response && response.success) {
          console.log('Test highlight completed');
          // Update stats after test with a longer delay to ensure processing is complete
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
              if (response) {
                // Show test results but keep UI in inactive state
                updateUI(false, response.stats);
                // Provide user feedback
                status.textContent = `Test completed: Found ${response.stats.hardcodedCount} hardcoded values`;
                status.className = 'status test-complete';
              }
            });
          }, 200);
        } else {
          console.error('Test highlight failed');
          status.textContent = 'Test failed - check console for errors';
          status.className = 'status error';
        }
      });
    });
  });

  function updateUI(isActive, stats = {}) {
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

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStats') {
      updateUI(true, request.stats);
    }
  });
}); 