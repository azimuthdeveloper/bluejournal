import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MigrationService, MigrationStatus } from '../../services/migration.service';

interface DialogData {
  noteCount: number;
}

@Component({
  selector: 'app-migration-prompt',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './migration-prompt.component.html',
  styleUrls: ['./migration-prompt.component.css']
})
export class MigrationPromptComponent {
  migrationStatus: MigrationStatus = MigrationStatus.NOT_STARTED;
  migrationInProgress = false;
  migrationComplete = false;
  migrationFailed = false;

  constructor(
    public dialogRef: MatDialogRef<MigrationPromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private migrationService: MigrationService
  ) {
    // Subscribe to migration status changes
    this.migrationService.getMigrationStatus().subscribe(status => {
      this.migrationStatus = status;
      this.migrationInProgress = status === MigrationStatus.IN_PROGRESS;
      this.migrationComplete = status === MigrationStatus.COMPLETED;
      this.migrationFailed = status === MigrationStatus.FAILED;
    });
  }

  /**
   * Start the migration process
   */
  async onMigrateNow(): Promise<void> {
    try {
      const success = await this.migrationService.startMigration();
      if (success) {
        // Close the dialog after a short delay to show the success state
        setTimeout(() => {
          this.dialogRef.close('migrated');
        }, 1500);
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }

  /**
   * Skip the migration for now
   */
  onMigrateLater(): void {
    this.dialogRef.close('later');
  }

  /**
   * Export notes as JSON
   */
  async onExportNotes(): Promise<void> {
    try {
      await this.migrationService.exportNotes();
    } catch (error) {
      console.error('Error exporting notes:', error);
    }
  }
}
