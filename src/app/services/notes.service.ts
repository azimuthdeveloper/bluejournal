import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';
import { IndexedDBService } from './indexeddb.service';
import { MigrationService, MigrationStatus } from './migration.service';

// Define the global gtag function
declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params?: Record<string, any>
    ) => void;
  }
}

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
  private indexedDBService = inject(IndexedDBService);
  private migrationService = inject(MigrationService);
  private snackBar = inject(MatSnackBar);

  private notes: Note[] = [];
  private notesSubject = new BehaviorSubject<Note[]>([]);
  private readonly NOTE_IDS_KEY = 'bluejournal_note_ids';
  private readonly NOTE_PREFIX = 'bluejournal_note_';
  private readonly OLD_NOTES_KEY = 'bluejournal_notes';
  private migrationComplete = false;
  private initializationComplete = false;
  private initializationPromise: Promise<void>;
  private isPersistentStorageGranted = false;
  private indexedDBMigrationComplete = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

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

      // Wait for migration service to initialize
      await this.migrationService.waitForInitialization();

      // Check if IndexedDB migration is complete
      const migrationStatus = await new Promise<MigrationStatus>(resolve => {
        const subscription = this.migrationService.getMigrationStatus().subscribe(status => {
          subscription.unsubscribe();
          resolve(status);
        });
      });

      this.indexedDBMigrationComplete = migrationStatus === MigrationStatus.COMPLETED;
      console.log('IndexedDB migration status:', migrationStatus, 'Complete:', this.indexedDBMigrationComplete);

      // If IndexedDB migration is complete, wait for IndexedDB service to initialize
      if (this.indexedDBMigrationComplete) {
        await this.indexedDBService.waitForInitialization();
      } else {
        // Migrate notes from old format if needed (localStorage migration)
        await this.migrateNotes();
      }

      // Load all notes (from IndexedDB if migration is complete, otherwise from localStorage)
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
      this.isPersistentStorageGranted = false;
      return;
    }

    // Check if the persistent storage API is available
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        this.isPersistentStorageGranted = isPersisted;
        console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
        this.isPersistentStorageGranted = false;
      }
    } else {
      console.warn('Persistent storage API not supported in this browser');
      this.isPersistentStorageGranted = false;
    }
  }

  /**
   * Migrate notes from old storage format to new format
   * This runs on application startup to ensure no data is lost
   */
  private async migrateNotes(): Promise<void> {
    // Check if migration has already been completed
    // debugger;
    if (this.migrationComplete) {
      return;
    }

    if (localStorage.getItem("bluejournal_migration_to_new_localstorage_complete") == "true") {
      console.log("Migration to new localstorage already completed, wont do it again.");
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

      // Send Google Analytics event for successful migration
      this.sendMigrationCompletedEvent(noteIds.length);

      this.migrationComplete = true;
      localStorage.setItem("bluejournal_migration_to_new_localstorage_complete", "true");
    } catch (error) {
      console.error('Error migrating notes:', error);
      // If migration fails, we'll try again next time
      this.migrationComplete = true; // Mark as complete anyway to avoid repeated failures
    }
  }

  /**
   * Load all notes from storage
   */
  private async loadAllNotes(): Promise<void> {
    try {
      // If IndexedDB migration is complete, load from IndexedDB
      if (this.indexedDBMigrationComplete) {
        console.log('Loading notes from IndexedDB');

        // Subscribe to notes from IndexedDB service
        const subscription = this.indexedDBService.getNotes().subscribe(notes => {
          this.notes = notes;
          this.notesSubject.next(this.notes);
          subscription.unsubscribe();
        });

        return;
      }

      // Otherwise, load from localStorage
      console.log('Loading notes from localStorage');

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
   * Send Google Analytics event for migration completed
   */
  private sendMigrationCompletedEvent(noteCount: number): void {
    try {
      // Calculate the total size of the data store
      const dataSizeKB = this.calculateDataStoreSize();

      // Send the event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'migration_completed', {
          'note_count': noteCount,
          'data_size_kb': dataSizeKB,
          'persistent_storage_granted': this.isPersistentStorageGranted
        });
        console.log('Sent migration_completed event to Google Analytics', {
          noteCount,
          dataSizeKB,
          persistentStorageGranted: this.isPersistentStorageGranted
        });
      } else {
        console.warn('Google Analytics not available, could not send migration_completed event');
      }
    } catch (error) {
      console.error('Error sending migration_completed event to Google Analytics:', error);
    }
  }

  /**
   * Calculate the total size of the data store in KB
   */
  private calculateDataStoreSize(): number {
    if (!this.isLocalStorageAvailable()) {
      return 0;
    }

    let totalSize = 0;

    // Calculate size of note IDs
    const noteIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
    if (noteIdsJson) {
      totalSize += noteIdsJson.length * 2; // Each character is 2 bytes in UTF-16
    }

    // Calculate size of individual notes
    const noteIds: number[] = noteIdsJson ? JSON.parse(noteIdsJson) : [];
    for (const id of noteIds) {
      const noteJson = localStorage.getItem(`${this.NOTE_PREFIX}${id}`);
      if (noteJson) {
        totalSize += noteJson.length * 2; // Each character is 2 bytes in UTF-16
      }
    }

    // Convert from bytes to KB
    return Math.round(totalSize / 1024);
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
  async addNote(note: Note): Promise<void> {
    console.log('addNote called with:', JSON.stringify(note));

    // Ensure note has an ID
    if (!note.id) {
      note.id = Date.now();
    }

    // Create a deep copy of the note to avoid modifying the original
    const noteCopy = JSON.parse(JSON.stringify(note));

    // Ensure createdAt is a Date object
    if (!(noteCopy.createdAt instanceof Date)) {
      noteCopy.createdAt = new Date(noteCopy.createdAt);
    }

    // If IndexedDB migration is complete, save to IndexedDB
    if (this.indexedDBMigrationComplete) {
      console.log('Saving note to IndexedDB');
      try {
        // Add note to IndexedDB
        await this.indexedDBService.addNote(noteCopy);

        // Note will be added to memory via the subscription to IndexedDB service
      } catch (error) {
        console.error('Error adding note to IndexedDB:', error);

        // Fallback to in-memory only if IndexedDB fails
        this.notes.unshift(noteCopy);
        this.notesSubject.next(this.notes);

        this.handleStorageError(error);
      }
    } else {
      // Otherwise, save to localStorage
      console.log('Saving note to localStorage');

      // Add note to memory
      this.notes.unshift(noteCopy);
      this.notesSubject.next(this.notes);

      // Save note to localStorage
      this.saveNote(noteCopy);
    }

    // Send Google Analytics event
    this.sendNoteCreatedEvent(noteCopy);

    console.log('After addNote, notes array:', JSON.stringify(this.notes));
  }

  /**
   * Send Google Analytics event for note created
   */
  private sendNoteCreatedEvent(note: Note): void {
    try {
      // Send the event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'note_created', {
          'has_image': note.images && note.images.length > 0,
          'has_categories': note.categories && note.categories.length > 0,
          'content_length': note.content.length
        });
        console.log('Sent note_created event to Google Analytics');
      } else {
        console.warn('Google Analytics not available, could not send note_created event');
      }
    } catch (error) {
      console.error('Error sending note_created event to Google Analytics:', error);
    }
  }

  /**
   * Send Google Analytics event for image attached
   */
  public sendImageAttachedEvent(imageSize: number): void {
    try {
      // Send the event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'image_attached', {
          'image_size_kb': Math.round(imageSize / 1024)
        });
        console.log('Sent image_attached event to Google Analytics');
      } else {
        console.warn('Google Analytics not available, could not send image_attached event');
      }
    } catch (error) {
      console.error('Error sending image_attached event to Google Analytics:', error);
    }
  }

  /**
   * Send Google Analytics event for letter set on map
   */
  public sendLetterSetOnMapEvent(letter: string, roomId: number): void {
    try {
      // Send the event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'letter_set_on_map', {
          'letter': letter,
          'room_id': roomId
        });
        console.log('Sent letter_set_on_map event to Google Analytics');
      } else {
        console.warn('Google Analytics not available, could not send letter_set_on_map event');
      }
    } catch (error) {
      console.error('Error sending letter_set_on_map event to Google Analytics:', error);
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(note: Note): Promise<void> {
    console.log('updateNote called with:', JSON.stringify(note));

    const index = this.notes.findIndex(n => n.id === note.id);
    console.log('Found note at index:', index);

    if (index !== -1) {
      // Create a deep copy of the note to avoid modifying the original
      const noteCopy = JSON.parse(JSON.stringify(note));

      // Ensure createdAt is a Date object
      if (!(noteCopy.createdAt instanceof Date)) {
        noteCopy.createdAt = new Date(noteCopy.createdAt);
      }

      // If IndexedDB migration is complete, update in IndexedDB
      if (this.indexedDBMigrationComplete) {
        console.log('Updating note in IndexedDB');
        try {
          // Update note in IndexedDB
          await this.indexedDBService.updateNote(noteCopy);

          // Note will be updated in memory via the subscription to IndexedDB service
        } catch (error) {
          console.error('Error updating note in IndexedDB:', error);

          // Fallback to in-memory update if IndexedDB fails
          this.notes[index] = noteCopy;
          this.notesSubject.next(this.notes);

          this.handleStorageError(error);
        }
      } else {
        // Otherwise, update in localStorage
        console.log('Updating note in localStorage');

        // Update the note in the array
        this.notes[index] = noteCopy;

        // Notify subscribers
        this.notesSubject.next(this.notes);

        // Save to localStorage
        this.saveNote(noteCopy);
      }

      console.log('After updateNote, notes array:', JSON.stringify(this.notes));
    } else {
      console.warn('Note not found for update, id:', note.id);
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(id: number): Promise<void> {
    const index = this.notes.findIndex(note => note.id === id);
    if (index !== -1) {
      // If IndexedDB migration is complete, delete from IndexedDB
      if (this.indexedDBMigrationComplete) {
        console.log('Deleting note from IndexedDB');
        try {
          // Delete note from IndexedDB
          await this.indexedDBService.deleteNote(id);

          // Note will be removed from memory via the subscription to IndexedDB service
        } catch (error) {
          console.error('Error deleting note from IndexedDB:', error);

          // Fallback to in-memory deletion if IndexedDB fails
          this.notes.splice(index, 1);
          this.notesSubject.next(this.notes);
        }
      } else {
        // Otherwise, delete from localStorage
        console.log('Deleting note from localStorage');

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
  }

  /**
   * Save a note to storage
   */
  private async saveNote(note: Note): Promise<void> {
    // If IndexedDB migration is complete, use IndexedDB instead
    if (this.indexedDBMigrationComplete) {
      console.log('Using IndexedDB for storage, saveNote should not be called directly');
      try {
        // Save to IndexedDB as a fallback
        await this.indexedDBService.updateNote(note);
      } catch (error) {
        console.error('Error saving note to IndexedDB:', error);
      }
      return;
    }

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

  /**
   * Handle storage errors and notify user
   */
  private handleStorageError(error: any): void {
    console.error('Storage error:', error);

    // Check if it's a quota exceeded error
    const isQuotaError = error && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      (error.message && error.message.includes('quota'))
    );

    if (isQuotaError) {
      this.snackBar.open('Storage full! Note saved to MEMORY ONLY. Free up space!', 'Close', {
        duration: 10000,
        panelClass: ['error-snackbar']
      });
    } else {
      this.snackBar.open('Error saving note. Saved to memory only.', 'Close', {
        duration: 5000
      });
    }
  }
}
