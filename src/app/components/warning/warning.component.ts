import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-warning',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule
],
  templateUrl: './warning.component.html',
  styleUrls: ['./warning.component.css']
})
export class WarningComponent {
  private router = inject(Router);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  continue(): void {
    // Navigate to the map page when the user clicks continue
    this.router.navigate(['/notes']);
  }
}
