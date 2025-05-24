import { Injectable } from '@angular/core';
import {BehaviorSubject, firstValueFrom, Observable} from 'rxjs';
import { NotesService } from './notes.service';
import { IndexedDBService } from './indexeddb.service';

// Define the global gtag function if not already defined
declare global {
  interface Window {
    gtag: (
      command: string,
      action: string,
      params?: {
        [key: string]: any;
      }
    ) => void;
  }
}

export enum MigrationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

@Injectable({
  providedIn: 'root'
})
export class MigrationService {
  private readonly MIGRATION_STATUS_KEY = 'bluejournal_indexeddb_migration_status';
  private migrationStatusSubject = new BehaviorSubject<MigrationStatus>(MigrationStatus.NOT_STARTED);
  private initializationComplete = false;
  private initializationPromise: Promise<void>;

  constructor(
    private notesService: NotesService,
    private indexedDBService: IndexedDBService
  ) {
    console.log('MigrationService constructor called');

    // Initialize the service
    this.initializationComplete = false;
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize the service
   * This includes checking the current migration status
   */
  private async initialize(): Promise<void> {
    try {
      // Load migration status from localStorage
      const status = localStorage.getItem(this.MIGRATION_STATUS_KEY);
      if (status && Object.values(MigrationStatus).includes(status as MigrationStatus)) {
        this.migrationStatusSubject.next(status as MigrationStatus);
      } else {
        // Default to NOT_STARTED if no status is found
        this.migrationStatusSubject.next(MigrationStatus.NOT_STARTED);
      }

      this.initializationComplete = true;
      console.log('MigrationService initialization complete, status:', this.migrationStatusSubject.value);
    } catch (error) {
      console.error('Error during MigrationService initialization:', error);
      // Even if initialization fails, mark as complete to avoid blocking the app
      this.initializationComplete = true;
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
   * Get the current migration status
   */
  public getMigrationStatus(): Observable<MigrationStatus> {
    return this.migrationStatusSubject.asObservable();
  }

  /**
   * Check if migration is needed
   * Migration is needed if it hasn't been completed or skipped
   */
  public isMigrationNeeded(): boolean {
    const status = this.migrationStatusSubject.value;
    return status !== MigrationStatus.COMPLETED && status !== MigrationStatus.SKIPPED;
  }

  /**
   * Start the migration process
   * @returns Promise that resolves when migration is complete
   */
  public async startMigration(): Promise<boolean> {
    // Check if migration is already in progress or completed
    if (this.migrationStatusSubject.value === MigrationStatus.IN_PROGRESS) {
      console.warn('Migration is already in progress');
      return false;
    }

    if (this.migrationStatusSubject.value === MigrationStatus.COMPLETED) {
      console.warn('Migration is already completed');
      return true;
    }

    // Check if IndexedDB is available
    if (!this.indexedDBService.isIndexedDBAvailable()) {
      console.error('IndexedDB is not available, cannot migrate');
      this.updateMigrationStatus(MigrationStatus.FAILED);
      return false;
    }

    try {
      // Update status to in progress
      this.updateMigrationStatus(MigrationStatus.IN_PROGRESS);

      // Wait for both services to initialize
      await Promise.all([
        this.notesService.waitForInitialization(),
        this.indexedDBService.waitForInitialization()
      ]);

      // Get all notes from localStorage
      const notes = await this.getNotes();

      if (notes.length === 0) {
        console.log('No notes to migrate');
        this.updateMigrationStatus(MigrationStatus.COMPLETED);

        // Send analytics event for successful migration with zero notes
        this.sendMigrationCompletedEvent(0, true);

        return true;
      }

      // Migrate notes to IndexedDB
      await this.indexedDBService.migrateNotesFromLocalStorage(notes);

      // Update status to completed
      this.updateMigrationStatus(MigrationStatus.COMPLETED);

      // Send analytics event for successful migration
      this.sendMigrationCompletedEvent(notes.length, true);

      console.log('Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Error during migration:', error);
      this.updateMigrationStatus(MigrationStatus.FAILED);

      // Send analytics event for failed migration
      // Use 0 for note count if notes is undefined
      this.sendMigrationCompletedEvent(0, false);

      return false;
    }
  }

  /**
   * Skip the migration process
   * This will mark the migration as skipped so it won't be prompted again
   */
  public skipMigration(): void {
    this.updateMigrationStatus(MigrationStatus.SKIPPED);
  }

  /**
   * Reset the migration status
   * This is useful for testing or if the user wants to try again after a failure
   */
  public resetMigrationStatus(): void {
    this.updateMigrationStatus(MigrationStatus.NOT_STARTED);
  }

  /**
   * Update the migration status
   * @param status The new migration status
   */
  private updateMigrationStatus(status: MigrationStatus): void {
    localStorage.setItem(this.MIGRATION_STATUS_KEY, status);
    this.migrationStatusSubject.next(status);
  }

  /**
   * Send Google Analytics event for IndexedDB migration completed
   * @param noteCount Number of notes migrated
   * @param success Whether the migration was successful
   */
  private sendMigrationCompletedEvent(noteCount: number, success: boolean): void {
    try {
      // Send the event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'indexeddb_migration_completed', {
          'note_count': noteCount,
          'success': success,
          'database_version': this.indexedDBService.getDatabaseVersion()
        });
        console.log('Sent indexeddb_migration_completed event to Google Analytics', {
          noteCount,
          success,
          databaseVersion: this.indexedDBService.getDatabaseVersion()
        });
      } else {
        console.warn('Google Analytics not available, could not send indexeddb_migration_completed event');
      }
    } catch (error) {
      console.error('Error sending indexeddb_migration_completed event to Google Analytics:', error);
    }
  }

  /**
   * Get all notes from localStorage via the NotesService
   */
  private async getNotes(): Promise<any[]> {
    // Wait for the notes service to initialize
    await this.notesService.waitForInitialization();

    const notes = firstValueFrom(this.notesService.getNotes());
    return notes;

    // Get notes from the BehaviorSubject
    // return new Promise<any[]>((resolve) => {
    //   const subscription = this.notesService.getNotes().subscribe(notes => {
    //     subscription.unsubscribe();
    //     resolve(notes);
    //   });
    // });
  }

  /**
   * Export notes as a downloadable JSON file
   */
  public async exportNotes(): Promise<void> {
    try {
      // Wait for the appropriate service to initialize
      if (this.migrationStatusSubject.value === MigrationStatus.COMPLETED) {
        // If migration is complete, use IndexedDB
        await this.indexedDBService.waitForInitialization();
        const notesJson = await this.indexedDBService.exportNotesAsJson();
        this.downloadJson(notesJson, 'bluejournal-notes.json');
      } else {
        // Otherwise, get notes from localStorage
        await this.notesService.waitForInitialization();
        const notes = await this.getNotes();
        const notesJson = JSON.stringify(notes, null, 2);
        this.downloadJson(notesJson, 'bluejournal-notes.json');
      }
    } catch (error) {
      console.error('Error exporting notes:', error);
      throw error;
    }
  }

  /**
   * Download a JSON string as a file
   * @param jsonString The JSON string to download
   * @param filename The name of the file
   */
  private downloadJson(jsonString: string, filename: string): void {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
}
