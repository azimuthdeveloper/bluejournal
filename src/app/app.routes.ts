import { Routes } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { NotesComponent } from './components/notes/notes.component';
import { WarningComponent } from './components/warning/warning.component';
import { SettingsComponent } from './components/settings/settings.component';
import { BilliardRoomSolverComponent } from './components/billiard-room-solver/billiard-room-solver.component';

export const routes: Routes = [
  { path: '', redirectTo: 'warning', pathMatch: 'full' },
  { path: 'warning', component: WarningComponent, title: 'Blue Journal - Warning' },
  { path: 'map', component: MapComponent, title: 'Blue Journal - Map' },
  { path: 'notes', component: NotesComponent, title: 'Blue Journal - Notes' },
  { path: 'settings', component: SettingsComponent, title: 'Blue Journal - Settings' },
  { path: 'billiard-room-solver', component: BilliardRoomSolverComponent, title: 'Blue Journal - Billiard Room Solver' },
  { path: '**', redirectTo: 'warning' }
];
