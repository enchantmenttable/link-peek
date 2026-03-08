import { DEFAULTS, STORAGE_KEYS } from './constants.js';

export async function getSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULTS, ...result[STORAGE_KEYS.SETTINGS] };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function getDisabledSites() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DISABLED_SITES);
  return result[STORAGE_KEYS.DISABLED_SITES] || [];
}

export async function setDisabledSites(sites) {
  await chrome.storage.local.set({ [STORAGE_KEYS.DISABLED_SITES]: sites });
}

export async function isSiteDisabled(hostname) {
  const sites = await getDisabledSites();
  return sites.includes(hostname);
}

export async function toggleSite(hostname) {
  const sites = await getDisabledSites();
  const index = sites.indexOf(hostname);
  if (index === -1) {
    sites.push(hostname);
  } else {
    sites.splice(index, 1);
  }
  await setDisabledSites(sites);
  return index === -1; // returns true if site was disabled (added)
}
