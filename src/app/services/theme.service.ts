import { Injectable, Renderer2, RendererFactory2, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private darkMode = new BehaviorSubject<boolean>(false);
  private platformId: Object; // Declare property

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    const rendererFactory = inject(RendererFactory2);
    this.platformId = inject(PLATFORM_ID); // Initialize before initTheme is called

    this.renderer = rendererFactory.createRenderer(null, null);

    // Initialize theme based on localStorage or system preference
    this.initTheme();
  }

  private initTheme(): void {
    // Check localStorage first
    if (isPlatformBrowser(this.platformId)) {
      const storedTheme = localStorage.getItem('bluejournal_dark_mode');

      if (storedTheme !== null) {
        // Use stored preference
        const isDarkMode = storedTheme === 'true';
        this.setDarkMode(isDarkMode);
      } else {
        // Check system preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setDarkMode(prefersDarkMode);

        // Listen for changes in system preference
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
          // Only update if user hasn't set a preference
          if (localStorage.getItem('bluejournal_dark_mode') === null) {
            this.setDarkMode(e.matches);
          }
        });
      }
    }
  }

  isDarkMode(): Observable<boolean> {
    return this.darkMode.asObservable();
  }

  getCurrentTheme(): boolean {
    return this.darkMode.value;
  }

  setDarkMode(isDarkMode: boolean): void {
    // Update BehaviorSubject
    this.darkMode.next(isDarkMode);

    // Save to localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('bluejournal_dark_mode', isDarkMode.toString());

      // Apply theme to document
      if (isDarkMode) {
        this.renderer.addClass(document.body, 'dark-theme');

        // Update meta theme-color for browser UI
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', '#303030');
        }
      } else {
        this.renderer.removeClass(document.body, 'dark-theme');

        // Reset meta theme-color for browser UI
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', '#1976d2');
        }
      }
    }
  }

  toggleDarkMode(): void {
    this.setDarkMode(!this.darkMode.value);
  }
}
