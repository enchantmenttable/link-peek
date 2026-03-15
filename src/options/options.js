import { getSettings, getNotes, saveNoteForUrl, deleteNoteForUrl } from '../shared/storage.js';

const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const noteCount = document.getElementById('note-count');
const listView = document.getElementById('list-view');
const listToolbar = document.getElementById('list-toolbar');
const editorView = document.getElementById('editor-view');
const backBtn = document.getElementById('back-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const exportNoteBtn = document.getElementById('export-note-btn');
const exportAllBtn = document.getElementById('export-all-btn');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const noteUrl = document.getElementById('note-url');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');

const undoToast = document.getElementById('undo-toast');
const undoBtn = document.getElementById('undo-btn');
const undoTimerBar = document.getElementById('undo-timer-bar');

let currentUrl = null;
let saveTimer = null;
let cachedNotes = null;
let undoTimeout = null;
let undoData = null; // { url, note }

async function init() {
  const settings = await getSettings();
  applyTheme(settings.theme);

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings?.newValue?.theme) {
      applyTheme(changes.settings.newValue.theme);
    }
    if (changes.notes) {
      cachedNotes = changes.notes.newValue || {};
      if (editorView.classList.contains('hidden')) {
        renderFiltered();
      }
    }
  });

  backBtn.addEventListener('click', async () => {
    await flushSave();
    showList();
  });

  deleteNoteBtn.addEventListener('click', async () => {
    if (!currentUrl) return;
    const urlToDelete = currentUrl;
    const noteBackup = { title: noteTitleInput.value, content: noteContentInput.value };
    await deleteNoteForUrl(urlToDelete);
    showList();
    showUndoToast(urlToDelete, noteBackup);
  });

  exportNoteBtn.addEventListener('click', () => {
    if (!currentUrl) return;
    const md = noteToMarkdown(currentUrl, {
      title: noteTitleInput.value,
      content: noteContentInput.value,
    });
    const filename = slugify(noteTitleInput.value || currentUrl) + '.md';
    downloadFile(filename, md);
  });

  exportAllBtn.addEventListener('click', async () => {
    const notes = await getNotes();
    const entries = Object.entries(notes);
    if (entries.length === 0) return;

    const parts = entries
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([url, note]) => noteToMarkdown(url, note));

    downloadFile('link-peek-notebook.md', parts.join('\n\n---\n\n'));
  });

  noteTitleInput.addEventListener('input', debouncedSave);
  noteContentInput.addEventListener('input', debouncedSave);

  searchInput.addEventListener('input', () => renderFiltered());
  sortSelect.addEventListener('change', () => renderFiltered());

  renderList();
}

function applyTheme(theme) {
  let isDark = false;
  if (theme === 'dark') isDark = true;
  else if (theme === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.body.classList.toggle('dark', isDark);
}

async function renderList() {
  cachedNotes = await getNotes();
  searchInput.value = '';
  renderFiltered();
}

function renderFiltered() {
  const notes = cachedNotes || {};
  const query = (searchInput.value || '').toLowerCase().trim();
  const sortBy = sortSelect.value;

  notesList.innerHTML = '';

  let entries = Object.entries(notes);
  noteCount.textContent = entries.length === 0 ? '' : entries.length + (entries.length === 1 ? ' note' : ' notes');

  if (entries.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.textContent = 'No notes yet';
    listToolbar.style.display = 'none';
    return;
  }

  listToolbar.style.display = '';

  // Filter by search query
  if (query) {
    entries = entries.filter(([url, note]) => {
      const title = (note.title || '').toLowerCase();
      const content = (note.content || '').toLowerCase();
      const u = url.toLowerCase();
      return title.includes(query) || content.includes(query) || u.includes(query);
    });
  }

  if (entries.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.textContent = 'No matching notes';
    return;
  }

  emptyState.classList.add('hidden');

  // Sort
  if (sortBy === 'created') {
    entries.sort((a, b) => (b[1].createdAt || b[1].updatedAt) - (a[1].createdAt || a[1].updatedAt));
  } else {
    entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  }

  entries.forEach(([url, note]) => {
    const card = document.createElement('div');
    card.className = 'note-card';

    const body = document.createElement('div');
    body.className = 'note-card-body';

    const title = document.createElement('div');
    title.className = 'note-card-title';
    title.textContent = note.title || 'Untitled';

    const urlLine = document.createElement('div');
    urlLine.className = 'note-card-url';
    urlLine.textContent = url;

    const preview = document.createElement('div');
    preview.className = 'note-card-preview';
    preview.textContent = (note.content || '').slice(0, 200);

    body.appendChild(title);
    body.appendChild(urlLine);
    body.appendChild(preview);

    // Overlay bar (date + actions, visible on hover)
    const overlay = document.createElement('div');
    overlay.className = 'note-card-overlay';

    const date = document.createElement('div');
    date.className = 'note-card-date';
    const dateVal = sortBy === 'created' ? (note.createdAt || note.updatedAt) : note.updatedAt;
    const datePrefix = sortBy === 'created' ? 'Created' : 'Updated';
    date.textContent = datePrefix + ' ' + formatDate(dateVal);

    const actions = document.createElement('div');
    actions.className = 'note-card-actions';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-small';
    exportBtn.title = 'Export note';
    exportBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const md = noteToMarkdown(url, note);
      downloadFile(slugify(note.title || url) + '.md', md);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const noteBackup = { ...note };
      await deleteNoteForUrl(url);
      showUndoToast(url, noteBackup);
    });

    actions.appendChild(exportBtn);
    actions.appendChild(deleteBtn);
    overlay.appendChild(date);
    overlay.appendChild(actions);

    card.appendChild(body);
    card.appendChild(overlay);
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openEditor(url, note));
    notesList.appendChild(card);
  });
}

function openEditor(url, note) {
  currentUrl = url;
  noteUrl.textContent = url;
  noteTitleInput.value = note.title || '';
  noteContentInput.value = note.content || '';
  listView.classList.add('hidden');
  editorView.classList.remove('hidden');
  noteContentInput.focus();
}

async function showList() {
  currentUrl = null;
  editorView.classList.add('hidden');
  listView.classList.remove('hidden');
  await renderList();
}

function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSave, 800);
}

async function doSave() {
  if (!currentUrl) return;
  await saveNoteForUrl(currentUrl, {
    title: noteTitleInput.value,
    content: noteContentInput.value,
  });
}

async function flushSave() {
  clearTimeout(saveTimer);
  await doSave();
}

function formatDate(ts) {
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

// --- Export helpers ---

function noteToMarkdown(url, note) {
  const title = note.title || 'Untitled';
  const content = note.content || '';
  return `# ${title}\n\n> ${url}\n\n${content}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'note';
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const UNDO_DURATION = 5000;

function showUndoToast(url, note) {
  // Cancel any previous undo
  clearUndoToast();

  undoData = { url, note };

  // Show toast
  undoToast.classList.remove('hidden');
  // Force reflow before adding visible class
  undoToast.offsetHeight;
  undoToast.classList.add('visible');

  // Animate timer bar
  undoTimerBar.style.transition = 'none';
  undoTimerBar.style.width = '100%';
  undoTimerBar.offsetHeight;
  undoTimerBar.style.transition = `width ${UNDO_DURATION}ms linear`;
  undoTimerBar.style.width = '0%';

  undoTimeout = setTimeout(() => {
    hideUndoToast();
  }, UNDO_DURATION);
}

function hideUndoToast() {
  clearTimeout(undoTimeout);
  undoTimeout = null;
  undoData = null;
  undoToast.classList.remove('visible');
  setTimeout(() => undoToast.classList.add('hidden'), 200);
}

function clearUndoToast() {
  if (undoTimeout) {
    clearTimeout(undoTimeout);
    undoTimeout = null;
  }
  undoData = null;
}

undoBtn.addEventListener('click', async () => {
  if (!undoData) return;
  const { url, note } = undoData;
  await saveNoteForUrl(url, { title: note.title, content: note.content });
  hideUndoToast();
});

init();
