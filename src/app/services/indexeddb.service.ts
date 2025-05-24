import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { BehaviorSubject, Observable } from 'rxjs';
import { Note } from './notes.service';

// Define the database schema
export class BlueJournalDatabase extends Dexie {
  notes!: Dexie.Table<Note, number>; // number is the type of the primary key

  constructor() {
    super('BlueJournalDatabase');

    // Define the database schema with versioning
    this.version(1).stores({
      notes: 'id, title, createdAt, *categories' // '*categories' means categories is an array that can be indexed
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private db: BlueJournalDatabase;
  private notes: Note[] = [];
  private notesSubject = new BehaviorSubject<Note[]>([]);
  private initializationComplete = false;
  private initializationPromise: Promise<void>;

  constructor() {
    console.log('IndexedDBService constructor called');
    this.db = new BlueJournalDatabase();

    // Initialize the service
    this.initializationComplete = false;
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize the service
   * This includes loading all notes from IndexedDB
   */
  private async initialize(): Promise<void> {
    try {
      // Load all notes
      await this.loadAllNotes();

      this.initializationComplete = true;
      console.log('IndexedDBService initialization complete');
    } catch (error) {
      console.error('Error during IndexedDBService initialization:', error);
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
   * Load all notes from IndexedDB
   */
  private async loadAllNotes(): Promise<void> {
    try {
      // Load all notes from IndexedDB
      const loadedNotes = await this.db.notes.toArray();

      // Sort notes by creation date (newest first)
      this.notes = loadedNotes.sort((a, b) => {
        // Ensure dates are Date objects
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      // Ensure all notes have createdAt as Date objects
      this.notes.forEach(note => {
        if (!(note.createdAt instanceof Date)) {
          note.createdAt = new Date(note.createdAt);
        }
      });

      this.notesSubject.next(this.notes);
    } catch (error) {
      console.error('Error loading notes from IndexedDB:', error);
      // Fallback to empty notes array
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
  async getNote(id: number): Promise<Note | undefined> {
    try {
      return await this.db.notes.get(id);
    } catch (error) {
      console.error('Error getting note from IndexedDB:', error);
      return undefined;
    }
  }

  /**
   * Add a new note
   */
  async addNote(note: Note): Promise<void> {
    console.log('IndexedDBService.addNote called with:', JSON.stringify(note));

    try {
      // Ensure note has an ID
      if (!note.id) {
        note.id = Date.now();
      }

      // Ensure createdAt is a Date object
      if (!(note.createdAt instanceof Date)) {
        note.createdAt = new Date(note.createdAt);
      }

      // Create a deep copy of the note to avoid modifying the original
      const noteCopy = JSON.parse(JSON.stringify(note));
      noteCopy.createdAt = new Date(noteCopy.createdAt);

      // Add note to IndexedDB
      await this.db.notes.add(noteCopy);

      // Add note to memory
      this.notes.unshift(noteCopy);
      this.notesSubject.next(this.notes);

      console.log('Note added to IndexedDB:', noteCopy.id);
    } catch (error) {
      console.error('Error adding note to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(note: Note): Promise<void> {
    console.log('IndexedDBService.updateNote called with:', JSON.stringify(note));

    try {
      // Ensure createdAt is a Date object
      if (!(note.createdAt instanceof Date)) {
        note.createdAt = new Date(note.createdAt);
      }

      // Create a deep copy of the note to avoid modifying the original
      const noteCopy = JSON.parse(JSON.stringify(note));
      noteCopy.createdAt = new Date(noteCopy.createdAt);

      // Update note in IndexedDB
      await this.db.notes.update(note.id, noteCopy);

      // Update note in memory
      const index = this.notes.findIndex(n => n.id === note.id);
      if (index !== -1) {
        this.notes[index] = noteCopy;
        this.notesSubject.next(this.notes);
      }

      console.log('Note updated in IndexedDB:', note.id);
    } catch (error) {
      console.error('Error updating note in IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(id: number): Promise<void> {
    try {
      // Delete note from IndexedDB
      await this.db.notes.delete(id);

      // Delete note from memory
      const index = this.notes.findIndex(note => note.id === id);
      if (index !== -1) {
        this.notes.splice(index, 1);
        this.notesSubject.next(this.notes);
      }

      console.log('Note deleted from IndexedDB:', id);
    } catch (error) {
      console.error('Error deleting note from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Migrate notes from localStorage to IndexedDB
   * @param notes Array of notes to migrate
   * @returns Promise that resolves when migration is complete
   */
  async migrateNotesFromLocalStorage(notes: Note[]): Promise<void> {
    try {
      console.log(`Migrating ${notes.length} notes to IndexedDB`);

      // Use transaction to ensure all notes are added or none
      await this.db.transaction('rw', this.db.notes, async () => {
        // Clear existing notes (if any)
        await this.db.notes.clear();

        // Add all notes
        for (const note of notes) {
          // Ensure createdAt is a Date object
          if (!(note.createdAt instanceof Date)) {
            note.createdAt = new Date(note.createdAt);
          }

          // Create a deep copy of the note
          const noteCopy = JSON.parse(JSON.stringify(note));
          noteCopy.createdAt = new Date(noteCopy.createdAt);

          await this.db.notes.add(noteCopy);
        }
      });

      // Reload notes to memory
      await this.loadAllNotes();

      console.log('Migration to IndexedDB complete');
    } catch (error) {
      console.error('Error migrating notes to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Export all notes as JSON
   * @returns Promise that resolves with notes as a JSON string
   */
  async exportNotesAsJson(): Promise<string> {
    try {
      // Get all notes from IndexedDB
      const notes = await this.db.notes.toArray();
      return JSON.stringify(notes, null, 2);
    } catch (error) {
      console.error('Error exporting notes from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Check if IndexedDB is available in the browser
   */
  isIndexedDBAvailable(): boolean {
    return !!window.indexedDB;
  }

  /**
   * Get the database version
   */
  getDatabaseVersion(): number {
    return this.db.verno;
  }
}
