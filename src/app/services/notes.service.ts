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

  constructor() {
    // Run migration on service initialization
    this.migrateNotes().then(() => {
      // After migration, load all notes
      this.loadAllNotes();

      // Request persistent storage
      this.requestPersistentStorage();
    });
  }

  /**
   * Request persistent storage to ensure data is retained between sessions
   */
  private async requestPersistentStorage(): Promise<void> {
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
    if (this.migrationComplete) {
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
    }
  }

  /**
   * Load all notes from storage
   */
  private loadAllNotes(): void {
    try {
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
   * Fallback method to load notes from old format if new format fails
   */
  private loadFromOldFormat(): void {
    try {
      const oldNotesJson = localStorage.getItem(this.OLD_NOTES_KEY);
      if (oldNotesJson) {
        this.notes = JSON.parse(oldNotesJson).map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt)
        }));
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
    // Ensure note has an ID
    if (!note.id) {
      note.id = Date.now();
    }

    // Add note to memory
    this.notes.unshift(note);
    this.notesSubject.next(this.notes);

    // Save note to storage
    this.saveNote(note);
  }

  /**
   * Update an existing note
   */
  updateNote(note: Note): void {
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = { ...note };
      this.notesSubject.next(this.notes);
      this.saveNote(note);
    }
  }

  /**
   * Delete a note
   */
  deleteNote(id: number): void {
    const index = this.notes.findIndex(note => note.id === id);
    if (index !== -1) {
      this.notes.splice(index, 1);
      this.notesSubject.next(this.notes);

      // Remove from storage
      localStorage.removeItem(`${this.NOTE_PREFIX}${id}`);

      // Update note IDs list
      const noteIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
      if (noteIdsJson) {
        const noteIds: number[] = JSON.parse(noteIdsJson);
        const updatedIds = noteIds.filter(noteId => noteId !== id);
        localStorage.setItem(this.NOTE_IDS_KEY, JSON.stringify(updatedIds));
      }
    }
  }

  /**
   * Save a note to storage
   */
  private saveNote(note: Note): void {
    // Save note to individual storage
    localStorage.setItem(`${this.NOTE_PREFIX}${note.id}`, JSON.stringify(note));

    // Update note IDs list
    const noteIdsJson = localStorage.getItem(this.NOTE_IDS_KEY);
    const noteIds: number[] = noteIdsJson ? JSON.parse(noteIdsJson) : [];

    if (!noteIds.includes(note.id)) {
      noteIds.push(note.id);
      localStorage.setItem(this.NOTE_IDS_KEY, JSON.stringify(noteIds));
    }
  }
}
