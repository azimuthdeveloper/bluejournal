import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppComponent } from '../../app.component';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatListModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  // Feature visibility settings
  showBilliardRoom: boolean = false;
  showMap: boolean = false;

  // Dark mode settings
  darkMode: boolean = false;

  // App installation
  canInstallApp: boolean = false;

  constructor(
    private router: Router,
    private appComponent: AppComponent,
    private themeService: ThemeService
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
}
