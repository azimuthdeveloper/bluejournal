# Blue Journal Data Storage Documentation

## Overview

Blue Journal uses IndexedDB for persistent data storage. This document explains the structure of the database, the schema of each object store, and the migration process from the previous localStorage-based storage.

## Database Structure

### Database Name
`BlueJournalDatabase`

### Current Version
`1`

### Object Stores

#### Notes
The `notes` object store contains all user notes.

##### Schema
- `id` (number, primary key): Unique identifier for the note, typically a timestamp from `Date.now()`
- `title` (string): The title of the note
- `content` (string): The main content of the note
- `categories` (array of strings, indexed): Categories or tags associated with the note
- `category` (string, optional): Single category (kept for backward compatibility)
- `images` (array of strings, optional): Array of Base64 encoded image data
- `image` (string, optional): Single Base64 encoded image data (kept for backward compatibility)
- `createdAt` (Date): The date and time when the note was created

## Migration Process

### From localStorage to IndexedDB

The application previously stored notes in localStorage using the following keys:
- `bluejournal_note_ids`: An array of note IDs
- `bluejournal_note_[id]`: Individual note data for each ID
- `bluejournal_notes`: Legacy storage format (pre-migration)

The migration process:
1. Checks if migration is needed (not already completed or skipped)
2. Retrieves all notes from localStorage
3. Creates a transaction in IndexedDB
4. Clears any existing notes in IndexedDB (if any)
5. Adds all notes to the IndexedDB store
6. Updates the migration status to completed

### Migration Status Tracking

Migration status is tracked in localStorage using the key `bluejournal_indexeddb_migration_status` with the following possible values:
- `not_started`: Migration has not been started
- `in_progress`: Migration is currently in progress
- `completed`: Migration has been successfully completed
- `failed`: Migration failed
- `skipped`: User chose to skip the migration

## Data Access

### Reading Notes
Notes are read from IndexedDB and sorted by creation date (newest first). All notes are loaded into memory on application startup for quick access.

### Writing Notes
When a note is created or updated:
1. The note is saved to IndexedDB
2. The in-memory array is updated
3. Subscribers to the notes observable are notified of the change

### Deleting Notes
When a note is deleted:
1. The note is removed from IndexedDB
2. The note is removed from the in-memory array
3. Subscribers to the notes observable are notified of the change

## Data Export

Users can export their notes as a JSON file. The export process:
1. Retrieves all notes from the appropriate storage (IndexedDB if migration is complete, localStorage otherwise)
2. Converts the notes to a JSON string
3. Creates a downloadable file with the notes data

## Versioning

The IndexedDB database uses versioning to track schema changes. When the schema needs to be updated:
1. The database version number is incremented
2. Migration code is added to handle the schema changes
3. Existing data is migrated to the new schema

Current version: 1
