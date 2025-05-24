import { Component, Inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

interface RoomData {
  room: {
    id: number;
    details: string;
    letter: string;
  };
}

@Component({
  selector: 'app-room-details',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
],
  templateUrl: './room-details.component.html',
  styleUrls: ['./room-details.component.css']
})
export class RoomDetailsComponent {
  constructor(
    public dialogRef: MatDialogRef<RoomDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoomData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // Ensure letter is uppercase before saving
    if (this.data.room.letter) {
      this.data.room.letter = this.data.room.letter.toUpperCase();
    }
    this.dialogRef.close(this.data.room);
  }

  onLetterInput(): void {
    // Convert letter to uppercase as user types
    if (this.data.room.letter) {
      this.data.room.letter = this.data.room.letter.toUpperCase();
    }
  }
}
