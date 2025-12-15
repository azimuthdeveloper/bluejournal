import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
  private router = inject(Router);
  private appComponent = inject(AppComponent);
  private themeService = inject(ThemeService);
  private migrationService = inject(MigrationService);
  private platformId = inject(PLATFORM_ID);

  // Feature visibility settings
  showBilliardRoom = false;
  showMap = false;

  // Dark mode settings
  darkMode = false;

  // App installation
  canInstallApp = false;

  // Data migration
  migrationStatus: MigrationStatus = MigrationStatus.NOT_STARTED;
  migrationInProgress = false;
  migrationComplete = false;
  migrationFailed = false;
  migrationSkipped = false;
  private migrationSubscription: Subscription | null = null;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

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
    if (isPlatformBrowser(this.platformId)) {
      const showBilliardRoom = localStorage.getItem('bluejournal_show_billiard_room');
      if (showBilliardRoom !== null) {
        this.showBilliardRoom = showBilliardRoom === 'true';
      }

      // Load map visibility from localStorage
      const showMap = localStorage.getItem('bluejournal_show_map');
      if (showMap !== null) {
        this.showMap = showMap === 'true';
      }
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
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('bluejournal_show_billiard_room', this.showBilliardRoom.toString());
    }
    this.updateNavigationOptions();
  }

  // Method to toggle map visibility
  toggleMap(): void {
    this.showMap = !this.showMap;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('bluejournal_show_map', this.showMap.toString());
    }
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
