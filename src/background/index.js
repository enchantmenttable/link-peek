import { MSG } from '../shared/constants.js';

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
        'Accept': 'text/html,application/xhtml+xml',
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
