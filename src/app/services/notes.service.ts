import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Note {
  id: number;
  title: string;
  content: string;
  categories?: string[];
  category?: string;     // Keep for backward compatibility
  image?: string;        // Base64 encoded image data (for backward compatibility)
  images?: string[];     // Array of Base64 encoded image data
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private notes: Note[] = [];
  private notesSubject = new BehaviorSubject<Note[]>([]);
  private readonly NOTE_IDS_KEY = 'bluejournal_note_ids';
  private readonly NOTE_PREFIX = 'bluejournal_note_';
  private readonly OLD_NOTES_KEY = 'bluejournal_notes';
  private migrationComplete = false;
  private initializationComplete = false;
  private initializationPromise: Promise<void>;

  constructor() {
    console.log('NotesService constructor called');

    // Initialize the service
    this.initializationComplete = false;
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize the service
   * This includes migrating old notes and loading all notes
   */
  private async initialize(): Promise<void> {
    // debugger;
    try {
      // Request persistent storage
      await this.requestPersistentStorage();

      // Migrate notes from old format if needed
      await this.migrateNotes();

      // Load all notes
      this.loadAllNotes();

      this.initializationComplete = true;
      console.log('NotesService initialization complete');
    } catch (error) {
      console.error('Error during NotesService initialization:', error);
      // Even if initialization fails, mark as complete to avoid blocking the app
      this.initializationComplete = true;

      // Fallback to empty notes array
      this.notes = [];
      this.notesSubject.next(this.notes);
    }
  }


  /**
   * Returns a promise that resolves when the service initialization is complete
   */
  public waitForInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  /**
   * Checks if the service initialization is complete
   */
  public isInitialized(): boolean {
    return this.initializationComplete;
  }

  /**
   * Request persistent storage to ensure data is retained between sessions
   */
  private async requestPersistentStorage(): Promise<void> {
    // Check if localStorage is available first
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage is not available, skipping persistent storage request');
      return;
    }

    // Check if the persistent storage API is available
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
      }
    } else {
      console.warn('Persistent storage API not supported in this browser');
    }
  }

  /**
   * Migrate notes from old storage format to new format
   * This runs on application startup to ensure no data is lost
   */
  private async migrateNotes(): Promise<void> {
    // Check if migration has already been completed
    debugger;
    if (this.migrationComplete) {
      return;
    }

    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage is not available, skipping migration');
      this.migrationComplete = true;
      return;
    }

    // Check if there are notes in the old format
    const oldNotesJson = localStorage.getItem(this.OLD_NOTES_KEY);
    if (!oldNotesJson) {
      // No old notes to migrate
      this.migrationComplete = true;
      return;
    }

    try {
      // Parse old notes
      const oldNotes: any[] = JSON.parse(oldNotesJson);

      // Get existing note IDs (if any)
      const existingIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
      const noteIds: number[] = existingIdsJson ? JSON.parse(existingIdsJson) : [];

      // Migrate each note to the new format
      for (const note of oldNotes) {
        // Ensure note has proper structure
        const migratedNote: Note = {
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          categories: note.categories || (note.category ? [note.category] : []),
          category: note.category, // Keep for backward compatibility
          images: note.images || (note.image ? [note.image] : []),
          image: note.image, // Keep for backward compatibility
          createdAt: new Date(note.createdAt)
        };

        // Save note to individual storage
        localStorage.setItem(
          `${this.NOTE_PREFIX}${migratedNote.id}`,
          JSON.stringify(migratedNote)
        );

        // Add note ID to the list if not already there
        if (!noteIds.includes(migratedNote.id)) {
          noteIds.push(migratedNote.id);
        }
      }

      // Save updated note IDs
      localStorage.setItem(this.NOTE_IDS_KEY, JSON.stringify(noteIds));

      // Keep the old notes for backup, but we'll use the new format going forward
      // We could remove this line to delete the old storage, but keeping it for safety
      // localStorage.removeItem(this.OLD_NOTES_KEY);

      console.log(`Migrated ${oldNotes.length} notes to new storage format`);
      this.migrationComplete = true;
    } catch (error) {
      console.error('Error migrating notes:', error);
      // If migration fails, we'll try again next time
      this.migrationComplete = true; // Mark as complete anyway to avoid repeated failures
    }
  }

  /**
   * Load all notes from storage
   */
  private loadAllNotes(): void {
    try {
      // Check if localStorage is available
      if (!this.isLocalStorageAvailable()) {
        console.warn('localStorage is not available, using in-memory storage only');
        this.notesSubject.next(this.notes);
        return;
      }

      // Get all note IDs
      const noteIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
      if (!noteIdsJson) {
        this.notes = [];
        this.notesSubject.next(this.notes);
        return;
      }

      const noteIds: number[] = JSON.parse(noteIdsJson);
      const loadedNotes: Note[] = [];

      // Load each note by ID
      for (const id of noteIds) {
        const noteJson = localStorage.getItem(`${this.NOTE_PREFIX}${id}`);
        if (noteJson) {
          const note = JSON.parse(noteJson);
          // Ensure date is a Date object
          note.createdAt = new Date(note.createdAt);
          loadedNotes.push(note);
        }
      }

      // Sort notes by creation date (newest first)
      this.notes = loadedNotes.sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      this.notesSubject.next(this.notes);
    } catch (error) {
      console.error('Error loading notes:', error);
      // If loading fails, try to load from old format as fallback
      this.loadFromOldFormat();
    }
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = 'test';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Fallback method to load notes from old format if new format fails
   */
  private loadFromOldFormat(): void {
    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage is not available, cannot load notes from old format');
      this.notes = [];
      this.notesSubject.next(this.notes);
      return;
    }

    try {
      const oldNotesJson = localStorage.getItem(this.OLD_NOTES_KEY);
      if (oldNotesJson) {
        this.notes = JSON.parse(oldNotesJson).map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt)
        }));
        this.notesSubject.next(this.notes);
      } else {
        // No old notes found
        this.notes = [];
        this.notesSubject.next(this.notes);
      }
    } catch (error) {
      console.error('Error loading notes from old format:', error);
      this.notes = [];
      this.notesSubject.next(this.notes);
    }
  }

  /**
   * Get all notes as an observable
   */
  getNotes(): Observable<Note[]> {
    return this.notesSubject.asObservable();
  }

  /**
   * Get a single note by ID
   */
  getNote(id: number): Note | undefined {
    return this.notes.find(note => note.id === id);
  }

  /**
   * Add a new note
   */
  addNote(note: Note): void {
    console.log('addNote called with:', JSON.stringify(note));

    // Ensure note has an ID
    if (!note.id) {
      note.id = Date.now();
    }

    // Create a deep copy of the note to avoid modifying the original
    const noteCopy = JSON.parse(JSON.stringify(note));

    // Add note to memory
    this.notes.unshift(noteCopy);
    this.notesSubject.next(this.notes);

    // Save note to storage
    this.saveNote(noteCopy);

    console.log('After addNote, notes array:', JSON.stringify(this.notes));
  }

  /**
   * Update an existing note
   */
  updateNote(note: Note): void {
    console.log('updateNote called with:', JSON.stringify(note));

    const index = this.notes.findIndex(n => n.id === note.id);
    console.log('Found note at index:', index);

    if (index !== -1) {
      // Create a deep copy of the note to avoid modifying the original
      const noteCopy = JSON.parse(JSON.stringify(note));

      // Update the note in the array
      this.notes[index] = noteCopy;

      // Notify subscribers
      this.notesSubject.next(this.notes);

      // Save to storage
      this.saveNote(noteCopy);

      console.log('After updateNote, notes array:', JSON.stringify(this.notes));
    } else {
      console.warn('Note not found for update, id:', note.id);
    }
  }

  /**
   * Delete a note
   */
  deleteNote(id: number): void {
    const index = this.notes.findIndex(note => note.id === id);
    if (index !== -1) {
      // Remove from in-memory array
      this.notes.splice(index, 1);
      this.notesSubject.next(this.notes);

      // Check if localStorage is available before trying to remove from storage
      if (this.isLocalStorageAvailable()) {
        try {
          // Remove from storage
          localStorage.removeItem(`${this.NOTE_PREFIX}${id}`);

          // Update note IDs list
          const noteIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
          if (noteIdsJson) {
            const noteIds: number[] = JSON.parse(noteIdsJson);
            const updatedIds = noteIds.filter(noteId => noteId !== id);
            localStorage.setItem(this.NOTE_IDS_KEY, JSON.stringify(updatedIds));
          }
        } catch (error) {
          console.error('Error deleting note from localStorage:', error);
          // Continue with in-memory deletion only
        }
      } else {
        console.warn('localStorage is not available, note will only be removed from memory');
      }
    }
  }

  /**
   * Save a note to storage
   */
  private saveNote(note: Note): void {
    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      console.warn('localStorage is not available, note will only be stored in memory');
      return;
    }

    try {
      // Save note to individual storage
      localStorage.setItem(`${this.NOTE_PREFIX}${note.id}`, JSON.stringify(note));

      // Update note IDs list
      const noteIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
      const noteIds: number[] = noteIdsJson ? JSON.parse(noteIdsJson) : [];

      if (!noteIds.includes(note.id)) {
        noteIds.push(note.id);
        localStorage.setItem(this.NOTE_IDS_KEY, JSON.stringify(noteIds));
      }
    } catch (error) {
      console.error('Error saving note to localStorage:', error);
      // Continue with in-memory storage only
    }
  }
}
