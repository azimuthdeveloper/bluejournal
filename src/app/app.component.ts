import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
import { GitInfoService } from './services/git-info.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InstallPromptComponent } from './components/install-prompt/install-prompt.component';

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
    MatListModule,
    MatDialogModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Blue Journal';
  isWarningPage = true; // Default to true to hide toolbar initially
  showMapTab = false; // Hide map tab by default
  commitHash: string = '';

  // Property to store the deferred prompt event
  private deferredPrompt: any = null;
  private promptShown = false;
  private promptRejected = false;

  private themeSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private gitInfoService: GitInfoService,
    private dialog: MatDialog
  ) {
    // Subscribe to router events to detect when the route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Check if the current route is the warning page
      this.isWarningPage = event.url === '/warning' || event.url === '/';

      // Show install prompt when navigating to a non-warning page
      // and the prompt hasn't been shown yet and hasn't been rejected
      if (!this.isWarningPage && !this.promptShown && !this.promptRejected && this.deferredPrompt) {
        this.showInstallPrompt();
      }
    });
  }

  // Listen for beforeinstallprompt event
  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event) {
    // Prevent the default browser install prompt
    e.preventDefault();

    // Store the event for later use
    this.deferredPrompt = e;

    // Don't show the prompt immediately, wait for a good moment
    console.log('App can be installed, saving prompt for later');
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode().subscribe(isDarkMode => {
      // Theme is handled by the service, no need to do anything here
    });

    // Get the commit hash
    this.commitHash = this.gitInfoService.getCommitHash();

    // Check if user has previously rejected the install prompt
    const promptRejected = localStorage.getItem('bluejournal_prompt_rejected');
    if (promptRejected === 'true') {
      this.promptRejected = true;
    }
  }

  // Show the installation prompt dialog
  showInstallPrompt(): void {
    if (!this.deferredPrompt || this.promptShown) {
      return;
    }

    // Mark as shown to prevent showing multiple times
    this.promptShown = true;

    // Open the dialog
    const dialogRef = this.dialog.open(InstallPromptComponent, {
      width: '400px',
      data: { deferredPrompt: this.deferredPrompt }
    });

    // Handle dialog close
    dialogRef.afterClosed().subscribe(result => {
      // If the user explicitly rejected the prompt, remember this decision
      if (result === 'rejected') {
        this.promptRejected = true;
        localStorage.setItem('bluejournal_prompt_rejected', 'true');
      }
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

  // Method to check if app can be installed
  canInstallApp(): boolean {
    return !!this.deferredPrompt;
  }

  // Method to manually show the install prompt
  manuallyShowInstallPrompt(): void {
    if (this.deferredPrompt) {
      this.promptRejected = false; // Reset rejection status
      localStorage.removeItem('bluejournal_prompt_rejected');
      this.showInstallPrompt();
    }
  }
}
