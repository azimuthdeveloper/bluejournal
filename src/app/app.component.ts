import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Blue Journal';
  isWarningPage = true; // Default to true to hide toolbar initially
  showMapTab = false; // Hide map tab by default

  private themeSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {
    // Subscribe to router events to detect when the route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Check if the current route is the warning page
      this.isWarningPage = event.url === '/warning' || event.url === '/';
    });
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode().subscribe(isDarkMode => {
      // Theme is handled by the service, no need to do anything here
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe to prevent memory leaks
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  openSettings(): void {
    // Navigate to settings page
    this.router.navigate(['/settings']);
  }

  // Method to enable map tab
  enableMapTab(): void {
    this.showMapTab = true;
  }
}
