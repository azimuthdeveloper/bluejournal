import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatDialog } from '@angular/material/dialog';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UpdatePromptComponent } from '../components/update-prompt/update-prompt.component';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  private swUpdate = inject(SwUpdate);
  private dialog = inject(MatDialog);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  /**
   * Check if service worker updates are supported
   */
  public get isEnabled(): boolean {
    return this.swUpdate.isEnabled;
  }

  /**
   * Check for updates
   */
  public checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker updates are not enabled');
      return;
    }

    // Check for updates
    this.swUpdate.checkForUpdate()
      .then(() => console.log('Checking for updates'))
      .catch(err => console.error('Error checking for updates', err));
  }

  /**
   * Get an observable that emits when an update is available
   */
  public getUpdates(): Observable<{ type: string, current: string, available: string }> {
    return this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      map(evt => ({
        type: evt.type,
        current: evt.currentVersion.hash,
        available: evt.latestVersion.hash
      }))
    );
  }

  /**
   * Activate the latest version of the app
   */
  public activateUpdate(): Promise<boolean> {
    return this.swUpdate.activateUpdate();
  }

  /**
   * Reload the page to apply the update
   */
  public reloadPage(): void {
    document.location.reload();
  }

  /**
   * Show the update prompt dialog
   * @param current Current version hash
   * @param available Available version hash
   * @returns Observable that emits true if the user chooses to update, false otherwise
   */
  public showUpdatePrompt(current: string, available: string): Observable<boolean> {
    const dialogRef = this.dialog.open(UpdatePromptComponent, {
      width: '400px',
      data: { current, available }
    });

    return dialogRef.afterClosed();
  }
}
