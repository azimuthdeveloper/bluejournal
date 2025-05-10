import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RoomDetailsComponent } from '../room-details/room-details.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

interface Room {
  id: number;
  details: string;
  letter: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatDialogModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule
  ],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  rooms: Room[] = [];
  cols = 5;
  rows = 9;
  totalRooms = 45;
  flipRows = false;

  // Arrays for row and column numbers
  rowNumbers: number[] = [];
  colNumbers = Array.from({ length: this.cols }, (_, i) => i + 1);

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    // Load rooms from localStorage or initialize if not exists
    const savedRooms = localStorage.getItem('bluejournal_rooms');
    if (savedRooms) {
      this.rooms = JSON.parse(savedRooms);
    } else {
      // Initialize empty rooms
      for (let i = 0; i < this.totalRooms; i++) {
        this.rooms.push({
          id: i,
          details: '',
          letter: ''
        });
      }
      this.saveRooms();
    }

    // Load row flip preference from localStorage
    const flipRows = localStorage.getItem('bluejournal_flip_rows');
    if (flipRows !== null) {
      this.flipRows = flipRows === 'true';
    }

    // Initialize row numbers based on flip state
    this.updateRowNumbers();
  }

  // Update row numbers based on flip state
  private updateRowNumbers(): void {
    if (this.flipRows) {
      // Flipped: 9, 8, 7, ..., 1
      this.rowNumbers = Array.from({ length: this.rows }, (_, i) => this.rows - i);
    } else {
      // Normal: 1, 2, 3, ..., 9
      this.rowNumbers = Array.from({ length: this.rows }, (_, i) => i + 1);
    }
  }

  // Get rooms in the correct order based on flip state
  getOrderedRooms(): Room[] {
    if (!this.flipRows) {
      // Normal order
      return this.rooms;
    } else {
      // Flipped order - remap rows from bottom to top
      const orderedRooms: Room[] = [];

      // For each row (from bottom to top)
      for (let row = this.rows - 1; row >= 0; row--) {
        // For each column (left to right)
        for (let col = 0; col < this.cols; col++) {
          // Calculate the original index
          const originalIndex = row * this.cols + col;

          // Add the room to the ordered list
          orderedRooms.push(this.rooms[originalIndex]);
        }
      }

      return orderedRooms;
    }
  }

  openRoomDetails(room: Room): void {
    const dialogRef = this.dialog.open(RoomDetailsComponent, {
      width: '400px',
      data: { room: { ...room } }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update room details
        const index = this.rooms.findIndex(r => r.id === result.id);
        if (index !== -1) {
          this.rooms[index] = result;
          this.saveRooms();
        }
      }
    });
  }

  private saveRooms(): void {
    localStorage.setItem('bluejournal_rooms', JSON.stringify(this.rooms));
  }

  // Method to toggle row flip
  toggleRowFlip(): void {
    this.flipRows = !this.flipRows;

    // Save to localStorage
    localStorage.setItem('bluejournal_flip_rows', this.flipRows.toString());

    // Update row numbers based on new flip state
    this.updateRowNumbers();
  }
}
