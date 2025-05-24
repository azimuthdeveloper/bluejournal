import { Component, Inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface DialogData {
  current: string;
  available: string;
}

@Component({
  selector: 'app-update-prompt',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
],
  templateUrl: './update-prompt.component.html',
  styleUrls: ['./update-prompt.component.css']
})
export class UpdatePromptComponent {
  constructor(
    public dialogRef: MatDialogRef<UpdatePromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onUpdate(): void {
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    this.dialogRef.close(false);
  }
}
