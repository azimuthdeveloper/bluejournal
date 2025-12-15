import { Component, OnInit, inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface DialogData {
  deferredPrompt: any;
}

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule
],
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.css']
})
export class InstallPromptComponent implements OnInit {
  dialogRef = inject<MatDialogRef<InstallPromptComponent>>(MatDialogRef);
  data = inject<DialogData>(MAT_DIALOG_DATA);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnInit(): void {
    // Initialize component
  }

  onInstall(): void {
    // Show the installation prompt
    if (this.data.deferredPrompt) {
      this.data.deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      this.data.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }

        // Clear the deferred prompt variable
        this.data.deferredPrompt = null;
        this.dialogRef.close();
      });
    }
  }

  onDismiss(): void {
    this.dialogRef.close('rejected');
  }
}
