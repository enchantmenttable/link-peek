import { MSG } from '../shared/constants.js';

// Context menu for links
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'peek-link',
    title: 'Open in Peek Panel',
    contexts: ['link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'peek-link' && info.linkUrl && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: MSG.OPEN_PEEK_PANEL,
      url: info.linkUrl,
    });
  }
});

// Keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-note') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: MSG.OPEN_PAGE_NOTE });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.FETCH_URL) {
    handleFetchUrl(message.url).then(sendResponse);
    return true; // keep channel open for async response
  }

  if (message.type === MSG.OPEN_BACKGROUND_TAB) {
    chrome.tabs.create({ url: message.url, active: false });
    sendResponse({ success: true });
  }
});

async function handleFetchUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { success: false, error: 'Not an HTML page' };
    }

    const html = await response.text();
    return { success: true, html };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch' };
  }
}
