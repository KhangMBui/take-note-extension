console.log("Take Notey Pro content script loaded");

// Detect page changes and notify the extension
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    chrome.runtime.sendMessage({ type: 'URL_CHANGE', url: lastUrl });
  }
}, 1000);