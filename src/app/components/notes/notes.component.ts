import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { CreateNoteDialogComponent } from '../create-note-dialog/create-note-dialog.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface Note {
  id: number;
  title: string;
  content: string;
  categories?: string[]; // Optional array of categories
  category?: string;     // Keep for backward compatibility
  image?: string;        // Base64 encoded image data (for backward compatibility)
  images?: string[];     // Array of Base64 encoded image data
  createdAt: Date;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit, OnDestroy {
  notes: Note[] = [];
  searchText: string = '';
  selectedCategories: string[] = [];
  editingNote: Note | null = null;
  selectedImage: string | null = null;
  categoriesInput: string = '';

  // Debounce for auto-save
  private noteChanges = new Subject<Note>();
  private noteChangeSubscription: Subscription | null = null;

  // FAB visibility control
  isFabVisible = true;
  lastScrollTop = 0;

  // Reference to the container element for scroll detection
  @ViewChild('notesContainer') notesContainer!: ElementRef;

  // Categories array
  categories: string[] = [];

  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadNotes();
    this.loadCategories();

    // Set up debounce for auto-save
    this.noteChangeSubscription = this.noteChanges.pipe(
      debounceTime(1000), // Wait for 1 second of inactivity
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    ).subscribe(note => {
      this.autoSaveNote(note);
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.noteChangeSubscription) {
      this.noteChangeSubscription.unsubscribe();
    }
  }

  // Scroll event handler
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // Show/hide FAB based on scroll direction
    if (scrollTop > this.lastScrollTop) {
      // Scrolling down, hide the FAB
      this.isFabVisible = false;
    } else {
      // Scrolling up, show the FAB
      this.isFabVisible = true;
    }

    this.lastScrollTop = scrollTop;
  }

  // Open create note dialog
  openCreateNoteDialog(): void {
    const dialogRef = this.dialog.open(CreateNoteDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { categories: this.categories }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Add the new note to the notes array
        this.notes.unshift(result);
        this.saveNotes();
        // Refresh categories list to include only active categories
        this.loadCategories();
      }
    });
  }

  createEmptyNote(): Note {
    return {
      id: Date.now(),
      title: '',
      content: '',
      categories: [], // Initialize with empty categories array
      images: [],     // Initialize with empty images array
      createdAt: new Date()
    };
  }

  loadCategories(): void {
    // Extract all unique categories from the notes
    const activeCategories = new Set<string>();

    this.notes.forEach(note => {
      // Add categories from the categories array
      if (note.categories && note.categories.length > 0) {
        note.categories.forEach(category => {
          if (category.trim()) {
            activeCategories.add(category);
          }
        });
      }

      // Add category from the single category field (for backward compatibility)
      if (note.category && note.category.trim()) {
        activeCategories.add(note.category);
      }
    });

    // Convert Set to Array
    this.categories = Array.from(activeCategories);
  }

  // These methods are no longer needed as categories are now derived directly from notes
  // Kept as empty methods for backward compatibility in case they're called elsewhere
  saveCategories(): void {
    // No longer saving categories to localStorage as they're derived from notes
  }

  addCategory(): void {
    // No longer manually adding categories as they're derived from notes
  }

  // Process comma-separated categories input
  processCategoriesInput(input: string): string[] {
    if (!input) return [];

    // Split by comma, trim each category, filter out empty ones, and remove duplicates
    const categories = input.split(',')
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);

    return categories;
  }

  loadNotes(): void {
    const savedNotes = localStorage.getItem('bluejournal_notes');
    if (savedNotes) {
      this.notes = JSON.parse(savedNotes).map((note: any) => {
        // Handle backward compatibility with notes that have a single category
        if (note.category && !note.categories) {
          note.categories = note.category ? [note.category] : [];
        }

        // Handle backward compatibility with notes that have a single image
        if (note.image && !note.images) {
          note.images = note.image ? [note.image] : [];
        }

        return {
          ...note,
          createdAt: new Date(note.createdAt)
        };
      });
    }
  }

  saveNotes(): void {
    localStorage.setItem('bluejournal_notes', JSON.stringify(this.notes));
  }

  deleteNote(index: number): void {
    this.notes.splice(index, 1);
    this.saveNotes();
    // Refresh categories list after deleting a note
    this.loadCategories();
  }

  editNote(note: Note): void {
    // Set the editing note to a copy of the selected note
    this.editingNote = { ...note };

    // Set up property change detection for auto-save
    this.setupNoteChangeDetection();
  }

  // This method is kept for backward compatibility but is no longer used in the UI
  cancelEdit(): void {
    this.editingNote = null;
  }

  // This method is kept for backward compatibility but is now called by the debounce
  saveEdit(): void {
    if (this.editingNote) {
      const index = this.notes.findIndex(n => n.id === this.editingNote!.id);
      if (index !== -1) {
        this.notes[index] = { ...this.editingNote };
        this.saveNotes();
      }
    }
  }

  // Method to handle barrier click - save note and exit edit mode
  dismissEditMode(): void {
    if (this.editingNote) {
      // Save the current note with notification
      const noteToSave = { ...this.editingNote };

      // Exit edit mode
      this.editingNote = null;

      // Update the note and show notification
      this.updateNoteWithNotification(noteToSave);
    }
  }

  // Auto-save note when changes are detected
  private autoSaveNote(note: Note): void {
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = { ...note };
      this.saveNotes();
      // Refresh categories list after saving a note
      this.loadCategories();
    }
  }

  // Method to update the note when editing is complete
  private updateNoteWithNotification(note: Note): void {
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = { ...note };
      this.saveNotes();
      // Refresh categories list after saving a note
      this.loadCategories();

      // Show toast notification
      this.snackBar.open('Note updated', 'Close', {
        duration: 3000, // 3 seconds
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
  }

  // Method called when any note field changes
  onNoteFieldChange(): void {
    if (this.editingNote) {
      this.noteChanges.next({ ...this.editingNote } as Note);
    }
  }

  // Update categories and trigger auto-save
  updateCategories(categoriesInput: string): void {
    if (this.editingNote) {
      this.editingNote.categories = this.processCategoriesInput(categoriesInput);
      this.noteChanges.next({ ...this.editingNote } as Note);
    }
  }

  // Set up change detection for auto-save
  private setupNoteChangeDetection(): void {
    // Emit the initial state
    if (this.editingNote) {
      this.noteChanges.next({ ...this.editingNote } as Note);
    }
  }

  // Method to filter by a single category when clicked
  filterByCategory(category: string): void {
    // If category is already selected, remove it (toggle off)
    if (this.selectedCategories.includes(category)) {
      this.selectedCategories = this.selectedCategories.filter(cat => cat !== category);
    } else {
      // Otherwise, set it as the only selected category (clear others)
      this.selectedCategories = [category];
    }
  }

  // Clear all category filters
  clearCategoryFilters(): void {
    this.selectedCategories = [];
  }

  get filteredNotes(): Note[] {
    let filtered = this.notes;

    // Filter by search text
    if (this.searchText.trim()) {
      const searchTerm = this.searchText.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by categories
    if (this.selectedCategories.length > 0) {
      filtered = filtered.filter(note => {
        // If note has categories array, check if any selected category is in the note's categories
        if (note.categories && note.categories.length > 0) {
          return this.selectedCategories.some(cat => note.categories!.includes(cat));
        }
        // Backward compatibility: check if the note's single category is in selected categories
        else if (note.category) {
          return this.selectedCategories.includes(note.category);
        }
        return false;
      });
    }

    // Filter out the note that's currently being edited
    if (this.editingNote) {
      filtered = filtered.filter(note => note.id !== this.editingNote!.id);
    }

    return filtered;
  }

  // Image handling for edit mode only
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.editingNote) {
      const file = input.files[0];

      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        console.error('File is not an image');
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const imageData = reader.result as string;

        // Optimize the image
        this.optimizeImage(imageData, 1200, 200).then(optimizedImageData => {
          // Initialize images array if it doesn't exist
          if (!this.editingNote!.images) {
            this.editingNote!.images = [];
          }
          this.editingNote!.images.push(optimizedImageData);
          // Keep single image for backward compatibility
          this.editingNote!.image = optimizedImageData;
          // Trigger auto-save
          this.noteChanges.next({ ...this.editingNote } as Note);
        });
      };

      reader.readAsDataURL(file);
    }
  }

  // Optimize image to reduce file size (for edit mode)
  private optimizeImage(dataUrl: string, maxDimension: number, maxSizeKB: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          // Start with high quality
          let quality = 0.9;
          let optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Estimate size in KB (base64 string length * 0.75 / 1024)
          let sizeKB = (optimizedDataUrl.length - optimizedDataUrl.indexOf(',') - 1) * 0.75 / 1024;

          // Reduce quality until size is under maxSizeKB
          while (sizeKB > maxSizeKB && quality > 0.1) {
            quality -= 0.1;
            optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeKB = (optimizedDataUrl.length - optimizedDataUrl.indexOf(',') - 1) * 0.75 / 1024;
          }

          resolve(optimizedDataUrl);
        } else {
          // If canvas context is not available, return original
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        // If there's an error loading the image, return original
        resolve(dataUrl);
      };

      img.src = dataUrl;
    });
  }

  // Remove image in edit mode
  removeImage(index: number): void {
    if (this.editingNote && this.editingNote.images) {
      this.editingNote.images.splice(index, 1);
      // Update single image for backward compatibility
      this.editingNote.image = this.editingNote.images.length > 0 ? this.editingNote.images[0] : undefined;
      // Trigger auto-save
      this.noteChanges.next({ ...this.editingNote } as Note);
    }
  }

  // Remove all images in edit mode
  clearImages(): void {
    if (this.editingNote) {
      this.editingNote.images = [];
      this.editingNote.image = undefined;
      // Trigger auto-save
      this.noteChanges.next({ ...this.editingNote } as Note);
    }
  }
}
