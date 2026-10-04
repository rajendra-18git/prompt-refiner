/**
 * Nova AI – Prompt Refiner Background Service Worker
 * Configures Chrome Side Panel to automatically open when user clicks the extension action icon.
 */

// Enable opening side panel on extension icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.log('Side panel initialization notice:', error));
