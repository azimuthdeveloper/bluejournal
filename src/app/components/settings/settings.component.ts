import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  // Knowledge levels
  knowledgeLevels = [
    { id: 'little', label: 'I know a little', enabled: true },
    { id: 'bit', label: 'I know a bit', enabled: false },
    { id: 'bit-more', label: 'I know a bit more', enabled: false },
    { id: 'lot', label: 'I know a lot', enabled: false }
  ];

  constructor(private router: Router, private appComponent: AppComponent) {}

  // Method to handle knowledge level selection
  selectKnowledgeLevel(levelId: string): void {
    if (levelId === 'little') {
      // Enable map tab in app component
      this.appComponent.enableMapTab();

      // Navigate to notes page
      this.router.navigate(['/notes']);
    }
  }
}
