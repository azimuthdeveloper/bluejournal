import { Component, OnInit, OnDestroy } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppComponent } from '../../app.component';
import { ThemeService } from '../../services/theme.service';
import { MigrationService, MigrationStatus } from '../../services/migration.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatListModule,
    MatProgressSpinnerModule
],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  // Feature visibility settings
  showBilliardRoom: boolean = false;
  showMap: boolean = false;

  // Dark mode settings
  darkMode: boolean = false;

  // App installation
  canInstallApp: boolean = false;

  // Data migration
  migrationStatus: MigrationStatus = MigrationStatus.NOT_STARTED;
  migrationInProgress: boolean = false;
  migrationComplete: boolean = false;
  migrationFailed: boolean = false;
  migrationSkipped: boolean = false;
  private migrationSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private appComponent: AppComponent,
    private themeService: ThemeService,
    private migrationService: MigrationService
  ) {}

  ngOnInit(): void {
    // Initialize dark mode state
    this.darkMode = this.themeService.getCurrentTheme();

    // Subscribe to theme changes
    this.themeService.isDarkMode().subscribe(isDarkMode => {
      this.darkMode = isDarkMode;
    });

    // Check if app can be installed
    this.canInstallApp = this.appComponent.canInstallApp();

    // Load billiard room visibility from localStorage
    const showBilliardRoom = localStorage.getItem('bluejournal_show_billiard_room');
    if (showBilliardRoom !== null) {
      this.showBilliardRoom = showBilliardRoom === 'true';
    }

    // Load map visibility from localStorage
    const showMap = localStorage.getItem('bluejournal_show_map');
    if (showMap !== null) {
      this.showMap = showMap === 'true';
    }

    // Apply settings to app component
    this.updateNavigationOptions();

    // Subscribe to migration status changes
    this.migrationSubscription = this.migrationService.getMigrationStatus().subscribe(status => {
      this.migrationStatus = status;
      this.migrationInProgress = status === MigrationStatus.IN_PROGRESS;
      this.migrationComplete = status === MigrationStatus.COMPLETED;
      this.migrationFailed = status === MigrationStatus.FAILED;
      this.migrationSkipped = status === MigrationStatus.SKIPPED;
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    if (this.migrationSubscription) {
      this.migrationSubscription.unsubscribe();
    }
  }

  // Method to toggle dark mode
  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  // Method to toggle billiard room visibility
  toggleBilliardRoom(): void {
    this.showBilliardRoom = !this.showBilliardRoom;
    localStorage.setItem('bluejournal_show_billiard_room', this.showBilliardRoom.toString());
    this.updateNavigationOptions();
  }

  // Method to toggle map visibility
  toggleMap(): void {
    this.showMap = !this.showMap;
    localStorage.setItem('bluejournal_show_map', this.showMap.toString());
    this.updateNavigationOptions();
  }

  // Update navigation options in the app component
  private updateNavigationOptions(): void {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    // setTimeout(() => {
      // Update map tab visibility
      if (this.showMap) {
        this.appComponent.enableMapTab();
      } else {
        this.appComponent.disableMapTab();
      }

      // Update billiard room tab visibility
      if (this.showBilliardRoom) {
        this.appComponent.enableBilliardRoomTab();
      } else {
        this.appComponent.disableBilliardRoomTab();
      }
    // });
  }

  // Method to show the install prompt
  installApp(): void {
    this.appComponent.manuallyShowInstallPrompt();
  }

  // Method to start the data migration
  async startMigration(): Promise<void> {
    try {
      await this.migrationService.startMigration();
    } catch (error) {
      console.error('Error starting migration:', error);
    }
  }

  // Method to export notes as JSON
  async exportNotes(): Promise<void> {
    try {
      await this.migrationService.exportNotes();
    } catch (error) {
      console.error('Error exporting notes:', error);
    }
  }

  // Method to reset migration status (for testing)
  resetMigrationStatus(): void {
    this.migrationService.resetMigrationStatus();
  }
}
