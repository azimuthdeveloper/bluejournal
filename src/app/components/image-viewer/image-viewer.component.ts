import { Component, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface DialogData {
  imageUrl: string;
}

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
],
  templateUrl: './image-viewer.component.html',
  styleUrls: ['./image-viewer.component.css']
})
export class ImageViewerComponent implements AfterViewInit {
  dialogRef = inject<MatDialogRef<ImageViewerComponent>>(MatDialogRef);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  @ViewChild('imageContainer') imageContainer!: ElementRef;
  @ViewChild('image') image!: ElementRef<HTMLImageElement>;

  scale = 1;
  translateX = 0;
  translateY = 0;
  startX = 0;
  startY = 0;
  isDragging = false;
  lastTouchDistance = 0;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngAfterViewInit(): void {
    // Add event listeners for pinch-to-zoom and pan
    const container = this.imageContainer.nativeElement;

    // Touch events for mobile
    container.addEventListener('touchstart', this.onTouchStart.bind(this));
    container.addEventListener('touchmove', this.onTouchMove.bind(this));
    container.addEventListener('touchend', this.onTouchEnd.bind(this));

    // Mouse events for desktop
    container.addEventListener('mousedown', this.onMouseDown.bind(this));
    container.addEventListener('mousemove', this.onMouseMove.bind(this));
    container.addEventListener('mouseup', this.onMouseUp.bind(this));
    container.addEventListener('mouseleave', this.onMouseUp.bind(this));

    // Wheel event for zoom with mouse wheel
    container.addEventListener('wheel', this.onWheel.bind(this));
  }

  onClose(): void {
    this.dialogRef.close();
  }

  resetZoom(): void {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  // Mouse event handlers
  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.startX = event.clientX - this.translateX;
    this.startY = event.clientY - this.translateY;
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.translateX = event.clientX - this.startX;
    this.translateY = event.clientY - this.startY;
    this.updateTransform();
    event.preventDefault();
  }

  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    event.preventDefault();
  }

  // Touch event handlers
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      // Single touch for panning
      this.isDragging = true;
      this.startX = event.touches[0].clientX - this.translateX;
      this.startY = event.touches[0].clientY - this.translateY;
    } else if (event.touches.length === 2) {
      // Two touches for pinch-to-zoom
      this.lastTouchDistance = this.getTouchDistance(event);
    }
    event.preventDefault();
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isDragging) {
      // Single touch for panning
      this.translateX = event.touches[0].clientX - this.startX;
      this.translateY = event.touches[0].clientY - this.startY;
      this.updateTransform();
    } else if (event.touches.length === 2) {
      // Two touches for pinch-to-zoom
      const currentDistance = this.getTouchDistance(event);
      const delta = currentDistance - this.lastTouchDistance;

      // Adjust zoom based on pinch distance
      if (Math.abs(delta) > 5) {
        const zoomFactor = delta > 0 ? 1.05 : 0.95;
        this.scale *= zoomFactor;
        this.scale = Math.max(0.5, Math.min(this.scale, 5)); // Limit scale between 0.5 and 5
        this.lastTouchDistance = currentDistance;
        this.updateTransform();
      }
    }
    event.preventDefault();
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isDragging = false;
    }
    event.preventDefault();
  }

  // Mouse wheel event handler for zoom
  onWheel(event: WheelEvent): void {
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.scale *= zoomFactor;
    this.scale = Math.max(0.5, Math.min(this.scale, 5)); // Limit scale between 0.5 and 5
    this.updateTransform();
    event.preventDefault();
  }

  // Helper method to calculate distance between two touch points
  private getTouchDistance(event: TouchEvent): number {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Update the transform style of the image
  private updateTransform(): void {
    if (this.image && this.image.nativeElement) {
      this.image.nativeElement.style.transform =
        `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }
  }
}
