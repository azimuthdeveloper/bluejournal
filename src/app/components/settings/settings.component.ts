import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
    MatSlideToggleModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  // Knowledge levels
  knowledgeLevels = [
    { id: 'little', label: 'I know a little', enabled: true },
    { id: 'bit', label: 'I know a bit', enabled: false },
    { id: 'bit-more', label: 'I know a bit more', enabled: false },
    { id: 'lot', label: 'I know a lot', enabled: false }
  ];

  // Ads settings
  showAds: boolean = true;

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
    // Load ads preference from localStorage
    const adsPreference = localStorage.getItem('bluejournal_show_ads');
    if (adsPreference !== null) {
      this.showAds = adsPreference === 'true';
      this.updateAdsVisibility();
    }

    // Initialize dark mode state
    this.darkMode = this.themeService.getCurrentTheme();

    // Subscribe to theme changes
    this.themeService.isDarkMode().subscribe(isDarkMode => {
      this.darkMode = isDarkMode;
    });

    // Check if app can be installed
    this.canInstallApp = this.appComponent.canInstallApp();
  }

  // Method to toggle dark mode
  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  // Method to handle knowledge level selection
  selectKnowledgeLevel(levelId: string): void {
    if (levelId === 'little') {
      // Enable map tab in app component
      this.appComponent.enableMapTab();

      // Navigate to notes page
      this.router.navigate(['/notes']);
    }
  }

  // Method to toggle ads visibility
  toggleAds(): void {
    this.showAds = !this.showAds;
    localStorage.setItem('bluejournal_show_ads', this.showAds.toString());
    this.updateAdsVisibility();
  }

  // Update ads visibility in the DOM
  private updateAdsVisibility(): void {
    const adsElements = document.querySelectorAll('.adsbygoogle');
    adsElements.forEach(element => {
      if (this.showAds) {
        element.classList.remove('hidden');
      } else {
        element.classList.add('hidden');
      }
    });
  }

  // Method to show the install prompt
  installApp(): void {
    this.appComponent.manuallyShowInstallPrompt();
  }
}
