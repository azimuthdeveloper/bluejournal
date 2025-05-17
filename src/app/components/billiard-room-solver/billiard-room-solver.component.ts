import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

type OperationType = 'addition' | 'subtraction' | 'multiplication' | 'division';

interface GridCell {
  value: number;
  selected: boolean;
  operation: OperationType | null;
}

@Component({
  selector: 'app-billiard-room-solver',
  templateUrl: './billiard-room-solver.component.html',
  styleUrls: ['./billiard-room-solver.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule
  ]
})
export class BilliardRoomSolverComponent implements OnInit {
  // Grid data
  grid: GridCell[][] = [];
  operations: OperationType[] = ['addition', 'subtraction', 'multiplication', 'division'];
  operationLabels: { [key in OperationType]: string } = {
    'addition': 'Addition',
    'subtraction': 'Subtraction',
    'multiplication': 'Multiplication',
    'division': 'Division'
  };
  operationSymbols: { [key in OperationType]: string } = {
    'addition': '+',
    'subtraction': '-',
    'multiplication': '×',
    'division': '÷'
  };

  // Result tracking
  result: number = 0;
  isResultBarVisible: boolean = true;

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.initializeGrid();
  }

  initializeGrid(): void {
    // Initialize the grid with 20 rows and 4 columns (one for each operation)
    this.grid = [];
    for (let i = 1; i <= 20; i++) {
      const row: GridCell[] = [];
      for (let j = 0; j < 4; j++) {
        row.push({
          value: i,
          selected: false,
          operation: this.operations[j] as 'addition' | 'subtraction' | 'multiplication' | 'division'
        });
      }
      this.grid.push(row);
    }
    this.calculateResult();
  }

  toggleCell(cell: GridCell): void {
    cell.selected = !cell.selected;
    this.calculateResult();
  }

  calculateResult(): void {
    let result = 0;

    // Process addition first
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.selected && cell.operation === 'addition') {
          result += cell.value;
        }
      }
    }

    // Process subtraction
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.selected && cell.operation === 'subtraction') {
          result -= cell.value;
        }
      }
    }

    // Process multiplication
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.selected && cell.operation === 'multiplication') {
          result *= cell.value;
        }
      }
    }

    // Process division
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell.selected && cell.operation === 'division') {
          if (cell.value !== 0) {
            result /= cell.value;
          } else {
            this.snackBar.open('Cannot divide by zero!', 'Close', {
              duration: 3000
            });
          }
        }
      }
    }

    this.result = result;
  }

  resetGrid(): void {
    for (const row of this.grid) {
      for (const cell of row) {
        cell.selected = false;
      }
    }
    this.calculateResult();
  }

  // Handle scroll events to show/hide the result bar
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    // Always keep the result bar visible
    this.isResultBarVisible = true;
  }
}
