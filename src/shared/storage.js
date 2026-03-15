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

// Notes — keyed by normalised URL (origin + pathname, no query/hash)
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

export async function getNotes() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.NOTES);
  const notes = result[STORAGE_KEYS.NOTES];
  // Migration: old format was an array, new format is an object keyed by URL
  if (Array.isArray(notes)) {
    await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: {} });
    return {};
  }
  return notes || {};
}

export async function getNoteForUrl(url) {
  const notes = await getNotes();
  return notes[normalizeUrl(url)] || null;
}

export async function saveNoteForUrl(url, { title, content }) {
  const notes = await getNotes();
  const key = normalizeUrl(url);
  const existing = notes[key];
  notes[key] = {
    title: title || '',
    content,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: notes });
}

export async function deleteNoteForUrl(url) {
  const notes = await getNotes();
  delete notes[normalizeUrl(url)];
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTES]: notes });
}
