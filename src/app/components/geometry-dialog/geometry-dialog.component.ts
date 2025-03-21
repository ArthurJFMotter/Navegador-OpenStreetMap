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
    @Inject(MAT_DIALOG_DATA) public data: { geometry?: GeometryViewModel; mode: 'create' | 'edit' },
  ) { }

  ngOnInit(): void {
    this.isEditMode = this.data.mode === 'edit';
    this.buildForm();
  }

  buildForm(): void {
    if (this.isEditMode && this.data.geometry) {
      // Edit mode: Initialize with existing geometry data
      const geometry = this.data.geometry;
      this.form = this.fb.group({
        name: [geometry.name || ''],
        type: [geometry.type, Validators.required],
        coordinates: [geometry.coordinates, Validators.required],
      });
    } else {
      // Create mode: Initialize with default values
      this.form = this.fb.group({
        name: [''],
        type: [this.data.geometry?.type || '', Validators.required],
        coordinates: [this.data.geometry?.coordinates || [], Validators.required],
      });
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formData: GeometryViewModel = {
        ...this.form.value,
        id: this.data.geometry?.id,
        color: this.data.geometry?.color || "black",
      };
      this.dialogRef.close(formData);
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}