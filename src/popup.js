document.addEventListener("DOMContentLoaded", () => {
  let currentNoteId = null;
  const editor = document.getElementById('editor');
  const themeToggle = document.getElementById('themeToggle');
  const noteTitle = document.getElementById('noteTitle');
  const notesList = document.getElementById('notesList');
  const colorPicker = document.getElementById('colorPicker');
  const searchInput = document.getElementById('search');
  const importFile = document.getElementById('importFile');

  // Initialize theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.dataset.theme = savedTheme;

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
  });

  // System color mode detection
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  colorSchemeQuery.addEventListener('change', (e) => {
    if (localStorage.getItem('theme') === 'system') {
      document.body.dataset.theme = e.matches ? 'dark' : 'light';
    }
  });

  // Note management
  async function getCurrentTabNotes() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { notes = [] } = await chrome.storage.sync.get({ [tab.url]: [] });
    return { tab, notes: notes.sort((a, b) => b.timestamp - a.timestamp) };
  }

  async function loadNotes() {
    const { tab, notes } = await getCurrentTabNotes();
    renderNotesList(notes);
    if (notes.length > 0 && !currentNoteId) {
      loadNoteContent(notes[0].id);
    }
  }

  function renderNotesList(notes) {
    const filteredNotes = notes.filter(note =>
      note.title.toLowerCase().includes(searchInput.value.toLowerCase()) ||
      note.content.toLowerCase().includes(searchInput.value.toLowerCase())
    );

    notesList.innerHTML = filteredNotes.map(note => `
      <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" 
           data-id="${note.id}">
        <div class="note-title">${note.title || 'Untitled Note'}</div>
        <div class="note-date">${new Date(note.timestamp).toLocaleDateString()}</div>
      </div>
    `).join('');

    notesList.querySelectorAll('.note-item').forEach(item => {
      item.addEventListener('click', () => loadNoteContent(Number(item.dataset.id)));
    });
  }

  async function loadNoteContent(noteId) {
    const { notes } = await getCurrentTabNotes();
    const note = notes.find(n => n.id === noteId);
    if (note) {
      currentNoteId = noteId;
      editor.innerHTML = note.content;
      noteTitle.value = note.title;
      updateCharacterCount();
      updateLastSavedTime(note.timestamp);
      editor.focus();
    }
    renderNotesList(notes);
  }

  // Note creation
  document.getElementById('newNote').addEventListener('click', createNewNote);

  async function createNewNote() {
    const { tab, notes } = await getCurrentTabNotes();
    const newNote = {
      id: Date.now(),
      content: '',
      title: 'New Note',
      timestamp: Date.now(),
      tags: []
    };
    
    notes.unshift(newNote);
    await chrome.storage.sync.set({ [tab.url]: notes });
    loadNotes();
    loadNoteContent(newNote.id);
  }

  // Note saving
  let saveTimeout;
  editor.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
    updateCharacterCount();
  });

  noteTitle.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
  });

  async function saveNote() {
    const { tab, notes } = await getCurrentTabNotes();
    const noteIndex = notes.findIndex(n => n.id === currentNoteId);
    if (noteIndex > -1) {
      notes[noteIndex] = {
        ...notes[noteIndex],
        title: noteTitle.value,
        content: editor.innerHTML,
        timestamp: Date.now()
      };
      await chrome.storage.sync.set({ [tab.url]: notes });
      updateLastSavedTime(notes[noteIndex].timestamp);
      renderNotesList(notes);
    }
  }

  // Export/Import
  document.getElementById('exportNotes').addEventListener('click', exportNotes);
  importFile.addEventListener('change', handleFileImport);

  async function exportNotes() {
    const { tab, notes } = await getCurrentTabNotes();
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${tab.url.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    a.click();
  }

  async function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        const { tab, notes } = await getCurrentTabNotes();
        const mergedNotes = [...importedNotes, ...notes];
        await chrome.storage.sync.set({ [tab.url]: mergedNotes });
        loadNotes();
      } catch (error) {
        alert('Error importing notes: Invalid file format');
      }
    };
    reader.readAsText(file);
  }

  // Search functionality
  searchInput.addEventListener('input', loadNotes);

  // Text formatting
  document.querySelectorAll('.format-btn').forEach(button => {
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      document.execCommand(command, false);
      editor.focus();
      updateFormattingPreview();
    });
  });

  colorPicker.addEventListener('change', (e) => {
    document.execCommand('foreColor', false, e.target.value);
    editor.focus();
    e.target.value = '';
  });

  function updateFormattingPreview() {
    document.querySelectorAll('.format-btn').forEach(button => {
      const command = button.dataset.command;
      button.classList.toggle('active', document.queryCommandState(command));
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      switch(e.key.toLowerCase()) {
        case 'b': formatText('bold'); e.preventDefault(); break;
        case 'i': formatText('italic'); e.preventDefault(); break;
        case 'u': formatText('underline'); e.preventDefault(); break;
        case 's': saveNote(); e.preventDefault(); break;
        case 'n': createNewNote(); e.preventDefault(); break;
      }
    }
  });

  // Helper functions
  function updateCharacterCount() {
    const text = editor.textContent;
    document.getElementById('charCount').textContent = `${text.length} characters`;
  }

  function updateLastSavedTime(timestamp) {
    const date = new Date(timestamp);
    document.getElementById('lastSaved').textContent = `Last saved: ${date.toLocaleString()}`;
  }

  // Initialization
  loadNotes();
  setInterval(loadNotes, 5000); // Auto-refresh every 5 seconds
  editor.addEventListener('keyup', updateFormattingPreview);
  editor.addEventListener('mouseup', updateFormattingPreview);
});