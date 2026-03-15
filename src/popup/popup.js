import { getSettings, saveSettings, getDisabledSites, setDisabledSites } from '../shared/storage.js';

const siteToggle = document.getElementById('site-toggle');
const siteName = document.getElementById('site-name');
const modeButtons = document.querySelectorAll('.mode-btn');
const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const themeButtons = document.querySelectorAll('.theme-btn');

let currentSettings = null;
let currentHostname = null;

async function init() {
  // Set OS-specific labels
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  document.getElementById('alt-hover-btn').textContent = isMac ? '⌥ + Hover' : 'Alt + Hover';

  // Load current note shortcut
  const commands = await chrome.commands.getAll();
  const noteCmd = commands.find(c => c.name === 'open-note');
  const shortcutEl = document.getElementById('note-shortcut');
  if (noteCmd?.shortcut) {
    // Format shortcut for display (e.g., "MacCtrl+N" → "⌃N", "Alt+N" → "Alt+N")
    let display = noteCmd.shortcut;
    if (isMac) {
      display = display.replace('MacCtrl', '⌃').replace('Ctrl', '⌃').replace('Alt', '⌥').replace('Shift', '⇧').replace('Command', '⌘').replace(/\+/g, '');
    }
    shortcutEl.textContent = display;
  } else {
    shortcutEl.textContent = 'Not set';
  }

  // Change shortcuts link
  document.getElementById('change-shortcuts').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  // Get current tab's hostname
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      currentHostname = new URL(tab.url).hostname;
      siteName.textContent = currentHostname;
    } catch {
      siteName.textContent = 'N/A';
    }
  }

  // Load settings
  currentSettings = await getSettings();
  const disabledSites = await getDisabledSites();

  // Site toggle
  const siteEnabled = !disabledSites.includes(currentHostname);
  setToggleState(siteToggle, siteEnabled);

  // Trigger mode buttons
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentSettings.triggerMode);
  });

  // Size inputs
  widthInput.value = currentSettings.defaultWidth;
  heightInput.value = currentSettings.defaultHeight;

  // Theme buttons
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === currentSettings.theme);
  });

  // Apply theme to popup
  applyPopupTheme(currentSettings.theme);

  // Event listeners
  siteToggle.addEventListener('click', async () => {
    const isActive = siteToggle.classList.contains('active');
    const newEnabled = !isActive;
    setToggleState(siteToggle, newEnabled);

    const sites = await getDisabledSites();
    if (newEnabled) {
      const idx = sites.indexOf(currentHostname);
      if (idx !== -1) sites.splice(idx, 1);
    } else {
      if (!sites.includes(currentHostname)) sites.push(currentHostname);
    }
    await setDisabledSites(sites);
  });

  modeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.triggerMode = btn.dataset.mode;
      await saveSettings(currentSettings);
    });
  });

  widthInput.addEventListener('change', async () => {
    const val = parseInt(widthInput.value, 10);
    if (val >= 300 && val <= 1200) {
      currentSettings.defaultWidth = val;
      await saveSettings(currentSettings);
    }
  });

  heightInput.addEventListener('change', async () => {
    const val = parseInt(heightInput.value, 10);
    if (val >= 200 && val <= 900) {
      currentSettings.defaultHeight = val;
      await saveSettings(currentSettings);
    }
  });

  themeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettings.theme = btn.dataset.theme;
      applyPopupTheme(currentSettings.theme);
      await saveSettings(currentSettings);
    });
  });

  document.getElementById('open-notes-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function applyPopupTheme(theme) {
  let isDark = false;
  if (theme === 'dark') {
    isDark = true;
  } else if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.body.classList.toggle('dark', isDark);
}

function setToggleState(toggle, active) {
  toggle.classList.toggle('active', active);
  toggle.setAttribute('aria-checked', active);
}

init();
