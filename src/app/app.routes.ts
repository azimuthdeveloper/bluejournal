import { Routes } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { NotesComponent } from './components/notes/notes.component';
import { WarningComponent } from './components/warning/warning.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: 'notes', pathMatch: 'full' },
  { path: 'warning', component: WarningComponent, title: 'Blue Journal - Warning' },
  { path: 'map', component: MapComponent, title: 'Blue Journal - Map' },
  { path: 'notes', component: NotesComponent, title: 'Blue Journal - Notes' },
  { path: 'settings', component: SettingsComponent, title: 'Blue Journal - Settings' },
  { path: '**', redirectTo: 'notes' }
];
