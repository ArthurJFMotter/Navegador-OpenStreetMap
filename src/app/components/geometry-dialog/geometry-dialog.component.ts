import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GeometryViewModel } from '../../models/geometry.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-geometry-dialog',
  standalone: false,
  templateUrl: './geometry-dialog.component.html',
  styleUrl: './geometry-dialog.component.scss',
})
export class GeometryDialogComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<GeometryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { geometry?: GeometryViewModel },
  ) { }

  ngOnInit(): void {
    this.isEditMode = !!this.data.geometry;
    this.buildForm();
  }

  buildForm(): void {
    const geometry = this.data.geometry;

    this.form = this.fb.group({
      name: [geometry?.name || ''],
      type: [geometry?.type || ''],
      coordinates: [geometry?.coordinates || []],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formData: GeometryViewModel = this.form.value;
      this.dialogRef.close(formData);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}