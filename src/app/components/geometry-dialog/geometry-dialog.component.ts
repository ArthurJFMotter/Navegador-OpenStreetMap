// src/app/geometry-dialog/geometry-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Geometry } from '../../services/geometry.service'; //import the interface.

export interface DialogData {
    name: string;
    geometry: Partial<Geometry>;
}

@Component({
  selector: 'app-geometry-dialog',
  standalone: false,
  templateUrl: './geometry-dialog.component.html',
})
export class GeometryDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<GeometryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
