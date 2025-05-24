import { Component, OnInit } from '@angular/core';

import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RoomDetailsComponent } from '../room-details/room-details.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { NotesService } from '../../services/notes.service';

interface Room {
  id: number;
  details: string;
  letter: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    MatGridListModule,
    MatDialogModule,
    FormsModule,
    MatButtonModule,
    MatCardModule
],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  rooms: Room[] = [];
  cols = 5;
  rows = 9;
  totalRooms = 45;

  // Arrays for row and column numbers
  rowNumbers: number[] = [];
  colNumbers = Array.from({ length: this.cols }, (_, i) => i + 1);

  constructor(private dialog: MatDialog, private notesService: NotesService) {}

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

    // Initialize row numbers
    this.updateRowNumbers();
  }

  // Update row numbers to start at 9 and decrement
  private updateRowNumbers(): void {
    // Numbers: 9, 8, 7, ..., 1
    this.rowNumbers = Array.from({ length: this.rows }, (_, i) => this.rows - i);
  }

  // Get rooms in the correct order for descending row numbers
  getOrderedRooms(): Room[] {
    // Remap rows from bottom to top to match descending row numbers
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

  openRoomDetails(room: Room): void {
    // Store the original letter for comparison
    const originalLetter = room.letter;

    const dialogRef = this.dialog.open(RoomDetailsComponent, {
      width: '400px',
      data: { room: { ...room } }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update room details
        const index = this.rooms.findIndex(r => r.id === result.id);
        if (index !== -1) {
          // Check if letter has changed
          if (result.letter !== originalLetter) {
            // Send Google Analytics event for letter set on map
            this.notesService.sendLetterSetOnMapEvent(result.letter, result.id);
          }

          this.rooms[index] = result;
          this.saveRooms();
        }
      }
    });
  }

  private saveRooms(): void {
    localStorage.setItem('bluejournal_rooms', JSON.stringify(this.rooms));
  }
}
