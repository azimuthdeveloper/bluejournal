import { Component, Inject, OnInit, HostListener } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ImageViewerComponent } from '../image-viewer/image-viewer.component';
import { Note } from '../../services/notes.service';

interface DialogData {
  categories: string[];
}

@Component({
  selector: 'app-create-note-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    ImageViewerComponent
],
  templateUrl: './create-note-dialog.component.html',
  styleUrls: ['./create-note-dialog.component.css']
})
export class CreateNoteDialogComponent implements OnInit {
  newNote: Note = this.createEmptyNote();
  categoriesInput: string = '';

  constructor(
    public dialogRef: MatDialogRef<CreateNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Initialize component
  }

  // Handle clipboard paste events for images
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    // Check if clipboard has items
    if (event.clipboardData && event.clipboardData.items) {
      const items = event.clipboardData.items;

      // Look for image items
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          // Prevent the default paste behavior
          event.preventDefault();

          // Get the image as a file
          const file = items[i].getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = () => {
              const imageData = reader.result as string;

              // Show a notification
              this.snackBar.open('Image pasted from clipboard', 'Close', {
                duration: 3000
              });

              // Optimize the image
              this.optimizeImage(imageData, 1200, 200).then(optimizedImageData => {
                // Initialize images array if it doesn't exist
                if (!this.newNote.images) {
                  this.newNote.images = [];
                }
                this.newNote.images.push(optimizedImageData);
                // Keep single image for backward compatibility
                this.newNote.image = optimizedImageData;
              });
            };

            reader.readAsDataURL(file);

            // Only process the first image found
            break;
          }
        }
      }
    }
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

  // Process comma-separated categories input
  processCategoriesInput(input: string): string[] {
    if (!input) return [];

    // Split by comma, trim each category, filter out empty ones, and remove duplicates
    const categories = input.split(',')
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);

    return categories;
  }

  // Image handling methods
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
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
          if (!this.newNote.images) {
            this.newNote.images = [];
          }
          this.newNote.images.push(optimizedImageData);
          // Keep single image for backward compatibility
          this.newNote.image = optimizedImageData;
        });
      };

      reader.readAsDataURL(file);
    }
  }

  // Optimize image to reduce file size
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

  removeImage(index: number): void {
    if (this.newNote.images) {
      this.newNote.images.splice(index, 1);
      // Update single image for backward compatibility
      this.newNote.image = this.newNote.images.length > 0 ? this.newNote.images[0] : undefined;
    }
  }

  // Remove all images
  clearImages(): void {
    this.newNote.images = [];
    this.newNote.image = undefined;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.newNote.title.trim() || this.newNote.content.trim()) {
      this.dialogRef.close(this.newNote);
    } else {
      this.dialogRef.close();
    }
  }

  // Method called when contenteditable content changes
  onContentChange(event: Event): void {
    const element = event.target as HTMLElement;
    this.newNote.content = element.innerHTML;
  }

  // Apply formatting to the selected text
  applyFormat(command: string): void {
    document.execCommand(command, false);

    // Focus back on the editor to continue editing
    const editor = document.querySelector('.editor-content') as HTMLElement;
    if (editor) {
      editor.focus();

      // Update the note content with the formatted HTML
      this.newNote.content = editor.innerHTML;
    }
  }

  // Open image viewer dialog
  openImageViewer(imageUrl: string): void {
    this.dialog.open(ImageViewerComponent, {
      width: '100%',
      height: '90vh',
      maxWidth: '100vw',
      panelClass: 'image-viewer-dialog',
      data: { imageUrl }
    });
  }
}
